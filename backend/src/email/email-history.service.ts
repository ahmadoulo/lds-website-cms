import { Injectable } from '@nestjs/common';
import type { EmailStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginated, type Paginated } from '../common/dto/pagination.dto';

export interface HistoryQuery {
  page?: number;
  limit?: number;
  status?: EmailStatus;
  kind?: string;
  campaignId?: string;
  search?: string;
  from?: Date;
  to?: Date;
}

/**
 * What the history shows of a message: everything but its body.
 *
 * The body is a copy of a personal message - a visitor's own words, quoted
 * back to the team. It is kept on the row so a failed send can be retried
 * exactly, but the list has no reason to carry it.
 */
const LISTED = {
  id: true,
  kind: true,
  toEmail: true,
  toName: true,
  fromName: true,
  fromEmail: true,
  replyTo: true,
  subject: true,
  locale: true,
  status: true,
  attempts: true,
  nextAttemptAt: true,
  error: true,
  contactMessageId: true,
  sentAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class EmailHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: HistoryQuery): Promise<Paginated<unknown>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);

    const where: Prisma.EmailMessageWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.campaignId ? { campaignId: query.campaignId } : {}),
      ...(query.search
        ? {
            OR: [
              { toEmail: { contains: query.search, mode: 'insensitive' } },
              { subject: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.emailMessage.count({ where }),
      this.prisma.emailMessage.findMany({
        where,
        select: LISTED,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return paginated(data, total, page, limit);
  }

  /** One message, body included, for the detail view and the preview. */
  async findOne(id: string) {
    return this.prisma.emailMessage.findUnique({ where: { id } });
  }

  /** The emails a contact request produced, for the message's own screen. */
  async forContact(contactMessageId: string) {
    return this.prisma.emailMessage.findMany({
      where: { contactMessageId },
      select: LISTED,
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * The cockpit's numbers. Counted, never estimated.
   *
   * "Sent" is what the SMTP server accepted. Whether it then reached an inbox
   * is something only the receiving side knows, and no figure here claims it.
   */
  async overview(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60_000);

    const [byStatus, backlog, recentFailures, oldestPending] =
      await Promise.all([
        // Outcomes, over the period.
        this.prisma.emailMessage.groupBy({
          by: ['status'],
          where: {
            createdAt: { gte: since },
            status: { in: ['SENT', 'FAILED', 'CANCELLED'] },
          },
          _count: { _all: true },
        }),
        // The backlog, however old: a message stuck for forty days is exactly
        // the one that must not drop out of a thirty-day window.
        this.prisma.emailMessage.groupBy({
          by: ['status'],
          where: { status: { in: ['PENDING', 'SENDING'] } },
          _count: { _all: true },
        }),
        this.prisma.emailMessage.findMany({
          where: { status: 'FAILED' },
          select: LISTED,
          orderBy: { updatedAt: 'desc' },
          take: 5,
        }),
        this.prisma.emailMessage.findFirst({
          where: { status: 'PENDING' },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

    const counts: Record<EmailStatus, number> = {
      PENDING: 0,
      SENDING: 0,
      SENT: 0,
      FAILED: 0,
      CANCELLED: 0,
    };
    for (const row of [...byStatus, ...backlog])
      counts[row.status] = row._count._all;

    const attempted = counts.SENT + counts.FAILED;

    return {
      periodDays: days,
      counts,
      // Null rather than 0% when nothing has been attempted: "no failures" and
      // "nothing to fail" are different statements.
      failureRate: attempted > 0 ? counts.FAILED / attempted : null,
      oldestPendingAt: oldestPending?.createdAt ?? null,
      recentFailures,
    };
  }
}
