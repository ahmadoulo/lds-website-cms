import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../common/minio.service';
import { BadRequestException } from '@nestjs/common';
import * as sizeOf from 'image-size';

jest.mock('image-size', () => jest.fn());

describe('MediaService', () => {
  let service: MediaService;

  const mockPrismaService = {
    media: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockMinioService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MinioService,
          useValue: mockMinioService,
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upload validation', () => {
    it('should reject files larger than 5MB', async () => {
      const file = {
        size: 6 * 1024 * 1024, // 6MB
        mimetype: 'image/jpeg',
        originalname: 'large.jpg',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      await expect(service.upload(file)).rejects.toThrow(BadRequestException);
      await expect(service.upload(file)).rejects.toThrow('File is too large');
    });

    it('should reject invalid MIME types (e.g. .exe masquerading as .jpg)', async () => {
      const file = {
        size: 1024,
        mimetype: 'application/x-msdownload', // invalid mime
        originalname: 'malicious.jpg', // safe extension
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      await expect(service.upload(file)).rejects.toThrow(BadRequestException);
      await expect(service.upload(file)).rejects.toThrow('Invalid file type');
    });

    it('should reject invalid image buffers (magic number validation via image-size)', async () => {
      const file = {
        size: 1024,
        mimetype: 'image/jpeg',
        originalname: 'fake.jpg',
        buffer: Buffer.from('not an image'),
      } as Express.Multer.File;

      // Mock image-size throwing an error
      (sizeOf as unknown as jest.Mock).mockImplementation(() => {
        throw new TypeError('unsupported file type');
      });

      await expect(service.upload(file)).rejects.toThrow(BadRequestException);
      await expect(service.upload(file)).rejects.toThrow('The file is not a valid image or is corrupted');
    });

    it('should successfully upload valid images and sanitize filename', async () => {
      const file = {
        size: 1024,
        mimetype: 'image/png',
        originalname: 'valid!_name@.png',
        buffer: Buffer.from('fake-png-data'),
      } as Express.Multer.File;

      (sizeOf as unknown as jest.Mock).mockReturnValue({ width: 100, height: 100 });
      mockMinioService.uploadFile.mockResolvedValue({ url: 'http://localhost/bucket/key' });
      mockPrismaService.media.create.mockResolvedValue({ id: 'media-1' });

      const result = await service.upload(file, 'test-folder');

      expect(mockMinioService.uploadFile).toHaveBeenCalled();
      const calledKey = mockMinioService.uploadFile.mock.calls[0][1];
      expect(calledKey).toMatch(/^test-folder\/[a-f0-9-]+\.png$/); // folder/uuid.ext
      expect(result).toEqual({ id: 'media-1' });
    });
  });
});
