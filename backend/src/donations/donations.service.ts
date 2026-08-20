import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import { sanitizeLocalized, sanitizePlainText } from '../common/sanitize';

@Injectable()
export class DonationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDonationDto) {
    const order = dto.order ?? (await this.nextOrder());
    return this.prisma.donationMethod.create({ data: { ...this.clean(dto), order } as any });
  }

  async findAll(includeUnpublished = false) {
    return this.prisma.donationMethod.findMany({
      where: includeUnpublished ? undefined : { isPublished: true },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    const method = await this.prisma.donationMethod.findUnique({ where: { id } });
    if (!method) throw new NotFoundException('Moyen de soutien introuvable');
    return method;
  }

  async update(id: string, dto: UpdateDonationDto) {
    await this.findOne(id);
    return this.prisma.donationMethod.update({ where: { id }, data: this.clean(dto) as any });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.donationMethod.delete({ where: { id } });
    return { success: true, id };
  }

  async reorder(ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, index) => this.prisma.donationMethod.update({ where: { id }, data: { order: index } })),
    );
    return this.findAll(true);
  }

  private clean(dto: CreateDonationDto | UpdateDonationDto) {
    const data: any = { ...dto };
    if (dto.title) data.title = sanitizeLocalized(dto.title, sanitizePlainText);
    if (dto.description) data.description = sanitizeLocalized(dto.description, sanitizePlainText);
    if (dto.actionLabel) data.actionLabel = sanitizeLocalized(dto.actionLabel, sanitizePlainText);
    if (dto.actionData) data.actionData = sanitizePlainText(dto.actionData);
    if (dto.beneficiary !== undefined) data.beneficiary = dto.beneficiary?.trim() || null;
    // An empty provider or link means "not a mobile money method", stored as NULL
    // rather than an empty string so the front end has one thing to check.
    if (dto.provider !== undefined) data.provider = dto.provider || null;
    if (dto.paymentLink !== undefined) data.paymentLink = dto.paymentLink?.trim() || null;
    return data;
  }

  private async nextOrder() {
    const last = await this.prisma.donationMethod.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? -1) + 1;
  }
}
