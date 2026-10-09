import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  type NewsletterSubscriber,
  type SubscriberStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailSettingsService } from '../email/email-settings.service';
import { EmailQueueService } from '../email/email-queue.service';
import { TemplatesService } from '../email/templates.service';
import { hasEncryptionKey } from '../email/secret-box';
import { isPlausibleEmail, type Locale } from '../email/render';
import { paginated, type Paginated } from '../common/dto/pagination.dto';
import {
  canSignUnsubscribe,
  hashToken,
  newConfirmToken,
  unsubscribeToken,
  verifyUnsubscribeToken,
} from './tokens';

/**
 * The sentence a subscriber agrees to, kept with their record as given.
 *
 * Written here, not sent by the browser: a client could otherwise claim any
 * wording it liked, and the record would prove nothing.
 */
export const CONSENT_TEXT: Record<Locale, string> = {
  fr: "J'accepte de recevoir par email les nouvelles de Louga Développement Solidaire. Je peux me désinscrire à tout moment.",
  ar: 'أوافق على تلقّي أخبار جمعية لوغا للتنمية والتضامن عبر البريد الإلكتروني، ويمكنني إلغاء الاشتراك في أي وقت.',
};

/** A confirmation email is sent at most this often to one address. */
export const RESEND_INTERVAL_MS = 10 * 60_000;

export type ConfirmResult = 'confirmed' | 'expired' | 'invalid';

export interface SubscribeInput {
  email: string;
  consent: boolean;
  locale: Locale;
  source: 'footer' | 'page';
  /** A field humans never see. Anything in it means a bot filled the form. */
  website?: string;
}

export interface SubscriberQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: SubscriberStatus;
  locale?: string;
  from?: Date;
  to?: Date;
}

/** What the back-office sees of a subscriber: never the token hash. */
const PUBLIC_FIELDS = {
  id: true,
  email: true,
  status: true,
  locale: true,
  source: true,
  consentAt: true,
  confirmedAt: true,
  unsubscribedAt: true,
  lastCampaignAt: true,
  createdAt: true,
} as const;

export class NewsletterUnavailableError extends Error {}

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: EmailSettingsService,
    private readonly queue: EmailQueueService,
    private readonly templates: TemplatesService,
  ) {}

  /**
   * Whether a visitor can subscribe right now.
   *
   * The public form is shown only when this is true: a subscription whose
   * confirmation email can never leave is a promise made to a visitor that
   * nobody can keep. Sending must be on, the site address known, and the key
   * that signs unsubscribe links present - a newsletter without a working
   * unsubscribe link must not be possible.
   */
  async isAvailable(): Promise<boolean> {
    if (!hasEncryptionKey() || !canSignUnsubscribe()) return false;
    if (!(await this.settings.isEnabled())) return false;
    if (!(await this.settings.siteUrl())) return false;
    const identity = await this.settings.identityFor('newsletter');
    return Boolean(identity.fromEmail);
  }

  /**
   * A subscription request. Resolves the same way whatever happened.
   *
   * Saying "this address is already subscribed" would tell anyone typing an
   * address whether that person follows the association. The response never
   * varies, and the confirmation email is the only place the outcome shows -
   * in the inbox of whoever owns the address.
   */
  async subscribe(input: SubscribeInput): Promise<void> {
    if (input.website) return; // A bot. Accepted, and forgotten.
    if (!input.consent) throw new Error('consent'); // Refused at the DTO already.

    const email = input.email.trim().toLowerCase();
    if (!isPlausibleEmail(email)) return;
    if (!(await this.isAvailable())) throw new NewsletterUnavailableError();

    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    // Already confirmed: nothing to do, and nothing to send. Sending "you are
    // already subscribed" would make the form a way to mail anyone, at will.
    if (existing?.status === 'ACTIVE') return;

    // A pending request asked again soon after: the first email is on its
    // way. Without this, the form is a free inbox-flooding service.
    if (
      existing?.status === 'PENDING' &&
      existing.confirmSentAt &&
      Date.now() - existing.confirmSentAt.getTime() < RESEND_INTERVAL_MS
    ) {
      return;
    }

    const { token, hash, expiresAt } = newConfirmToken();
    const consent = {
      consentAt: new Date(),
      consentText: CONSENT_TEXT[input.locale],
      locale: input.locale,
      source: input.source,
      confirmTokenHash: hash,
      confirmTokenExpiresAt: expiresAt,
      confirmSentAt: new Date(),
    };

    /*
      Someone who unsubscribed and asks again goes back through confirmation:
      their new request is new consent, and it is recorded as such. Nothing
      ever moves an UNSUBSCRIBED address straight back to ACTIVE.
    */
    const subscriber = existing
      ? await this.prisma.newsletterSubscriber.update({
          where: { id: existing.id },
          data: { ...consent, status: 'PENDING', unsubscribedAt: null },
        })
      : await this.prisma.newsletterSubscriber
          .create({ data: { email, status: 'PENDING', ...consent } })
          .catch((error: unknown) => {
            // Two requests for a new address arriving together: the other one
            // created the row. Treat it as the resend case.
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === 'P2002'
            ) {
              return null;
            }
            throw error;
          });
    if (!subscriber) return;

    await this.sendConfirmation(subscriber, token);
  }

  private async sendConfirmation(
    subscriber: NewsletterSubscriber,
    token: string,
  ): Promise<void> {
    const siteUrl = await this.settings.requireSiteUrl();
    const locale = subscriber.locale as Locale;
    const lang = locale === 'ar' ? '&lang=ar' : '';
    const confirmUrl = `${siteUrl}/newsletter/confirmation?token=${encodeURIComponent(token)}${lang}`;

    const email = await this.templates.render('newsletter_confirm', locale, {
      confirmUrl,
    });
    await this.queue.enqueue({
      kind: 'newsletter_confirm',
      purpose: 'newsletter',
      to: subscriber.email,
      locale,
      email,
    });
  }

  /**
   * The link in the confirmation email.
   *
   * Single use: the hash is cleared the moment it confirms, so the same link
   * cannot be replayed, and an expired one only ever says so.
   */
  async confirm(token: string): Promise<ConfirmResult> {
    if (!token || token.length > 200) return 'invalid';
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { confirmTokenHash: hashToken(token) },
    });
    if (!subscriber) return 'invalid';
    if (
      !subscriber.confirmTokenExpiresAt ||
      subscriber.confirmTokenExpiresAt < new Date()
    ) {
      return 'expired';
    }

    const confirmed = await this.prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        status: 'ACTIVE',
        confirmedAt: new Date(),
        confirmTokenHash: null,
        confirmTokenExpiresAt: null,
      },
    });

    // Both optional, both off by default, neither allowed to fail the
    // confirmation the person just made.
    await Promise.allSettled([
      this.welcome(confirmed),
      this.notifyTeam(confirmed),
    ]).then((results) =>
      results
        .filter((result) => result.status === 'rejected')
        .forEach((result) =>
          this.logger.warn(
            `Post-confirmation email for ${confirmed.id} failed: ${String(
              result.reason,
            )}`,
          ),
        ),
    );

    return 'confirmed';
  }

  private async welcome(subscriber: NewsletterSubscriber): Promise<void> {
    if (!(await this.templates.get('newsletter_welcome')).isActive) return;
    const locale = subscriber.locale as Locale;
    const links = await this.unsubscribeLinks(subscriber.id, locale);
    const email = await this.templates.render(
      'newsletter_welcome',
      locale,
      {},
      { unsubscribeUrl: links.page },
    );
    await this.queue.enqueue({
      kind: 'newsletter_welcome',
      purpose: 'newsletter',
      to: subscriber.email,
      locale,
      email,
      subscriberId: subscriber.id,
      headers: links.headers,
    });
  }

  private async notifyTeam(subscriber: NewsletterSubscriber): Promise<void> {
    if (!(await this.templates.get('newsletter_subscribed')).isActive) return;
    const inbox = await this.settings.adminInbox();
    if (!inbox) return;
    const email = await this.templates.render('newsletter_subscribed', 'fr', {
      email: subscriber.email,
      locale: subscriber.locale,
      source: subscriber.source,
    });
    await this.queue.enqueue({
      kind: 'newsletter_subscribed',
      purpose: 'notification',
      to: inbox,
      locale: 'fr',
      email,
    });
  }

  /**
   * The two ways out every newsletter offers.
   *
   * `page` is the link in the footer: it opens a page with a button, so a
   * mail scanner that prefetches links cannot unsubscribe anyone by visiting
   * it. `headers` is RFC 8058 one-click unsubscribe, which mail clients show
   * as their own button and which Gmail and Yahoo require of bulk senders; it
   * is a POST, which scanners do not send.
   */
  async unsubscribeLinks(
    subscriberId: string,
    locale: Locale,
    campaignId?: string,
    /** Passed by a caller building thousands of links, so it is read once. */
    knownSiteUrl?: string,
  ): Promise<{
    page: string;
    oneClick: string;
    headers: Record<string, string>;
  }> {
    const siteUrl = knownSiteUrl ?? (await this.settings.requireSiteUrl());
    const params = new URLSearchParams({
      s: subscriberId,
      t: unsubscribeToken(subscriberId),
    });
    if (campaignId) params.set('c', campaignId);

    const page = `${siteUrl}/newsletter/desinscription?${params.toString()}${
      locale === 'ar' ? '&lang=ar' : ''
    }`;
    const oneClick = `${siteUrl}/api/v1/newsletter/unsubscribe/one-click?${params.toString()}`;

    return {
      page,
      oneClick,
      headers: {
        'List-Unsubscribe': `<${oneClick}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    };
  }

  /**
   * Leaves the list. Idempotent: a second click says it is done, because it is.
   *
   * Copies of a campaign still waiting in the queue for this address are
   * cancelled here as well as at send time, so the history shows why they
   * never left.
   */
  async unsubscribe(
    subscriberId: string,
    token: string,
    campaignId?: string,
  ): Promise<boolean> {
    if (!verifyUnsubscribeToken(subscriberId, token)) return false;

    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { id: subscriberId },
    });
    if (!subscriber) return true; // Erased already: there is nothing to receive.
    if (subscriber.status === 'UNSUBSCRIBED') return true;

    await this.leave(subscriber.id, campaignId);
    return true;
  }

  /** Shared by the public link and the administrator's button. */
  private async leave(id: string, campaignId?: string | null): Promise<void> {
    const validCampaign =
      campaignId && /^[0-9a-f-]{36}$/i.test(campaignId)
        ? (
            await this.prisma.campaign.findUnique({
              where: { id: campaignId },
              select: { id: true },
            })
          )?.id
        : null;

    await this.prisma.$transaction([
      this.prisma.newsletterSubscriber.update({
        where: { id },
        data: {
          status: 'UNSUBSCRIBED',
          unsubscribedAt: new Date(),
          unsubscribedCampaignId: validCampaign ?? null,
          confirmTokenHash: null,
          confirmTokenExpiresAt: null,
        },
      }),
      this.prisma.emailMessage.updateMany({
        where: { subscriberId: id, status: 'PENDING' },
        data: {
          status: 'CANCELLED',
          error: 'Désinscrit avant l’envoi : non envoyé.',
        },
      }),
    ]);
  }

  // ---------------------------------------------------------------- admin

  async stats() {
    const [byStatus, last, months] = await Promise.all([
      this.prisma.newsletterSubscriber.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.newsletterSubscriber.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { confirmedAt: 'desc' },
        select: { confirmedAt: true },
      }),
      /*
        Twelve months of confirmations and departures, counted by the
        database. A month with nothing in it is returned as a zero by the
        caller, not drawn as a gap or interpolated.
      */
      this.prisma.$queryRaw<
        Array<{ month: Date; confirmed: bigint; unsubscribed: bigint }>
      >`
        SELECT m.month,
               COUNT(*) FILTER (WHERE date_trunc('month', s."confirmedAt") = m.month)    AS confirmed,
               COUNT(*) FILTER (WHERE date_trunc('month', s."unsubscribedAt") = m.month) AS unsubscribed
          FROM generate_series(
                 date_trunc('month', NOW()) - INTERVAL '11 months',
                 date_trunc('month', NOW()),
                 INTERVAL '1 month'
               ) AS m(month)
          LEFT JOIN "NewsletterSubscriber" s
            ON date_trunc('month', s."confirmedAt") = m.month
            OR date_trunc('month', s."unsubscribedAt") = m.month
         GROUP BY m.month
         ORDER BY m.month`,
    ]);

    const counts: Record<SubscriberStatus, number> = {
      PENDING: 0,
      ACTIVE: 0,
      UNSUBSCRIBED: 0,
    };
    for (const row of byStatus) counts[row.status] = row._count._all;

    return {
      counts,
      total: counts.PENDING + counts.ACTIVE + counts.UNSUBSCRIBED,
      lastConfirmedAt: last?.confirmedAt ?? null,
      months: months.map((row) => ({
        month: row.month,
        confirmed: Number(row.confirmed),
        unsubscribed: Number(row.unsubscribed),
      })),
    };
  }

  private where(query: SubscriberQuery): Prisma.NewsletterSubscriberWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.locale ? { locale: query.locale } : {}),
      ...(query.search
        ? { email: { contains: query.search.toLowerCase() } }
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
  }

  async list(query: SubscriberQuery): Promise<Paginated<unknown>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const where = this.where(query);

    const [total, data] = await this.prisma.$transaction([
      this.prisma.newsletterSubscriber.count({ where }),
      this.prisma.newsletterSubscriber.findMany({
        where,
        select: PUBLIC_FIELDS,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return paginated(data, total, page, limit);
  }

  /**
   * The filtered list as CSV. Exported only when it is a list the association
   * may use: the default is confirmed subscribers.
   */
  async exportCsv(
    query: SubscriberQuery,
  ): Promise<{ csv: string; count: number }> {
    const rows = await this.prisma.newsletterSubscriber.findMany({
      where: this.where({ ...query, status: query.status ?? 'ACTIVE' }),
      select: PUBLIC_FIELDS,
      orderBy: { createdAt: 'asc' },
    });

    const header = [
      'email',
      'statut',
      'langue',
      'source',
      'consentement',
      'confirmation',
      'desinscription',
    ];
    const lines = rows.map((row) =>
      [
        row.email,
        row.status,
        row.locale,
        row.source,
        row.consentAt?.toISOString() ?? '',
        row.confirmedAt?.toISOString() ?? '',
        row.unsubscribedAt?.toISOString() ?? '',
      ]
        .map(csvCell)
        .join(','),
    );

    // The BOM is what makes Excel read the accents as UTF-8.
    return {
      csv: `\uFEFF${[header.join(','), ...lines].join('\r\n')}\r\n`,
      count: rows.length,
    };
  }

  async adminUnsubscribe(id: string): Promise<void> {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { id },
    });
    if (!subscriber || subscriber.status === 'UNSUBSCRIBED') return;
    await this.leave(id, null);
  }

  /**
   * Erasure, on request: the subscriber goes, and their address is scrubbed
   * from the send history too. Counts survive; the person does not.
   */
  async erase(id: string): Promise<boolean> {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { id },
    });
    if (!subscriber) return false;
    await this.prisma.$transaction([
      this.prisma.emailMessage.updateMany({
        where: { toEmail: subscriber.email },
        data: { toEmail: 'effacé', toName: null, html: '', text: '' },
      }),
      this.prisma.newsletterSubscriber.delete({ where: { id } }),
    ]);
    return true;
  }

  /**
   * Adds addresses an administrator attests consented elsewhere.
   *
   * Never touches an address that already exists, whatever its status: an
   * import is not a way to bring back someone who left.
   */
  async import(
    text: string,
    attestedBy: string,
  ): Promise<{
    added: number;
    existing: number;
    invalid: number;
    duplicates: number;
  }> {
    const seen = new Set<string>();
    const candidates: Array<{ email: string; locale: Locale }> = [];
    let invalid = 0;
    let duplicates = 0;

    for (const raw of text.split(/\r?\n/).slice(0, 5000)) {
      const line = raw.replace(/^\uFEFF/, '').trim();
      if (!line) continue;
      const [first, second] = line
        .split(/[;,\t]/)
        .map((cell) => cell.replace(/^"|"$/g, '').trim());
      const email = (first ?? '').toLowerCase();
      if (email === 'email' || email === 'e-mail') continue; // A header row.
      if (!isPlausibleEmail(email)) {
        invalid += 1;
        continue;
      }
      if (seen.has(email)) {
        duplicates += 1;
        continue;
      }
      seen.add(email);
      candidates.push({
        email,
        locale: second?.toLowerCase() === 'ar' ? 'ar' : 'fr',
      });
    }

    const already = await this.prisma.newsletterSubscriber.findMany({
      where: { email: { in: candidates.map((c) => c.email) } },
      select: { email: true },
    });
    const known = new Set(already.map((row) => row.email));
    const fresh = candidates.filter((candidate) => !known.has(candidate.email));

    if (fresh.length > 0) {
      const now = new Date();
      await this.prisma.newsletterSubscriber.createMany({
        data: fresh.map(({ email, locale }) => ({
          email,
          locale,
          status: 'ACTIVE' as const,
          source: 'import',
          consentAt: now,
          confirmedAt: now,
          consentText: `Importé par un administrateur (${attestedBy}), qui atteste le consentement recueilli hors du site.`,
        })),
        skipDuplicates: true,
      });
    }

    return { added: fresh.length, existing: known.size, invalid, duplicates };
  }
}

/** One CSV cell: quoted, and defused against spreadsheet formula injection. */
export function csvCell(value: string): string {
  // A cell starting with = + - @ is executed as a formula by Excel; an address
  // like "=HYPERLINK(...)@x.y" must arrive as text.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
