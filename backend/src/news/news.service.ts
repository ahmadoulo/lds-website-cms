import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';

@Injectable()
export class NewsService {
  constructor(private prisma: PrismaService) {}

  async create(createNewsDto: CreateNewsDto) {
    const data: any = { ...createNewsDto };
    if (data.isPublished) {
      data.publishedAt = new Date();
    }
    return this.prisma.news.create({
      data,
      include: { category: true, image: true }
    });
  }

  async findAll(isPublishedOnly: boolean) {
    const where = isPublishedOnly ? { isPublished: true } : {};
    return this.prisma.news.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { category: true, image: true }
    });
  }

  async findOne(idOrSlug: string) {
    const news = await this.prisma.news.findFirst({
      where: {
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug }
        ]
      },
      include: { category: true, image: true }
    });
    if (!news) throw new NotFoundException('News article not found');
    return news;
  }

  async update(id: string, updateNewsDto: UpdateNewsDto) {
    const data: any = { ...updateNewsDto };
    
    // Check if we are publishing it right now
    if (data.isPublished === true) {
      const existing = await this.prisma.news.findUnique({ where: { id } });
      if (existing && !existing.isPublished) {
        data.publishedAt = new Date();
      }
    }
    
    return this.prisma.news.update({
      where: { id },
      data,
      include: { category: true, image: true }
    });
  }

  async remove(id: string) {
    return this.prisma.news.delete({ where: { id } });
  }
}
