import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';

@Injectable()
export class PartnersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePartnerDto) {
    const order = dto.order ?? (await this.nextOrder());
    return this.prisma.partner.create({
      data: { ...this.normalize(dto), order },
      include: { logo: true },
    });
  }

  async findAll(includeUnpublished = false) {
    return this.prisma.partner.findMany({
      where: includeUnpublished ? undefined : { isPublished: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { logo: true },
    });
  }

  async findOne(id: string) {
    const partner = await this.prisma.partner.findUnique({ where: { id }, include: { logo: true } });
    if (!partner) throw new NotFoundException('Partenaire introuvable');
    return partner;
  }

  async update(id: string, dto: UpdatePartnerDto) {
    await this.findOne(id);
    return this.prisma.partner.update({
      where: { id },
      data: this.normalize(dto),
      include: { logo: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.partner.delete({ where: { id } });
    return { success: true, id };
  }

  async reorder(ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, index) => this.prisma.partner.update({ where: { id }, data: { order: index } })),
    );
    return this.findAll(true);
  }

  /** An empty link is stored as NULL rather than an empty string. */
  private normalize(dto: CreatePartnerDto | UpdatePartnerDto) {
    const data: any = { ...dto };
    if ('url' in data) data.url = data.url?.trim() || null;
    if ('logoId' in data) data.logoId = data.logoId || null;
    return data;
  }

  private async nextOrder() {
    const last = await this.prisma.partner.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
    return (last?.order ?? -1) + 1;
  }
}
