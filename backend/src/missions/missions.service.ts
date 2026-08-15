import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MissionsService {
  constructor(private prisma: PrismaService) {}

  async create(createMissionDto: CreateMissionDto) {
    return this.prisma.mission.create({
      data: {
        title: createMissionDto.title,
        description: createMissionDto.description,
        icon: createMissionDto.icon,
        order: createMissionDto.order,
        isPublished: createMissionDto.isPublished,
        imageId: createMissionDto.imageId
      },
      include: { image: true }
    });
  }

  async findAll(isPublishedOnly: boolean = false) {
    return this.prisma.mission.findMany({
      where: isPublishedOnly ? { isPublished: true } : undefined,
      orderBy: { order: 'asc' },
      include: { image: true }
    });
  }

  async findOne(id: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id },
      include: { image: true }
    });
    if (!mission) throw new NotFoundException('Mission not found');
    return mission;
  }

  async update(id: string, updateMissionDto: UpdateMissionDto) {
    try {
      return await this.prisma.mission.update({
        where: { id },
        data: updateMissionDto,
        include: { image: true }
      });
    } catch (e) {
      throw new NotFoundException('Mission not found');
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.mission.delete({ where: { id } });
    } catch (e) {
      throw new NotFoundException('Mission not found');
    }
  }
}
