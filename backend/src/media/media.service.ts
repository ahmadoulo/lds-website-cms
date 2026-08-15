import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../common/minio.service';
import * as path from 'path';
import sizeOf from 'image-size';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private minio: MinioService
  ) {}

  async upload(file: Express.Multer.File, folder: string = 'general', altText?: any) {
    // 1. Validate File Size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File is too large. Maximum size is 5MB.`);
    }

    // 2. Validate MIME Type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    // 3. Prevent Executable Uploads & Extract Dimensions
    let width = null;
    let height = null;
    
    try {
      // If it's an SVG, image-size handles it, but just in case we can skip binary check if needed
      // Actually image-size handles SVGs perfectly.
      const dimensions = sizeOf(file.buffer);
      width = dimensions.width;
      height = dimensions.height;
    } catch (e) {
      throw new BadRequestException('The file is not a valid image or is corrupted.');
    }

    // 4. Sanitize Filename & Prevent Path Traversal
    // Discard the original name entirely for storage, use a UUID.
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const safeExt = ext || '.bin';
    const cleanFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
    const key = `${cleanFolder}/${uuidv4()}${safeExt}`;

    // 5. Upload to MinIO
    const { url } = await this.minio.uploadFile(file.buffer, key, file.mimetype, file.size);

    // 6. Save metadata to Prisma
    const media = await this.prisma.media.create({
      data: {
        originalName: file.originalname.substring(0, 255), // Truncate just in case
        storageKey: key,
        bucket: process.env.MINIO_BUCKET || 'lds-media',
        mimeType: file.mimetype,
        size: file.size,
        width,
        height,
        altText,
      }
    });

    return media;
  }

  async findAll() {
    return this.prisma.media.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');
    return media;
  }

  async remove(id: string) {
    const media = await this.findOne(id);
    
    // 1. Remove from MinIO
    await this.minio.deleteFile(media.storageKey);
    
    // 2. Remove from Prisma
    await this.prisma.media.delete({ where: { id } });
    
    return { success: true };
  }
}
