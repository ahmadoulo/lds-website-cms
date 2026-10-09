import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Campaign, type CampaignStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailSettingsService } from '../email/email-settings.service';
import { EmailQueueService } from '../email/email-queue.service';
import { TemplatesService } from '../email/templates.service';
import { TransportService } from '../email/transport.service';
import {
  frame,
  assertHeaderSafe,
  isPlausibleEmail,
  type Locale,
} from '../email/render';
import { NewsletterService } from '../newsletter/newsletter.service';
import { canSignUnsubscribe } from '../newsletter/tokens';
import { redact } from '../email/secret-box';
import { paginated } from '../common/dto/pagination.dto';
import { mediaIdsIn, renderBlocks, validateBlocks, type Block } from './blocks';

export type Segment = 'all' | 'fr' | 'ar' | 'period';

export interface Audience {
  segment: Segment;
  /** For 'period': subscribers who confirmed between these dates. */
  from?: string;
  to?: string;
}

export interface CampaignInput {
  name?: string;
  subject?: string;
  preheader?: string | null;
  blocks?: unknown;
  locale?: Locale;
  audience?: Audience;
  fromName?: string | null;
  replyTo?: string | null;
  includeSignature?: boolean;
}

/** How many queue rows are written per statement when a campaign starts. */
const ENQUEUE_CHUNK = 500;

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: EmailSettingsService,
    private readonly queue: EmailQueueService,
    private readonly templates: TemplatesService,
    private readonly transport: TransportService,
    private readonly newsletter: NewsletterService,
  ) {}

  // ---------------------------------------------------------------- reading

  async list(page = 1, limit = 20) {
    const [total, data] = await this.prisma.$transaction([
      this.prisma.campaign.count(),
      this.prisma.campaign.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return paginated(data, total, page, limit);
  }

  async get(id: string): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campagne introuvable');
    return campaign;
  }

  /**
   * What actually happened, counted from the queue.
   *
   * "Sent" is accepted by the SMTP server. Opens and clicks are not counted:
   * that takes tracking pixels and rewritten links, a level of surveillance
   * the association has not asked for, and a figure the site would then be
   * claiming more confidently than it knows.
   */
  async stats(id: string) {
    await this.get(id);
    const [byStatus, unsubscribed] = await Promise.all([
      this.prisma.emailMessage.groupBy({
        by: ['status'],
        where: { campaignId: id, kind: 'campaign' },
        _count: { _all: true },
      }),
      this.prisma.newsletterSubscriber.count({
        where: { unsubscribedCampaignId: id },
      }),
    ]);
    const counts = { PENDING: 0, SENDING: 0, SENT: 0, FAILED: 0, CANCELLED: 0 };
    for (const row of byStatus) counts[row.status] = row._count._all;
    const queued = Object.values(counts).reduce((sum, value) => sum + value, 0);
    return { queued, counts, unsubscribed };
  }

  // ---------------------------------------------------------------- writing

  private async clean(input: CampaignInput, current?: Campaign) {
    const name = (input.name ?? current?.name ?? '').trim();
    const subject = (input.subject ?? current?.subject ?? '').trim();
    if (!name) throw new BadRequestException('Le nom interne est obligatoire.');
    if (!subject) throw new BadRequestException("L'objet est obligatoire.");
    try {
      assertHeaderSafe('subject', subject);
      assertHeaderSafe('fromName', input.fromName ?? null);
    } catch {
      throw new BadRequestException(
        "L'objet et le nom d'expéditeur tiennent sur une ligne.",
      );
    }
    if (input.replyTo && !isPlausibleEmail(input.replyTo)) {
      throw new BadRequestException('Adresse de réponse invalide.');
    }

    let blocks: Block[] | undefined;
    if (input.blocks !== undefined) {
      try {
        blocks = validateBlocks(input.blocks);
      } catch (error) {
        throw new BadRequestException((error as Error).message);
      }
      const ids = mediaIdsIn(blocks);
      if (ids.length) {
        const found = await this.prisma.media.count({
          where: { id: { in: ids } },
        });
        if (found !== new Set(ids).size) {
          throw new BadRequestException(
            "Une image de la campagne n'existe plus dans la médiathèque.",
          );
        }
      }
    }

    const audience = input.audience
      ? this.checkAudience(input.audience)
      : undefined;

    return {
      name,
      subject,
      ...(input.preheader !== undefined
        ? { preheader: input.preheader?.trim() || null }
        : {}),
      ...(blocks ? { blocks: blocks as unknown as Prisma.InputJsonValue } : {}),
      ...(input.locale ? { locale: input.locale } : {}),
      ...(audience
        ? { audience: audience as unknown as Prisma.InputJsonValue }
        : {}),
      ...(input.fromName !== undefined
        ? { fromName: input.fromName?.trim() || null }
        : {}),
      ...(input.replyTo !== undefined
        ? { replyTo: input.replyTo?.trim() || null }
        : {}),
      ...(input.includeSignature !== undefined
        ? { includeSignature: input.includeSignature }
        : {}),
    };
  }

  private checkAudience(audience: Audience): Audience {
    if (!['all', 'fr', 'ar', 'period'].includes(audience.segment)) {
      throw new BadRequestException('Audience inconnue.');
    }
    if (audience.segment === 'period') {
      const from = audience.from ? new Date(audience.from) : null;
      const to = audience.to ? new Date(audience.to) : null;
      if (
        !from ||
        !to ||
        Number.isNaN(+from) ||
        Number.isNaN(+to) ||
        from > to
      ) {
        throw new BadRequestException('Indiquez une période valide.');
      }
      return {
        segment: 'period',
        from: from.toISOString(),
        to: to.toISOString(),
      };
    }
    return { segment: audience.segment };
  }

  async create(input: CampaignInput, userId: string): Promise<Campaign> {
    const data = await this.clean(input);
    return this.prisma.campaign.create({
      data: {
        blocks: [],
        audience: { segment: 'all' },
        ...data,
        createdById: userId,
      },
    });
  }

  /** Only a draft can change: what was scheduled or sent is a record. */
  async update(id: string, input: CampaignInput): Promise<Campaign> {
    const current = await this.get(id);
    if (current.status !== 'DRAFT') {
      throw new ConflictException(
        'Seul un brouillon peut être modifié. Annulez la planification pour le reprendre.',
      );
    }
    return this.prisma.campaign.update({
      where: { id },
      data: await this.clean(input, current),
    });
  }

  async duplicate(id: string, userId: string): Promise<Campaign> {
    const source = await this.get(id);
    return this.prisma.campaign.create({
      data: {
        name: `Copie de ${source.name}`,
        subject: source.subject,
        preheader: source.preheader,
        blocks: source.blocks as Prisma.InputJsonValue,
        locale: source.locale,
        audience: source.audience as Prisma.InputJsonValue,
        fromName: source.fromName,
        replyTo: source.replyTo,
        includeSignature: source.includeSignature,
        createdById: userId,
      },
    });
  }

  async remove(id: string): Promise<void> {
    const campaign = await this.get(id);
    if (campaign.status !== 'DRAFT') {
      throw new ConflictException(
        "Une campagne envoyée ou planifiée se garde : elle fait partie de l'historique.",
      );
    }
    await this.prisma.campaign.delete({ where: { id } });
  }

  // ---------------------------------------------------------------- audience

  private audienceWhere(campaign: {
    audience: unknown;
  }): Prisma.NewsletterSubscriberWhereInput {
    const audience = campaign.audience as Audience;
    // ACTIVE, always and before anything else: pending and unsubscribed
    // addresses are not in any segment, whatever the segment says.
    const base: Prisma.NewsletterSubscriberWhereInput = { status: 'ACTIVE' };
    switch (audience?.segment) {
      case 'fr':
        return { ...base, locale: 'fr' };
      case 'ar':
        return { ...base, locale: 'ar' };
      case 'period':
        return {
          ...base,
          confirmedAt: {
            gte: new Date(audience.from!),
            lte: new Date(audience.to!),
          },
        };
      default:
        return base;
    }
  }

  async countAudience(audience: Audience): Promise<number> {
    return this.prisma.newsletterSubscriber.count({
      where: this.audienceWhere({ audience: this.checkAudience(audience) }),
    });
  }

  // ---------------------------------------------------------------- rendering

  /**
   * The campaign framed for one recipient. The body is the same for everyone;
   * only the unsubscribe link in the frame differs.
   */
  private async renderer(campaign: Campaign, siteUrl: string) {
    const locale = campaign.locale as Locale;
    const site = await this.templates.siteValues(siteUrl);
    const signature = campaign.includeSignature
      ? ((await this.settings.signature()) ?? {})[locale]
      : null;

    const body = renderBlocks(campaign.blocks as unknown as Block[], {
      siteUrl,
      locale,
      preheader: campaign.preheader,
      signature,
    });

    return (unsubscribeUrl: string | null) => ({
      subject: campaign.subject,
      html: frame(body.html, {
        siteName: site.siteName,
        siteUrl,
        logoUrl: `${siteUrl}/logo-mark.png`,
        address: site.address,
        unsubscribeUrl,
        locale,
      }),
      text: unsubscribeUrl
        ? `${body.text}\n\n—\n${locale === 'ar' ? 'إلغاء الاشتراك' : 'Se désinscrire'} : ${unsubscribeUrl}`
        : body.text,
    });
  }

  /** The preview the editor shows, from stored or unsaved content. */
  async preview(
    id: string | null,
    draft: CampaignInput,
    fallbackSiteUrl: string | null,
  ) {
    const stored = id ? await this.get(id) : null;
    const blocks = validateBlocksOr400(draft.blocks ?? stored?.blocks ?? []);
    const campaign = {
      ...(stored ?? {}),
      subject: draft.subject ?? stored?.subject ?? '',
      preheader: draft.preheader ?? stored?.preheader ?? null,
      locale: draft.locale ?? stored?.locale ?? 'fr',
      includeSignature:
        draft.includeSignature ?? stored?.includeSignature ?? true,
      blocks,
    } as unknown as Campaign;

    const siteUrl = (await this.settings.siteUrl()) ?? fallbackSiteUrl;
    if (!siteUrl)
      throw new BadRequestException("Définissez l'adresse publique du site.");
    const render = await this.renderer(campaign, siteUrl);
    // A link that goes nowhere: a preview must not carry a working
    // unsubscribe token for anybody.
    return render(`${siteUrl}/newsletter/desinscription`);
  }

  /** One copy to one address, sent now, recorded in the history. */
  async sendTest(id: string, to: string, fallbackSiteUrl: string | null) {
    const campaign = await this.get(id);
    const siteUrl = (await this.settings.siteUrl()) ?? fallbackSiteUrl;
    if (!siteUrl)
      throw new BadRequestException("Définissez l'adresse publique du site.");
    const email = (await this.renderer(campaign, siteUrl))(
      `${siteUrl}/newsletter/desinscription`,
    );
    const identity = await this.identity(campaign);
    const subject = `[Test] ${email.subject}`;

    let error: string | null = null;
    try {
      await this.transport.send({ to, ...identity, ...email, subject });
    } catch (caught) {
      // Provider errors can quote the credentials they rejected.
      const config = await this.settings.transportConfig().catch(() => null);
      error = redact(String((caught as Error)?.message ?? caught), [
        config?.password,
        config?.username,
      ]);
    }

    await this.prisma.emailMessage.create({
      data: {
        kind: 'campaign_test',
        toEmail: to,
        ...identity,
        subject,
        html: email.html,
        text: email.text,
        locale: campaign.locale,
        status: error ? 'FAILED' : 'SENT',
        attempts: 1,
        sentAt: error ? null : new Date(),
        error,
      },
    });
    return error
      ? { ok: false, message: error }
      : { ok: true, message: 'Email de test accepté par le serveur.' };
  }

  /**
   * Who a campaign comes from. The address is always the newsletter identity
   * the administrator configured - a campaign can rename the sender and set
   * its own Reply-To, but it cannot pick an address the provider has not
   * authorised.
   */
  private async identity(campaign: Campaign) {
    const base = await this.settings.identityFor('newsletter');
    return {
      fromName: campaign.fromName || base.fromName,
      fromEmail: base.fromEmail,
      replyTo: campaign.replyTo || base.replyTo,
    };
  }

  // ---------------------------------------------------------------- sending

  /**
   * Schedules or starts a campaign, after the administrator saw the recap.
   *
   * `expectedRecipients` is the count the confirmation dialog showed. If the
   * audience has changed since - someone confirmed, someone left - the send
   * is refused and the dialog shows the new number: what was confirmed is
   * what is sent, or nothing is.
   */
  async schedule(id: string, at: Date | null, expectedRecipients: number) {
    const campaign = await this.get(id);
    if (campaign.status !== 'DRAFT')
      throw new ConflictException("Cette campagne n'est plus un brouillon.");
    if (!(campaign.blocks as unknown[]).length)
      throw new BadRequestException('La campagne est vide.');

    if (!(await this.settings.isEnabled())) {
      throw new BadRequestException("L'envoi des emails est désactivé.");
    }
    if (!canSignUnsubscribe()) {
      throw new BadRequestException(
        'La clé EMAIL_ENCRYPTION_KEY est absente : impossible de signer les liens de désinscription.',
      );
    }
    const siteUrl = await this.settings.requireSiteUrl().catch(() => {
      throw new BadRequestException("Définissez l'adresse publique du site.");
    });

    const count = await this.prisma.newsletterSubscriber.count({
      where: this.audienceWhere(campaign),
    });
    if (count === 0)
      throw new BadRequestException("Personne n'est dans cette audience.");
    if (count !== expectedRecipients) {
      throw new ConflictException({
        message: `L'audience a changé : ${count} destinataire(s) au lieu de ${expectedRecipients}. Vérifiez puis confirmez de nouveau.`,
        recipients: count,
      });
    }

    if (at && at.getTime() > Date.now() + 60_000) {
      return this.prisma.campaign.update({
        where: { id },
        data: { status: 'SCHEDULED', scheduledAt: at, siteUrl },
      });
    }

    await this.prisma.campaign.update({ where: { id }, data: { siteUrl } });
    return this.start(id);
  }

  /**
   * DRAFT or SCHEDULED to SENDING, then one queue row per recipient.
   *
   * The status changes first, atomically, so two schedulers cannot both
   * start the same campaign. The rows are written in chunks with
   * skipDuplicates on (campaignId, subscriberId): if the process dies half
   * way, the scheduler runs this again and only the missing rows are added.
   * recipientCount is set last, and is what says the enqueue finished.
   */
  async start(id: string): Promise<Campaign> {
    const { count: claimed } = await this.prisma.campaign.updateMany({
      where: { id, status: { in: ['DRAFT', 'SCHEDULED'] } },
      data: { status: 'SENDING', startedAt: new Date() },
    });
    if (claimed === 0) {
      const current = await this.get(id);
      if (current.status !== 'SENDING' || current.recipientCount !== null)
        return current;
    }
    return this.enqueue(id);
  }

  async enqueue(id: string): Promise<Campaign> {
    const campaign = await this.get(id);
    const siteUrl = campaign.siteUrl ?? (await this.settings.requireSiteUrl());
    const render = await this.renderer(campaign, siteUrl);
    const identity = await this.identity(campaign);
    const where = this.audienceWhere(campaign);

    let cursor: string | undefined;
    for (;;) {
      const batch = await this.prisma.newsletterSubscriber.findMany({
        where,
        select: { id: true, email: true },
        orderBy: { id: 'asc' },
        take: ENQUEUE_CHUNK,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (batch.length === 0) break;

      const rows = await Promise.all(
        batch.map(async (subscriber) => {
          const links = await this.newsletter.unsubscribeLinks(
            subscriber.id,
            campaign.locale as Locale,
            campaign.id,
            siteUrl,
          );
          const email = render(links.page);
          return {
            kind: 'campaign',
            toEmail: subscriber.email,
            ...identity,
            subject: email.subject,
            html: email.html,
            text: email.text,
            locale: campaign.locale,
            campaignId: campaign.id,
            subscriberId: subscriber.id,
            headers: links.headers,
          };
        }),
      );
      await this.prisma.emailMessage.createMany({
        data: rows,
        skipDuplicates: true,
      });
      cursor = batch[batch.length - 1].id;
    }

    const recipientCount = await this.prisma.emailMessage.count({
      where: { campaignId: id, kind: 'campaign' },
    });
    return this.prisma.campaign.update({
      where: { id },
      data: { recipientCount },
    });
  }

  async pause(id: string) {
    return this.transition(id, ['SENDING'], 'PAUSED');
  }

  async resume(id: string) {
    return this.transition(id, ['PAUSED'], 'SENDING');
  }

  /**
   * Stops what has not left yet. A scheduled campaign goes back to being a
   * draft; one already sending is cancelled, and its waiting copies with it.
   * What the server has accepted cannot be called back, and nothing here
   * pretends otherwise.
   */
  async cancel(id: string) {
    const campaign = await this.get(id);
    if (campaign.status === 'SCHEDULED') {
      return this.prisma.campaign.update({
        where: { id },
        data: { status: 'DRAFT', scheduledAt: null },
      });
    }
    if (campaign.status !== 'SENDING' && campaign.status !== 'PAUSED') {
      throw new ConflictException('Cette campagne ne peut plus être annulée.');
    }
    await this.prisma.$transaction([
      this.prisma.emailMessage.updateMany({
        where: { campaignId: id, status: 'PENDING' },
        data: {
          status: 'CANCELLED',
          error: 'Campagne annulée avant cet envoi.',
        },
      }),
      this.prisma.campaign.update({
        where: { id },
        data: { status: 'CANCELLED', completedAt: new Date() },
      }),
    ]);
    return this.get(id);
  }

  private async transition(
    id: string,
    from: CampaignStatus[],
    to: CampaignStatus,
  ) {
    const { count } = await this.prisma.campaign.updateMany({
      where: { id, status: { in: from } },
      data: { status: to },
    });
    if (count === 0)
      throw new ConflictException(
        'Action impossible dans l’état actuel de la campagne.',
      );
    return this.get(id);
  }

  // ---------------------------------------------------------------- scheduler

  /** Campaigns whose time has come. */
  async startDue(): Promise<number> {
    const due = await this.prisma.campaign.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
      select: { id: true },
    });
    for (const { id } of due) {
      await this.start(id).catch((error) =>
        this.logger.error(`Could not start campaign ${id}: ${String(error)}`),
      );
    }
    return due.length;
  }

  /** Campaigns whose enqueue was interrupted: finished, idempotently. */
  async resumeEnqueues(): Promise<void> {
    const stuck = await this.prisma.campaign.findMany({
      where: { status: 'SENDING', recipientCount: null },
      select: { id: true },
    });
    for (const { id } of stuck) {
      await this.enqueue(id).catch((error) =>
        this.logger.error(`Could not resume campaign ${id}: ${String(error)}`),
      );
    }
  }

  /**
   * Campaigns with nothing left waiting become SENT, and the team is told -
   * with the numbers, and with what "accepted" does and does not mean.
   */
  async completeFinished(): Promise<void> {
    const sending = await this.prisma.campaign.findMany({
      where: { status: 'SENDING', recipientCount: { not: null } },
    });
    for (const campaign of sending) {
      const waiting = await this.prisma.emailMessage.count({
        where: {
          campaignId: campaign.id,
          kind: 'campaign',
          status: { in: ['PENDING', 'SENDING'] },
        },
      });
      if (waiting > 0) continue;

      const { count } = await this.prisma.campaign.updateMany({
        where: { id: campaign.id, status: 'SENDING' },
        data: { status: 'SENT', completedAt: new Date() },
      });
      if (count === 1)
        await this.notifyCompleted(campaign).catch(() => undefined);
    }
  }

  private async notifyCompleted(campaign: Campaign): Promise<void> {
    if (!(await this.templates.get('campaign_completed')).isActive) return;
    const inbox = await this.settings.adminInbox();
    if (!inbox) return;
    const { counts } = await this.stats(campaign.id);
    const siteUrl = campaign.siteUrl ?? (await this.settings.requireSiteUrl());
    const email = await this.templates.render('campaign_completed', 'fr', {
      campaignName: campaign.name,
      sent: counts.SENT,
      failed: counts.FAILED,
      cancelled: counts.CANCELLED,
      campaignUrl: `${siteUrl}/admin/emails/campagnes?id=${campaign.id}`,
    });
    await this.queue.enqueue({
      kind: 'campaign_completed',
      purpose: 'notification',
      to: inbox,
      locale: 'fr',
      email,
      campaignId: campaign.id,
    });
  }
}

function validateBlocksOr400(input: unknown): Block[] {
  try {
    return validateBlocks(input);
  } catch (error) {
    throw new BadRequestException((error as Error).message);
  }
}
