import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { MediaService } from './media.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../common/minio.service';
import sizeOf from 'image-size';

jest.mock('image-size', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockSizeOf = sizeOf as unknown as jest.Mock;

describe('MediaService', () => {
  let service: MediaService;

  const mockPrismaService = {
    media: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    mission: { count: jest.fn() },
    news: { count: jest.fn() },
    partner: { count: jest.fn() },
    galleryImage: { count: jest.fn() },
    $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
  };

  const mockMinioService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getFileStream: jest.fn(),
    bucketName: 'lds-media',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MinioService, useValue: mockMinioService },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    mockSizeOf.mockReturnValue({ width: 800, height: 600 });
  });

  afterEach(() => jest.clearAllMocks());

  // Validation now works off the magic number, so the fixtures carry real ones.
  const PNG_HEADER = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(24),
  ]);
  const ICO_HEADER = Buffer.concat([Buffer.from([0x00, 0x00, 0x01, 0x00]), Buffer.alloc(28)]);

  const file = (over: Partial<Express.Multer.File> = {}): Express.Multer.File =>
    ({
      buffer: PNG_HEADER,
      size: 1024,
      mimetype: 'image/png',
      originalname: 'photo de louga.png',
      ...over,
    }) as Express.Multer.File;

  it('rejects a file above the 5 MB limit', async () => {
    await expect(service.upload(file({ size: 6 * 1024 * 1024 }))).rejects.toThrow(BadRequestException);
    expect(mockMinioService.uploadFile).not.toHaveBeenCalled();
  });

  it('rejects a file whose bytes are not an image, whatever it claims to be', async () => {
    await expect(
      service.upload(file({ buffer: Buffer.from('%PDF-1.7'.padEnd(32)), mimetype: 'image/png' })),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects SVG uploads because they can carry script', async () => {
    await expect(
      service.upload(
        file({ buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>') }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts an .ico favicon and stores it without dimensions', async () => {
    mockPrismaService.media.create.mockResolvedValue({ id: 'm1' });

    await service.upload(file({ buffer: ICO_HEADER, originalname: 'favicon.ico' }), 'branding');

    expect(mockPrismaService.media.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mimeType: 'image/x-icon',
          // An .ico bundles several sizes; none is recorded.
          width: null,
          height: null,
        }),
      }),
    );
    expect(mockMinioService.uploadFile.mock.calls[0][1]).toMatch(/\.ico$/);
  });

  it('records the detected type, not the one the browser claimed', async () => {
    mockPrismaService.media.create.mockResolvedValue({ id: 'm1' });

    await service.upload(file({ mimetype: 'image/gif' }));

    expect(mockPrismaService.media.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ mimeType: 'image/png' }) }),
    );
  });

  it('rejects bytes that do not decode as an image', async () => {
    mockSizeOf.mockImplementation(() => {
      throw new Error('not an image');
    });

    await expect(service.upload(file())).rejects.toThrow(BadRequestException);
    expect(mockMinioService.uploadFile).not.toHaveBeenCalled();
  });

  it('never uses the original filename as the storage key', async () => {
    mockPrismaService.media.create.mockResolvedValue({ id: 'm1' });

    await service.upload(file({ originalname: '../../etc/passwd.png' }), 'news');

    const key = mockMinioService.uploadFile.mock.calls[0][1];
    // <sanitised folder>/<uuid><extension from the mime type>, never the input name.
    expect(key).toMatch(/^news\/[^/]+\.png$/);
    expect(key).not.toContain('..');
    expect(key).not.toContain('passwd');
  });

  it('sanitises the folder name', async () => {
    mockPrismaService.media.create.mockResolvedValue({ id: 'm1' });

    await service.upload(file(), '../secret folder!');

    const key = mockMinioService.uploadFile.mock.calls[0][1];
    expect(key.startsWith('secretfolder/')).toBe(true);
  });

  it('stores the decoded dimensions alongside the metadata', async () => {
    mockPrismaService.media.create.mockResolvedValue({ id: 'm1' });

    await service.upload(file());

    expect(mockPrismaService.media.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ width: 800, height: 600, bucket: 'lds-media' }),
      }),
    );
  });

  it('refuses to delete a file that is still in use', async () => {
    mockPrismaService.media.findUnique.mockResolvedValue({ id: 'm1', storageKey: 'k' });
    mockPrismaService.mission.count.mockResolvedValue(1);
    mockPrismaService.news.count.mockResolvedValue(0);
    mockPrismaService.partner.count.mockResolvedValue(0);
    mockPrismaService.galleryImage.count.mockResolvedValue(0);

    await expect(service.remove('m1')).rejects.toThrow(ConflictException);
    expect(mockMinioService.deleteFile).not.toHaveBeenCalled();
  });

  it('removes the object from storage before the database row', async () => {
    mockPrismaService.media.findUnique.mockResolvedValue({ id: 'm1', storageKey: 'news/x.png' });
    mockPrismaService.mission.count.mockResolvedValue(0);
    mockPrismaService.news.count.mockResolvedValue(0);
    mockPrismaService.partner.count.mockResolvedValue(0);
    mockPrismaService.galleryImage.count.mockResolvedValue(0);

    await service.remove('m1');

    expect(mockMinioService.deleteFile).toHaveBeenCalledWith('news/x.png');
    expect(mockPrismaService.media.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
  });

  it('throws when the media does not exist', async () => {
    mockPrismaService.media.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
  });
});
