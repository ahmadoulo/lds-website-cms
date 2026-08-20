import { BadRequestException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../common/minio.service';
import { paginated, type Paginated } from '../common/dto/pagination.dto';
import type { QueryMediaDto } from './dto/query-media.dto';
import * as path from 'path';
import sizeOf from 'image-size';
import { randomUUID } from 'crypto';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
  ) {}

  async upload(file: Express.Multer.File, folder = 'general', altText?: any) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Aucun fichier reçu');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Fichier trop volumineux. Taille maximale : 5 Mo.');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Type de fichier non autorisé. Formats acceptés : ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Decoding the header proves the bytes really are an image, which stops a
    // renamed script from being stored under an image content type. SVG is
    // deliberately excluded from ALLOWED_MIME_TYPES because it can carry script.
    let width: number | undefined;
    let height: number | undefined;
    try {
      const dimensions = sizeOf(file.buffer);
      width = dimensions.width;
      height = dimensions.height;
      if (!width || !height) throw new Error('missing dimensions');
    } catch {
      throw new BadRequestException("Le fichier n'est pas une image valide ou est corrompu.");
    }

    // The original filename is never used as a storage key: it is kept only as a
    // display label, while the key is a UUID under a sanitised folder.
    const cleanFolder = this.sanitizeFolder(folder);
    const ext = EXTENSION_BY_MIME[file.mimetype] ?? path.extname(file.originalname).toLowerCase();
    const key = `${cleanFolder}/${randomUUID()}${ext}`;

    await this.minio.uploadFile(file.buffer, key, file.mimetype, file.size);

    return this.prisma.media.create({
      data: {
        originalName: this.sanitizeName(file.originalname),
        storageKey: key,
        bucket: this.minio.bucketName,
        folder: cleanFolder,
        mimeType: file.mimetype,
        size: file.size,
        width,
        height,
        altText: this.parseAltText(altText),
      },
    });
  }

  async findAll(query: QueryMediaDto): Promise<Paginated<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 24;

    const where: any = {};
    if (query.folder) where.folder = this.sanitizeFolder(query.folder);
    if (query.search) {
      where.originalName = { contains: query.search, mode: 'insensitive' };
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.media.count({ where }),
      this.prisma.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return paginated(data, total, page, limit);
  }

  async listFolders() {
    const rows = await this.prisma.media.groupBy({
      by: ['folder'],
      _count: { _all: true },
      orderBy: { folder: 'asc' },
    });
    return rows.map((r) => ({ folder: r.folder, count: r._count._all }));
  }

  async findOne(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Média introuvable');
    return media;
  }

  async getStream(id: string) {
    const media = await this.findOne(id);
    const stream = await this.minio.getFileStream(media.storageKey);
    return { media, stream };
  }

  async updateAltText(id: string, altText: any) {
    await this.findOne(id);
    return this.prisma.media.update({ where: { id }, data: { altText } });
  }

  async remove(id: string) {
    const media = await this.findOne(id);

    // Refuse to orphan content that still points at this file.
    const usage = await this.countUsage(id);
    if (usage.total > 0) {
      throw new ConflictException(
        `Ce média est utilisé par ${usage.total} element(s) (${usage.details}). Détachez-le avant de le supprimer.`,
      );
    }

    await this.minio.deleteFile(media.storageKey);
    await this.prisma.media.delete({ where: { id } });

    return { success: true, id };
  }

  async countUsage(id: string) {
    const [missions, news, partners, gallery] = await this.prisma.$transaction([
      this.prisma.mission.count({ where: { imageId: id } }),
      this.prisma.news.count({ where: { imageId: id } }),
      this.prisma.partner.count({ where: { logoId: id } }),
      this.prisma.galleryImage.count({ where: { mediaId: id } }),
    ]);

    const parts: string[] = [];
    if (missions) parts.push(`${missions} mission(s)`);
    if (news) parts.push(`${news} actualité(s)`);
    if (partners) parts.push(`${partners} partenaire(s)`);
    if (gallery) parts.push(`${gallery} image(s) de galerie`);

    return {
      total: missions + news + partners + gallery,
      missions,
      news,
      partners,
      gallery,
      details: parts.join(', '),
    };
  }

  private sanitizeFolder(folder: string) {
    const clean = (folder || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
    return clean || 'general';
  }

  private sanitizeName(name: string) {
    return (name || 'fichier').replace(/[\r\n\t]/g, ' ').slice(0, 255);
  }

  private parseAltText(altText: any) {
    if (!altText) return undefined;
    if (typeof altText === 'object') return altText;
    try {
      const parsed = JSON.parse(altText);
      return typeof parsed === 'object' ? parsed : { fr: String(altText) };
    } catch {
      return { fr: String(altText) };
    }
  }
}
