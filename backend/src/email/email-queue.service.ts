import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type EmailMessage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailSettingsService, type Purpose } from './email-settings.service';
import {
  TransportService,
  isPermanent,
  SmtpNotConfiguredError,
} from './transport.service';
import { redact } from './secret-box';
import type { RenderedEmail } from './templates.service';

export interface Enqueue {
  kind: string;
  purpose: Purpose;
  to: string;
  toName?: string | null;
  locale?: string;
  email: RenderedEmail;
  /** Overrides the purpose's Reply-To: the internal notification replies to the visitor. */
  replyTo?: string | null;
  contactMessageId?: string | null;
  campaignId?: string | null;
  subscriberId?: string | null;
  /** Extra headers, e.g. List-Unsubscribe. Values are checked for line breaks. */
  headers?: Record<string, string> | null;
}

/**
 * How long to wait before each retry. Five attempts over roughly three hours:
 * long enough to ride out a provider's maintenance window, short enough that
 * an acknowledgement does not arrive the next day.
 */
export const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];
export const MAX_ATTEMPTS = BACKOFF_MS.length + 1;

/**
 * A claim older than this belongs to a worker that died mid-send.
 *
 * It is not retried automatically. The message may already have been accepted
 * by the SMTP server before the process went down - there is no way to know -
 * and sending it again would be a duplicate in someone's inbox. It is marked
 * failed with that explanation, and an administrator decides.
 */
export const STALE_CLAIM_MS = 10 * 60_000;

/**
 * How long an acknowledgement stays worth sending.
 *
 * "We have received your message" is useful the same day. Three weeks later,
 * after a long outage, it is noise - and possibly arrives after the team has
 * already replied. Past this it is cancelled with that reason, not sent.
 */
export const ACK_TTL_MS = 3 * 24 * 60 * 60_000;

/**
 * How long a finished email keeps its body.
 *
 * The body is a copy of personal content: a visitor's message quoted back to
 * the team, a campaign addressed to someone by their unsubscribe link. It is
 * kept long enough to answer "what exactly did we send?" and to retry a
 * failure, then cleared. The row itself stays - recipient, subject, status,
 * dates - so the history and the statistics are not affected.
 */
export const BODY_RETENTION_DAYS = 90;
const EXPIRING_KINDS = new Set(['contact_ack']);

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: EmailSettingsService,
    private readonly transport: TransportService,
  ) {}

  /**
   * Adds a message to the queue and returns at once.
   *
   * Nothing is sent here: a slow or unreachable SMTP server must never make a
   * visitor wait for a page, or lose them the request they just made. A
   * message with a cause (a contact request) is unique per kind, so calling
   * this twice for the same request stores it once.
   */
  async enqueue(input: Enqueue): Promise<EmailMessage | null> {
    const identity = await this.settings.identityFor(input.purpose);

    // Never configured: there is no identity to send as. Queuing anyway would
    // build a backlog of acknowledgements that all go out, weeks late, the day
    // email is finally switched on.
    if (!identity.fromEmail) return null;

    try {
      return await this.prisma.emailMessage.create({
        data: {
          kind: input.kind,
          toEmail: input.to,
          toName: input.toName ?? null,
          fromName: identity.fromName,
          fromEmail: identity.fromEmail,
          replyTo:
            input.replyTo !== undefined ? input.replyTo : identity.replyTo,
          subject: input.email.subject,
          html: input.email.html,
          text: input.email.text,
          locale: input.locale ?? 'fr',
          contactMessageId: input.contactMessageId ?? null,
          campaignId: input.campaignId ?? null,
          subscriberId: input.subscriberId ?? null,
          headers: input.headers ?? undefined,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Already queued for this cause. That is the point, not a failure.
        return null;
      }
      throw error;
    }
  }

  /**
   * Takes up to `limit` due messages for this worker and nobody else.
   *
   * FOR UPDATE SKIP LOCKED is what makes several workers - or two ticks that
   * overlap - safe: a row another transaction holds is skipped, never waited
   * on and never taken twice.
   */
  async claim(limit: number): Promise<EmailMessage[]> {
    return this.prisma.$queryRaw<EmailMessage[]>`
      UPDATE "EmailMessage"
         SET "status" = 'SENDING'::"EmailStatus",
             "lockedAt" = NOW(),
             "attempts" = "attempts" + 1,
             "updatedAt" = NOW()
       WHERE "id" IN (
         SELECT "id" FROM "EmailMessage"
          WHERE "status" = 'PENDING'::"EmailStatus"
            AND "nextAttemptAt" <= NOW()
            -- A paused campaign keeps its place in the queue and is simply
            -- not taken; resuming it needs nothing but the status changing.
            AND ("campaignId" IS NULL OR "campaignId" NOT IN (
                  SELECT "id" FROM "Campaign" WHERE "status" = 'PAUSED'::"CampaignStatus"
                ))
          ORDER BY "createdAt" ASC
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
       )
      RETURNING *`;
  }

  /** See STALE_CLAIM_MS: interrupted sends are surfaced, not repeated. */
  async releaseStale(): Promise<number> {
    const cutoff = new Date(Date.now() - STALE_CLAIM_MS);
    const { count } = await this.prisma.emailMessage.updateMany({
      where: { status: 'SENDING', lockedAt: { lt: cutoff } },
      data: {
        status: 'FAILED',
        lockedAt: null,
        error:
          'Envoi interrompu (redémarrage du serveur). Le message a pu être accepté avant ' +
          "l'interruption : vérifiez avant de le renvoyer pour éviter un doublon.",
      },
    });
    return count;
  }

  /**
   * One pass: claim a batch and send it at the configured rate.
   * Returns how many were attempted.
   */
  async processBatch(): Promise<number> {
    // Nothing is claimed while sending is off. Messages wait as PENDING and go
    // out once it is switched on - none is lost, none is marked failed for a
    // decision an administrator made on purpose.
    if (!(await this.settings.isEnabled())) return 0;

    await this.releaseStale();

    const settings = await this.settings.get();
    const batch = await this.claim(settings.batchSize);
    const spacing = Math.ceil(60_000 / settings.ratePerMinute);

    for (const [index, message] of batch.entries()) {
      if (index > 0) await sleep(spacing);
      await this.deliver(message);
    }

    return batch.length;
  }

  /** Sends one claimed message and records exactly what happened. */
  async deliver(message: EmailMessage): Promise<void> {
    if (
      EXPIRING_KINDS.has(message.kind) &&
      Date.now() - new Date(message.createdAt).getTime() > ACK_TTL_MS
    ) {
      await this.prisma.emailMessage.update({
        where: { id: message.id },
        data: {
          status: 'CANCELLED',
          lockedAt: null,
          error:
            'Accusé de réception devenu trop ancien pour être utile : non envoyé.',
        },
      });
      return;
    }

    /*
      Mail addressed to a subscriber is only sent while they are subscribed.
      A campaign is queued all at once and drains over minutes or hours; an
      unsubscribe clicked in that window must stop the copies still waiting,
      whatever the campaign does.
    */
    if (message.subscriberId) {
      const subscriber = await this.prisma.newsletterSubscriber.findUnique({
        where: { id: message.subscriberId },
        select: { status: true },
      });
      if (subscriber?.status !== 'ACTIVE') {
        await this.prisma.emailMessage.update({
          where: { id: message.id },
          data: {
            status: 'CANCELLED',
            lockedAt: null,
            error: 'Désinscrit avant l’envoi : non envoyé.',
          },
        });
        return;
      }
    }

    try {
      await this.transport.send({
        to: message.toEmail,
        toName: message.toName,
        fromName: message.fromName,
        fromEmail: message.fromEmail,
        replyTo: message.replyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers:
          (message.headers as Record<string, string> | null) ?? undefined,
      });

      await this.prisma.emailMessage.update({
        where: { id: message.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          lockedAt: null,
          error: null,
        },
      });

      if (message.campaignId && message.subscriberId) {
        await this.prisma.newsletterSubscriber
          .update({
            where: { id: message.subscriberId },
            data: { lastCampaignAt: new Date() },
          })
          // A subscriber erased mid-campaign is not a failed send.
          .catch(() => undefined);
      }
    } catch (error) {
      const config = await this.settings.transportConfig().catch(() => null);
      const reason = redact(String((error as Error)?.message ?? error), [
        config?.password,
        config?.username,
      ]);

      const permanent =
        isPermanent(error) ||
        message.attempts >= MAX_ATTEMPTS ||
        error instanceof SmtpNotConfiguredError;

      await this.prisma.emailMessage.update({
        where: { id: message.id },
        data: permanent
          ? { status: 'FAILED', lockedAt: null, error: reason }
          : {
              status: 'PENDING',
              lockedAt: null,
              error: reason,
              nextAttemptAt: new Date(
                Date.now() + BACKOFF_MS[message.attempts - 1],
              ),
            },
      });

      // The id and the kind, never the address or the content.
      this.logger.warn(
        `Email ${message.id} (${message.kind}) ${permanent ? 'failed' : 'will retry'}: ${reason}`,
      );
    }
  }

  /**
   * Puts a failed or cancelled message back in the queue, once, on request.
   * Its attempts start again so it gets the full retry schedule.
   */
  async retry(id: string): Promise<EmailMessage> {
    const message = await this.prisma.emailMessage.findUnique({
      where: { id },
    });
    if (!message) throw new Error('Message introuvable');
    if (message.status !== 'FAILED' && message.status !== 'CANCELLED') {
      throw new Error('Seul un envoi en échec ou annulé peut être relancé.');
    }
    if (!message.html && !message.text) {
      // Past the retention period the body is gone, and an empty email is
      // not a retry.
      throw new Error(
        'Le contenu de cet email a été effacé (conservation limitée) : il ne peut plus être renvoyé.',
      );
    }
    return this.prisma.emailMessage.update({
      where: { id },
      data: {
        status: 'PENDING',
        attempts: 0,
        nextAttemptAt: new Date(),
        lockedAt: null,
        error: null,
      },
    });
  }

  /** Clears the bodies of finished emails past the retention period. */
  async purgeBodies(days = BODY_RETENTION_DAYS): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60_000);
    const { count } = await this.prisma.emailMessage.updateMany({
      where: {
        status: { in: ['SENT', 'FAILED', 'CANCELLED'] },
        updatedAt: { lt: cutoff },
        NOT: { html: '' },
      },
      data: { html: '', text: '' },
    });
    return count;
  }

  /** Withdraws a message that has not been sent yet. */
  async cancel(id: string): Promise<EmailMessage> {
    const { count } = await this.prisma.emailMessage.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'CANCELLED', lockedAt: null },
    });
    if (count === 0)
      throw new Error('Seul un envoi en attente peut être annulé.');
    return (await this.prisma.emailMessage.findUnique({ where: { id } }))!;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
