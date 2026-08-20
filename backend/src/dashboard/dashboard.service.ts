import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MinioService } from '../common/minio.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private minio: MinioService,
  ) {}

  /**
   * Every figure here is a live COUNT against PostgreSQL. Published and draft are
   * reported separately so the dashboard tells the truth about what visitors see.
   */
  async getStats() {
    const [
      missionsTotal,
      missionsPublished,
      newsTotal,
      newsPublished,
      galleryAlbums,
      galleryImages,
      partnersTotal,
      partnersPublished,
      impactTotal,
      donationsTotal,
      mediaCount,
      mediaSize,
      messagesTotal,
      messagesUnread,
      usersActive,
    ] = await this.prisma.$transaction([
      this.prisma.mission.count(),
      this.prisma.mission.count({ where: { isPublished: true } }),
      this.prisma.news.count(),
      this.prisma.news.count({ where: { isPublished: true } }),
      this.prisma.galleryAlbum.count(),
      this.prisma.galleryImage.count(),
      this.prisma.partner.count(),
      this.prisma.partner.count({ where: { isPublished: true } }),
      this.prisma.impactStatistic.count(),
      this.prisma.donationMethod.count(),
      this.prisma.media.count(),
      this.prisma.media.aggregate({ _sum: { size: true } }),
      this.prisma.contactMessage.count(),
      this.prisma.contactMessage.count({ where: { isRead: false } }),
      this.prisma.user.count({ where: { isActive: true } }),
    ]);

    return {
      missions: { total: missionsTotal, published: missionsPublished },
      news: { total: newsTotal, published: newsPublished },
      gallery: { albums: galleryAlbums, images: galleryImages },
      partners: { total: partnersTotal, published: partnersPublished },
      impact: { total: impactTotal },
      donations: { total: donationsTotal },
      media: { total: mediaCount, totalSize: mediaSize._sum.size ?? 0 },
      messages: { total: messagesTotal, unread: messagesUnread },
      users: { active: usersActive },
    };
  }

  /** Latest content changes plus the newest unread messages, for the overview page. */
  async getOverview() {
    const [recentNews, recentMessages, recentActivity] = await Promise.all([
      this.prisma.news.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          slug: true,
          isPublished: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.contactMessage.findMany({
        where: { isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, subject: true, createdAt: true },
      }),
      this.audit.recentActivity(8),
    ]);

    return { recentNews, recentMessages, recentActivity };
  }

  async getHealth() {
    const [database, storage] = await Promise.all([
      this.prisma
        .$queryRaw`SELECT 1`.then(() => true)
        .catch(() => false),
      this.minio.healthCheck(),
    ]);

    return { database, storage };
  }
}
