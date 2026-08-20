import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNavigationDto } from './dto/create-navigation.dto';
import { UpdateNavigationDto } from './dto/update-navigation.dto';

@Injectable()
export class NavigationService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateNavigationDto) {
    if (dto.parentId) await this.assertExists(dto.parentId);
    const order = dto.order ?? (await this.nextOrder(dto.parentId));
    return this.prisma.navigationItem.create({ data: { ...dto, order } });
  }

  /** Returns the top-level items with their children, ready to render a menu. */
  async findTree() {
    return this.prisma.navigationItem.findMany({
      where: { parentId: null },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        children: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
      },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.navigationItem.findUnique({
      where: { id },
      include: { children: true },
    });
    if (!item) throw new NotFoundException('Élément de navigation introuvable');
    return item;
  }

  async update(id: string, dto: UpdateNavigationDto) {
    await this.assertExists(id);

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Un élément ne peut pas être son propre parent');
      }
      await this.assertExists(dto.parentId);
    }

    return this.prisma.navigationItem.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.assertExists(id);
    // Promote children to the root rather than orphaning them behind a FK error.
    await this.prisma.navigationItem.updateMany({ where: { parentId: id }, data: { parentId: null } });
    await this.prisma.navigationItem.delete({ where: { id } });
    return { success: true, id };
  }

  async reorder(ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, index) => this.prisma.navigationItem.update({ where: { id }, data: { order: index } })),
    );
    return this.findTree();
  }

  private async assertExists(id: string) {
    const exists = await this.prisma.navigationItem.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Élément de navigation introuvable');
  }

  private async nextOrder(parentId?: string) {
    const last = await this.prisma.navigationItem.findFirst({
      where: { parentId: parentId ?? null },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? -1) + 1;
  }
}
