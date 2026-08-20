import { BadRequestException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../common/minio.service';
import { paginated, type Paginated } from '../common/dto/pagination.dto';
import type { QueryMediaDto } from './dto/query-media.dto';
import sizeOf from 'image-size';
import { detectImageType, SUPPORTED_IMAGE_MIMES } from '../common/image-type';
import { randomUUID } from 'crypto';

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

    // The declared MIME type and the extension both come from the browser, so
    // the magic number decides. A renamed script therefore never gets stored
    // under an image content type. SVG has no signature here on purpose: it can
    // carry script and is deliberately unsupported.
    const detected = detectImageType(file.buffer);
    if (!detected) {
      throw new BadRequestException(
        `Ce fichier n'est pas une image reconnue. Formats acceptés : ${SUPPORTED_IMAGE_MIMES.join(', ')}.`,
      );
    }

    let width: number | null = null;
    let height: number | null = null;

    if (detected.supportsDimensions) {
      try {
        const dimensions = sizeOf(file.buffer);
        width = dimensions.width ?? null;
        height = dimensions.height ?? null;
        if (!width || !height) throw new Error('missing dimensions');
      } catch {
        throw new BadRequestException("Le fichier n'est pas une image valide ou est corrompu.");
      }
    }

    // The original filename is never used as a storage key: it is kept only as a
    // display label, while the key is a UUID under a sanitised folder.
    const cleanFolder = this.sanitizeFolder(folder);
    const key = `${cleanFolder}/${randomUUID()}${detected.extension}`;

    await this.minio.uploadFile(file.buffer, key, detected.mime, file.size);

    return this.prisma.media.create({
      data: {
        originalName: this.sanitizeName(file.originalname),
        storageKey: key,
        bucket: this.minio.bucketName,
        folder: cleanFolder,
        // The detected type, not the one the browser claimed.
        mimeType: detected.mime,
        size: file.size,
        width,
        height,
        altText: this.parseAltText(altText),
      },
    });
  }

  /**
   * Where each of these media is referenced, in one pass. Asking per row would
   * fire four queries per thumbnail; this keeps a page of the library to four
   * queries in total.
   */
  private async usageFor(ids: string[]) {
    if (ids.length === 0) return new Map<string, string[]>();

    const [missions, news, partners, gallery] = await this.prisma.$transaction([
      this.prisma.mission.findMany({ where: { imageId: { in: ids } }, select: { imageId: true, title: true } }),
      this.prisma.news.findMany({ where: { imageId: { in: ids } }, select: { imageId: true, title: true } }),
      this.prisma.partner.findMany({ where: { logoId: { in: ids } }, select: { logoId: true, name: true } }),
      this.prisma.galleryImage.findMany({
        where: { mediaId: { in: ids } },
        select: { mediaId: true, album: { select: { title: true } } },
      }),
    ]);

    const label = (value: any) => (typeof value === 'object' ? (value?.fr ?? value?.en) : value);
    const usage = new Map<string, string[]>();
    const add = (id: string | null, text: string) => {
      if (!id) return;
      usage.set(id, [...(usage.get(id) ?? []), text]);
    };

    missions.forEach((m) => add(m.imageId, `Nos actions · ${label(m.title) ?? 'domaine'}`));
    news.forEach((n) => add(n.imageId, `Actualités · ${label(n.title) ?? 'article'}`));
    partners.forEach((p) => add(p.logoId, `Partenaires · ${p.name}`));
    gallery.forEach((g) => add(g.mediaId, `Galerie · ${label(g.album?.title) ?? 'album'}`));

    // Settings hold ids inside a JSON blob, so they are matched separately.
    const settings = await this.prisma.siteSettings.findMany();
    const SETTING_LABELS: Record<string, Record<string, string>> = {
      branding: { logoId: 'Paramètres · Logo', logoDarkId: 'Paramètres · Logo (fond sombre)', faviconId: 'Paramètres · Favicon' },
      homepage: { heroImageId: 'Accueil · Bandeau', aboutImageId: 'Accueil · Présentation', ctaImageId: "Accueil · Appel à l'action" },
      seo: { ogImageId: 'Paramètres · Image de partage' },
    };

    for (const row of settings) {
      const labels = SETTING_LABELS[row.key];
      if (!labels) continue;
      // A draft counts as a reference: the file is about to go live.
      for (const source of [row.value, row.draftValue]) {
        const value = (source ?? {}) as Record<string, unknown>;
        for (const [field, text] of Object.entries(labels)) {
          const id = value[field];
          if (typeof id === 'string' && ids.includes(id) && !(usage.get(id) ?? []).includes(text)) {
            add(id, text);
          }
        }
      }
    }

    return usage;
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

    const usage = await this.usageFor(data.map((item) => item.id));

    return paginated(
      data.map((item) => ({ ...item, usedIn: usage.get(item.id) ?? [] })),
      total,
      page,
      limit,
    );
  }

  /** Files no content points at. Safe to delete, and worth reclaiming. */
  async findOrphans() {
    const all = await this.prisma.media.findMany({ orderBy: { createdAt: 'desc' } });
    const usage = await this.usageFor(all.map((item) => item.id));

    return all.filter((item) => (usage.get(item.id) ?? []).length === 0);
  }

  /** Deletes every unreferenced file. Never touches one still in use. */
  async purgeOrphans() {
    const orphans = await this.findOrphans();

    for (const media of orphans) {
      await this.minio.deleteFile(media.storageKey);
      await this.prisma.media.delete({ where: { id: media.id } });
    }

    return { deleted: orphans.length, freedBytes: orphans.reduce((sum, m) => sum + m.size, 0) };
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
