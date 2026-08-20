import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginated, type Paginated } from '../common/dto/pagination.dto';
import type { QueryAuditDto } from './dto/query-audit.dto';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGIN_FAILED' | 'LOGOUT' | 'PASSWORD_CHANGED';

export interface AuditEntry {
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  userId?: string | null;
  metadata?: Record<string, any> | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Audit writes must never break the business operation that triggered them,
   * so failures are logged and swallowed.
   */
  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId ?? null,
          userId: entry.userId ?? null,
          metadata: entry.metadata ?? undefined,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to write audit log (${entry.action} ${entry.resource}): ${error}`);
    }
  }

  async findAll(query: QueryAuditDto): Promise<Paginated<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: any = {};
    if (query.resource) where.resource = query.resource;
    if (query.action) where.action = query.action;
    if (query.userId) where.userId = query.userId;

    const [total, data] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    return paginated(data, total, page, limit);
  }

  async recentActivity(limit = 8) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }
}
