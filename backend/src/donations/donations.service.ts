import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';

@Injectable()
export class DonationsService {
  constructor(private prisma: PrismaService) {}

  create(createDonationDto: CreateDonationDto) {
    return this.prisma.donationMethod.create({ data: createDonationDto });
  }

  findAll(isPublishedOnly: boolean) {
    const where = isPublishedOnly ? { isPublished: true } : {};
    return this.prisma.donationMethod.findMany({
      where,
      orderBy: { order: 'asc' }
    });
  }

  async findOne(id: string) {
    const donation = await this.prisma.donationMethod.findUnique({ where: { id } });
    if (!donation) throw new NotFoundException('Donation method not found');
    return donation;
  }

  update(id: string, updateDonationDto: UpdateDonationDto) {
    return this.prisma.donationMethod.update({
      where: { id },
      data: updateDonationDto
    });
  }

  remove(id: string) {
    return this.prisma.donationMethod.delete({ where: { id } });
  }
}
