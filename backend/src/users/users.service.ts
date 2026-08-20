import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

/** Columns safe to return to a client. `passwordHash` is deliberately absent. */
const SAFE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Cette adresse email est déjà utilisée');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role as any,
        isActive: dto.isActive ?? true,
        // A newly created account always picks its own password on first login.
        mustChangePassword: true,
      },
      select: SAFE_SELECT,
    });
  }

  /** Includes deactivated accounts so an administrator can reactivate them. */
  async findAll() {
    return this.prisma.user.findMany({
      select: SAFE_SELECT,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async update(id: string, dto: UpdateUserDto, actingUserId: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Utilisateur introuvable');

    // Guard rails so an administrator cannot lock themselves - or everyone - out.
    if (id === actingUserId) {
      if (dto.isActive === false) {
        throw new BadRequestException('Vous ne pouvez pas désactiver votre propre compte');
      }
      if (dto.role && dto.role !== target.role) {
        throw new BadRequestException('Vous ne pouvez pas modifier votre propre rôle');
      }
    }

    if (dto.email && dto.email !== target.email) {
      const clash = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (clash) throw new ConflictException('Cette adresse email est déjà utilisée');
    }

    if (target.role === 'SUPER_ADMIN' && (dto.role !== undefined || dto.isActive === false)) {
      await this.assertNotLastSuperAdmin(id);
    }

    const data: any = {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      isActive: dto.isActive,
    };

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
      // A password set by an administrator must be replaced by its owner.
      data.mustChangePassword = true;
    }

    // Strip undefined so a partial update never nulls untouched columns.
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

    return this.prisma.user.update({ where: { id }, data, select: SAFE_SELECT });
  }

  /** Soft delete: the account is deactivated so its audit trail stays intact. */
  async remove(id: string, actingUserId: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Utilisateur introuvable');

    if (id === actingUserId) {
      throw new BadRequestException('Vous ne pouvez pas supprimer votre propre compte');
    }

    if (target.role === 'SUPER_ADMIN') {
      await this.assertNotLastSuperAdmin(id);
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: SAFE_SELECT,
    });
  }

  private async assertNotLastSuperAdmin(excludingId: string) {
    const others = await this.prisma.user.count({
      where: { role: 'SUPER_ADMIN', isActive: true, NOT: { id: excludingId } },
    });
    if (others === 0) {
      throw new BadRequestException(
        'Impossible : ce compte est le dernier super administrateur actif.',
      );
    }
  }
}
