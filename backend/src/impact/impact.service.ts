import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateImpactDto } from './dto/create-impact.dto';
import { UpdateImpactDto } from './dto/update-impact.dto';

@Injectable()
export class ImpactService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateImpactDto) {
    const order = dto.order ?? (await this.nextOrder());
    return this.prisma.impactStatistic.create({ data: { ...dto, order } });
  }

  async findAll(includeUnpublished = false) {
    return this.prisma.impactStatistic.findMany({
      where: includeUnpublished ? undefined : { isPublished: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const stat = await this.prisma.impactStatistic.findUnique({ where: { id } });
    if (!stat) throw new NotFoundException('Statistique introuvable');
    return stat;
  }

  async update(id: string, dto: UpdateImpactDto) {
    await this.findOne(id);
    return this.prisma.impactStatistic.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.impactStatistic.delete({ where: { id } });
    return { success: true, id };
  }

  async reorder(ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, index) => this.prisma.impactStatistic.update({ where: { id }, data: { order: index } })),
    );
    return this.findAll(true);
  }

  private async nextOrder() {
    const last = await this.prisma.impactStatistic.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? -1) + 1;
  }
}
