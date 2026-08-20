import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { AuditService } from '../audit/audit.service';
import { toAuthenticatedUser, type AuthenticatedUser } from './auth.types';
import {
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  getJwtRefreshSecret,
  getJwtSecret,
} from './jwt.config';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private audit: AuditService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email.toLowerCase().trim() },
    });

    // Always run a bcrypt comparison so a missing account and a wrong password
    // take the same amount of time (no user enumeration through timing).
    const hash = user?.passwordHash ?? '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
    const isPasswordValid = await bcrypt.compare(loginDto.password, hash);

    if (!user || !user.isActive || !isPasswordValid) {
      await this.audit.record({
        action: 'LOGIN_FAILED',
        resource: 'User',
        resourceId: user?.id ?? null,
        userId: user?.id ?? null,
        metadata: { email: loginDto.email },
      });
      throw new UnauthorizedException('Identifiants invalides');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.record({
      action: 'LOGIN',
      resource: 'User',
      resourceId: user.id,
      userId: user.id,
    });

    return this.issueSession(toAuthenticatedUser(updated));
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, { secret: getJwtRefreshSecret() });
    } catch {
      throw new UnauthorizedException('Session expirée, veuillez vous reconnecter');
    }

    if (payload?.type !== 'refresh') {
      throw new UnauthorizedException('Jeton de rafraîchissement invalide');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Compte inactif');
    }

    return this.issueSession(toAuthenticatedUser(user));
  }

  async changePassword(userId: string, currentPassword: string | undefined, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    // On the forced first-login change the current password is the seeded one and is
    // not asked for again; on a voluntary change we always verify it.
    if (!user.mustChangePassword) {
      if (!currentPassword) {
        throw new BadRequestException('Le mot de passe actuel est requis');
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        throw new BadRequestException('Le mot de passe actuel est incorrect');
      }
    }

    const sameAsBefore = await bcrypt.compare(newPassword, user.passwordHash);
    if (sameAsBefore) {
      throw new BadRequestException("Le nouveau mot de passe doit être différent de l'ancien");
    }

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash, mustChangePassword: false },
    });

    await this.audit.record({
      action: 'PASSWORD_CHANGED',
      resource: 'User',
      resourceId: userId,
      userId,
    });

    return { success: true, user: toAuthenticatedUser(updated) };
  }

  async logout(userId: string) {
    await this.audit.record({ action: 'LOGOUT', resource: 'User', resourceId: userId, userId });
    return { success: true };
  }

  private issueSession(user: AuthenticatedUser) {
    const base = { sub: user.id, email: user.email, role: user.role };

    return {
      access_token: this.jwtService.sign(
        { ...base, type: 'access' },
        { secret: getJwtSecret(), expiresIn: ACCESS_TOKEN_TTL },
      ),
      refresh_token: this.jwtService.sign(
        { ...base, type: 'refresh' },
        { secret: getJwtRefreshSecret(), expiresIn: REFRESH_TOKEN_TTL },
      ),
      user,
    };
  }
}
