import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('organization')
  @ApiOperation({ summary: 'Get organization settings' })
  async getSettings() {
    return this.prisma.siteSettings.findMany();
  }

  @Get('missions')
  @ApiOperation({ summary: 'Get published missions' })
  async getMissions() {
    return this.prisma.mission.findMany({
      where: { isPublished: true },
      orderBy: { order: 'asc' },
      include: { image: true },
    });
  }

  @Get('news')
  @ApiOperation({ summary: 'Get published news' })
  async getNews() {
    return this.prisma.news.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      include: { image: true, category: true },
    });
  }

  @Get('news/:slug')
  @ApiOperation({ summary: 'Get news by slug' })
  async getNewsBySlug(@Param('slug') slug: string) {
    return this.prisma.news.findFirst({
      where: { slug, isPublished: true },
      include: { image: true, category: true },
    });
  }

  @Get('gallery')
  @ApiOperation({ summary: 'Get published gallery' })
  async getGallery() {
    return this.prisma.galleryImage.findMany({
      orderBy: { createdAt: 'desc' },
      include: { media: true },
    });
  }

  @Get('impact')
  @ApiOperation({ summary: 'Get published impact stats' })
  async getImpact() {
    return this.prisma.impactStatistic.findMany({
      where: { isPublished: true },
      orderBy: { order: 'asc' },
    });
  }

  @Get('partners')
  @ApiOperation({ summary: 'Get published partners' })
  async getPartners() {
    return this.prisma.partner.findMany({
      where: { isPublished: true },
      orderBy: { order: 'asc' },
      include: { logo: true },
    });
  }
}
