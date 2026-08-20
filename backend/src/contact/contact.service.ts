import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { QueryContactDto } from './dto/query-contact.dto';
import { paginated, type Paginated } from '../common/dto/pagination.dto';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateContactDto) {
    const message = await this.prisma.contactMessage.create({ data: dto });

    // The visitor only needs a confirmation, never the stored record.
    return {
      success: true,
      id: message.id,
      message: 'Votre message a bien été transmis à notre équipe.',
    };
  }

  async findAll(query: QueryContactDto): Promise<Paginated<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: any = {};
    if (query.isRead !== undefined) where.isRead = query.isRead === 'true';
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { subject: { contains: query.search, mode: 'insensitive' } },
        { message: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.contactMessage.count({ where }),
      this.prisma.contactMessage.findMany({
        where,
        orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return paginated(data, total, page, limit);
  }

  async countUnread() {
    return this.prisma.contactMessage.count({ where: { isRead: false } });
  }

  async findOne(id: string) {
    const message = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!message) throw new NotFoundException('Message introuvable');
    return message;
  }

  async setRead(id: string, isRead: boolean) {
    await this.findOne(id);
    return this.prisma.contactMessage.update({
      where: { id },
      data: { isRead, readAt: isRead ? new Date() : null },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.contactMessage.delete({ where: { id } });
    return { success: true, id };
  }
}
