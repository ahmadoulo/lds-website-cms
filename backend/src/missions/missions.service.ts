import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { sanitizeLocalized, sanitizePlainText } from '../common/sanitize';

@Injectable()
export class MissionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMissionDto) {
    await this.assertImageExists(dto.imageId);
    const order = dto.order ?? (await this.nextOrder());

    return this.prisma.mission.create({
      data: {
        title: sanitizeLocalized(dto.title, sanitizePlainText) as any,
        description: sanitizeLocalized(dto.description, sanitizePlainText) as any,
        icon: dto.icon,
        order,
        isPublished: dto.isPublished ?? false,
        imageId: dto.imageId || null,
      },
      include: { image: true },
    });
  }

  async findAll(includeUnpublished = false) {
    return this.prisma.mission.findMany({
      where: includeUnpublished ? undefined : { isPublished: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { image: true },
    });
  }

  async findOne(id: string) {
    const mission = await this.prisma.mission.findUnique({ where: { id }, include: { image: true } });
    if (!mission) throw new NotFoundException('Mission introuvable');
    return mission;
  }

  async update(id: string, dto: UpdateMissionDto) {
    await this.findOne(id);
    await this.assertImageExists(dto.imageId);

    const data: any = {};
    if (dto.title) data.title = sanitizeLocalized(dto.title, sanitizePlainText);
    if (dto.description) data.description = sanitizeLocalized(dto.description, sanitizePlainText);
    if (dto.icon !== undefined) data.icon = dto.icon;
    if (dto.order !== undefined) data.order = dto.order;
    if (dto.isPublished !== undefined) data.isPublished = dto.isPublished;
    if (dto.imageId !== undefined) data.imageId = dto.imageId || null;

    return this.prisma.mission.update({ where: { id }, data, include: { image: true } });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.mission.delete({ where: { id } });
    return { success: true, id };
  }

  async reorder(ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, index) => this.prisma.mission.update({ where: { id }, data: { order: index } })),
    );
    return this.findAll(true);
  }

  private async assertImageExists(imageId?: string) {
    if (!imageId) return;
    const media = await this.prisma.media.findUnique({ where: { id: imageId } });
    if (!media) throw new BadRequestException('Image introuvable');
  }

  private async nextOrder() {
    const last = await this.prisma.mission.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? -1) + 1;
  }
}
