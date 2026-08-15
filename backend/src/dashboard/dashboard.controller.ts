import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getStats() {
    const [missionsCount, newsCount, galleryCount, partnersCount, unreadMessagesCount] = await Promise.all([
      this.prisma.mission.count(),
      this.prisma.news.count(),
      this.prisma.galleryImage.count(),
      this.prisma.partner.count(),
      this.prisma.contactMessage.count({ where: { isRead: false } }),
    ]);

    return {
      missions: missionsCount,
      news: newsCount,
      gallery: galleryCount,
      partners: partnersCount,
      unreadMessages: unreadMessagesCount,
    };
  }
}
