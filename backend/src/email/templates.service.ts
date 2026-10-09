import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import type { EmailTemplate, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { mergeLocalized } from '../common/sanitize';
import {
  DEFAULT_TEMPLATES,
  type TemplateDefinition,
  type TemplateKey,
} from './default-templates';
import {
  fill,
  fillSubject,
  frame,
  pick,
  variablesIn,
  type Locale,
  type Localized,
} from './render';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface TemplateView {
  key: TemplateKey;
  name: string;
  audience: TemplateDefinition['audience'];
  variables: Record<string, string>;
  subject: Localized;
  html: Localized;
  text: Localized;
  isActive: boolean;
  updatedAt: Date | null;
  /** Variables used in the text that the template does not provide. */
  unknownVariables: string[];
}

export interface TemplateInput {
  subject?: Localized;
  html?: Localized;
  text?: Localized;
  isActive?: boolean;
}

type Values = Record<string, string | number | null | undefined>;

@Injectable()
export class TemplatesService implements OnModuleInit {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Seeds the templates that do not exist yet. Never touches one that does:
   * an edited template is the association's text, and a deploy must not put
   * the shipped wording back over it.
   */
  async onModuleInit(): Promise<void> {
    try {
      for (const definition of Object.values(DEFAULT_TEMPLATES)) {
        await this.prisma.emailTemplate.upsert({
          where: { key: definition.key },
          create: {
            key: definition.key,
            name: definition.name,
            subject: definition.subject as Prisma.InputJsonValue,
            html: definition.html as Prisma.InputJsonValue,
            text: definition.text as Prisma.InputJsonValue,
          },
          update: {},
        });
      }
    } catch (error) {
      // The table may not exist yet on the very first boot, before migrations
      // have run. Rendering falls back to the shipped text in that case.
      this.logger.warn(`Could not seed email templates: ${String(error)}`);
    }
  }

  private definition(key: string): TemplateDefinition {
    const definition = DEFAULT_TEMPLATES[key as TemplateKey];
    if (!definition) throw new NotFoundException('Modèle inconnu');
    return definition;
  }

  private view(
    definition: TemplateDefinition,
    row: EmailTemplate | null,
  ): TemplateView {
    const subject = (row?.subject as Localized) ?? definition.subject;
    const html = (row?.html as Localized) ?? definition.html;
    const text = (row?.text as Localized) ?? definition.text;

    const used = new Set<string>();
    for (const localized of [subject, html, text]) {
      for (const value of Object.values(localized ?? {})) {
        for (const name of variablesIn(value ?? '')) used.add(name);
      }
    }

    return {
      key: definition.key,
      name: definition.name,
      audience: definition.audience,
      variables: definition.variables,
      subject,
      html,
      text,
      isActive: row?.isActive ?? true,
      updatedAt: row?.updatedAt ?? null,
      unknownVariables: [...used].filter(
        (name) => !(name in definition.variables),
      ),
    };
  }

  async list(): Promise<TemplateView[]> {
    const rows = await this.prisma.emailTemplate.findMany();
    const byKey = new Map(rows.map((row) => [row.key, row]));
    return Object.values(DEFAULT_TEMPLATES).map((definition) =>
      this.view(definition, byKey.get(definition.key) ?? null),
    );
  }

  async get(key: string): Promise<TemplateView> {
    const definition = this.definition(key);
    const row = await this.prisma.emailTemplate
      .findUnique({ where: { key } })
      .catch(() => null);
    return this.view(definition, row);
  }

  async update(key: string, input: TemplateInput): Promise<TemplateView> {
    const definition = this.definition(key);
    const current = await this.get(key);

    // Merged per language, like every other bilingual field: a form showing
    // only the French must not wipe the Arabic.
    const subject = input.subject
      ? mergeLocalized(current.subject, input.subject)
      : current.subject;
    const html = input.html
      ? mergeLocalized(current.html, input.html)
      : current.html;
    const text = input.text
      ? mergeLocalized(current.text, input.text)
      : current.text;

    // French is what every other language falls back to, so it can never be
    // emptied: an email with no subject is one a provider marks as spam.
    if (!(subject as Localized)?.fr?.trim()) {
      throw new BadRequestException("L'objet en français est obligatoire.");
    }
    if (!(html as Localized)?.fr?.trim()) {
      throw new BadRequestException('Le contenu en français est obligatoire.');
    }

    for (const value of Object.values(
      (subject ?? {}) as Record<string, string>,
    )) {
      if (/[\r\n]/.test(value)) {
        throw new BadRequestException(
          "L'objet ne peut pas contenir de retour à la ligne.",
        );
      }
    }

    const row = await this.prisma.emailTemplate.upsert({
      where: { key },
      create: {
        key,
        name: definition.name,
        subject: subject as Prisma.InputJsonValue,
        html: html as Prisma.InputJsonValue,
        text: text as Prisma.InputJsonValue,
        isActive: input.isActive ?? true,
      },
      update: {
        subject: subject as Prisma.InputJsonValue,
        html: html as Prisma.InputJsonValue,
        text: text as Prisma.InputJsonValue,
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    return this.view(definition, row);
  }

  /** Puts the shipped text back, on request. */
  async reset(key: string): Promise<TemplateView> {
    const definition = this.definition(key);
    const row = await this.prisma.emailTemplate.upsert({
      where: { key },
      create: {
        key,
        name: definition.name,
        subject: definition.subject as Prisma.InputJsonValue,
        html: definition.html as Prisma.InputJsonValue,
        text: definition.text as Prisma.InputJsonValue,
      },
      update: {
        subject: definition.subject as Prisma.InputJsonValue,
        html: definition.html as Prisma.InputJsonValue,
        text: definition.text as Prisma.InputJsonValue,
      },
    });
    return this.view(definition, row);
  }

  /**
   * The template as it would be sent, with example values in every variable.
   *
   * Unsaved text can be passed in, so the editor shows what it is about to
   * save rather than what is stored. The examples are plainly examples - an
   * administrator previewing must not wonder whether "Awa Diop" is a real
   * request.
   */
  async preview(
    key: string,
    locale: Locale,
    draft: TemplateInput = {},
  ): Promise<RenderedEmail> {
    const definition = this.definition(key);
    const stored = await this.get(key);
    const merged: TemplateView = {
      ...stored,
      subject: draft.subject
        ? mergeLocalized(stored.subject, draft.subject)
        : stored.subject,
      html: draft.html ? mergeLocalized(stored.html, draft.html) : stored.html,
      text: draft.text ? mergeLocalized(stored.text, draft.text) : stored.text,
    };

    const site = await this.siteValues();
    const now = new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Africa/Dakar',
    }).format(new Date());

    const examples: Values = {
      firstName: 'Awa',
      name: 'Awa Diop (exemple)',
      email: 'exemple@example.com',
      subject: 'Exemple : question sur le bénévolat',
      message: [
        "Ceci est un message d'exemple.",
        "Il s'affiche sur plusieurs lignes.",
      ].join('\n'),
      receivedAt: now,
      sentAt: now,
      adminUrl: `${site.siteUrl}/admin/messages`,
    };
    const values: Values = Object.fromEntries(
      Object.keys(definition.variables).map((name) => [
        name,
        examples[name] ?? `{{${name}}}`,
      ]),
    );

    return this.renderView(merged, locale, values, site, {});
  }

  /** The values every template can use, read from the site's own settings. */
  async siteValues(): Promise<{
    siteName: string;
    siteUrl: string;
    address: string | null;
    logoUrl: string | null;
  }> {
    const config = (await this.settings.findAll().catch(() => ({}))) as Record<
      string,
      Record<string, unknown>
    >;
    const siteUrl = (
      process.env.PUBLIC_SITE_URL?.trim() || 'https://ldslouga.sn'
    ).replace(/\/+$/, '');
    const address = config.global_contact?.address as
      Localized | string | undefined;

    return {
      siteName:
        (config.organization?.name as string) ||
        'Louga Développement Solidaire',
      siteUrl,
      address:
        typeof address === 'string' ? address : pick(address, 'fr') || null,
      // The mark shipped with the site, at a stable public address: an email
      // is read long after it was sent, and media URLs are not promised to
      // live that long.
      logoUrl: `${siteUrl}/logo-mark.png`,
    };
  }

  /**
   * A template, filled and framed, ready to queue.
   *
   * Every caller-supplied value is escaped into the HTML by `fill`. The site's
   * own values are added last so a caller cannot override the site name or
   * address by passing one in.
   */
  async render(
    key: TemplateKey,
    locale: Locale,
    values: Values,
    options: { unsubscribeUrl?: string | null } = {},
  ): Promise<RenderedEmail> {
    return this.renderView(
      await this.get(key),
      locale,
      values,
      await this.siteValues(),
      options,
    );
  }

  /**
   * Every caller-supplied value is escaped into the HTML by `fill`. The site's
   * own values are added last, so a caller cannot override the site name or
   * address by passing one in.
   */
  private renderView(
    template: TemplateView,
    locale: Locale,
    values: Values,
    site: Awaited<ReturnType<TemplatesService['siteValues']>>,
    options: { unsubscribeUrl?: string | null },
  ): RenderedEmail {
    const all: Values = {
      ...values,
      siteName: site.siteName,
      siteUrl: site.siteUrl,
    };

    // The language the body is actually written in. A template with no Arabic
    // falls back to French, and is then laid out as French.
    const effective: Locale = template.html?.[locale]?.trim() ? locale : 'fr';
    const body = fill(pick(template.html, effective), all, 'html');

    return {
      subject: fillSubject(pick(template.subject, effective), all),
      html: frame(body, {
        siteName: site.siteName,
        siteUrl: site.siteUrl,
        logoUrl: site.logoUrl,
        address: site.address,
        unsubscribeUrl: options.unsubscribeUrl ?? null,
        locale: effective,
      }),
      text: fill(pick(template.text, effective), all, 'text'),
    };
  }
}
