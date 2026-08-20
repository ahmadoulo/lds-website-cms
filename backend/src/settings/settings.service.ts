import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { DEFAULT_SETTINGS, SETTING_KEYS, type SettingKey } from './settings.constants';

type SettingsRow = {
  key: string;
  value: unknown;
  draftValue: unknown;
  draftUpdatedAt: Date | null;
  publishedAt: Date | null;
  updatedAt: Date;
};

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * What visitors see: the published value only. A pending draft is ignored here,
   * which is the whole point of the draft layer.
   */
  async findAll() {
    return this.compose(await this.rows(), 'published');
  }

  /**
   * What the administration edits: the draft when one exists, the published value
   * otherwise, so reopening the form shows the work in progress.
   */
  async findAllForAdmin() {
    return this.compose(await this.rows(), 'draft');
  }

  /** Which sections have edits waiting to be published. */
  async getDraftStatus() {
    const rows = await this.rows();
    const pending = rows.filter((row) => row.draftValue !== null && row.draftValue !== undefined);

    return {
      hasUnpublishedChanges: pending.length > 0,
      keys: pending.map((row) => row.key),
      sections: Object.fromEntries(
        SETTING_KEYS.map((key) => {
          const row = rows.find((r) => r.key === key);
          return [
            key,
            {
              hasDraft: Boolean(row?.draftValue),
              draftUpdatedAt: row?.draftUpdatedAt ?? null,
              publishedAt: row?.publishedAt ?? null,
            },
          ];
        }),
      ),
    };
  }

  async findOne(key: string) {
    this.assertKnownKey(key);
    const row = await this.prisma.siteSettings.findUnique({ where: { key } });

    return {
      key,
      value: this.merge(key, row?.value),
      draft: row?.draftValue ? this.merge(key, row.draftValue) : null,
      hasDraft: Boolean(row?.draftValue),
      draftUpdatedAt: row?.draftUpdatedAt ?? null,
      publishedAt: row?.publishedAt ?? null,
    };
  }

  /**
   * Saves as a draft. Nothing reaches the public site until `publish` is called.
   * The payload is merged over the current draft so a form that edits one part of
   * a section cannot wipe the rest.
   */
  async update(key: string, dto: UpdateSettingDto) {
    this.assertKnownKey(key);

    const existing = await this.prisma.siteSettings.findUnique({ where: { key } });
    const base = (existing?.draftValue ?? existing?.value ?? {}) as object;
    const merged = { ...base, ...dto.value };

    await this.prisma.siteSettings.upsert({
      where: { key },
      update: { draftValue: merged, draftUpdatedAt: new Date() },
      create: {
        key,
        // A section edited before it was ever published starts from its defaults,
        // so discarding the draft cannot leave an empty published value behind.
        value: DEFAULT_SETTINGS[key as SettingKey],
        type: 'json',
        draftValue: merged,
        draftUpdatedAt: new Date(),
      },
    });

    return this.findOne(key);
  }

  /** Promotes the draft to the published value. */
  async publish(key: string) {
    this.assertKnownKey(key);

    const existing = await this.prisma.siteSettings.findUnique({ where: { key } });
    if (!existing?.draftValue) {
      throw new BadRequestException('Aucune modification en attente pour cette section.');
    }

    await this.prisma.siteSettings.update({
      where: { key },
      data: {
        value: existing.draftValue,
        draftValue: Prisma.DbNull,
        draftUpdatedAt: null,
        publishedAt: new Date(),
      },
    });

    return this.findOne(key);
  }

  /** Publishes every section that has a pending draft. */
  async publishAll() {
    const rows = await this.rows();
    const pending = rows.filter((row) => row.draftValue !== null && row.draftValue !== undefined);

    for (const row of pending) {
      await this.publish(row.key);
    }

    return { published: pending.map((row) => row.key) };
  }

  /** Throws the draft away and goes back to what is currently online. */
  async discard(key: string) {
    this.assertKnownKey(key);

    const existing = await this.prisma.siteSettings.findUnique({ where: { key } });
    if (!existing?.draftValue) {
      throw new BadRequestException('Aucune modification en attente pour cette section.');
    }

    await this.prisma.siteSettings.update({
      where: { key },
      data: { draftValue: Prisma.DbNull, draftUpdatedAt: null },
    });

    return this.findOne(key);
  }

  /**
   * Settings store media *ids*; the site needs the file itself. Resolving them
   * here means the front end never has to fetch each one separately.
   */
  async findAllWithMedia(source: 'published' | 'draft' = 'published') {
    const config = source === 'draft' ? await this.findAllForAdmin() : await this.findAll();

    const ids = [
      config.branding?.logoId,
      config.branding?.logoDarkId,
      config.branding?.faviconId,
      config.homepage?.heroImageId,
      config.homepage?.aboutImageId,
      config.homepage?.ctaImageId,
      config.seo?.ogImageId,
    ].filter((id): id is string => typeof id === 'string' && id.length > 0);

    if (ids.length === 0) return config;

    const media = await this.prisma.media.findMany({ where: { id: { in: ids } } });
    const byId = new Map(media.map((item) => [item.id, item]));

    config.branding = {
      ...config.branding,
      logo: byId.get(config.branding?.logoId) ?? null,
      logoDark: byId.get(config.branding?.logoDarkId) ?? null,
      favicon: byId.get(config.branding?.faviconId) ?? null,
    };
    config.homepage = {
      ...config.homepage,
      heroImage: byId.get(config.homepage?.heroImageId) ?? null,
      aboutImage: byId.get(config.homepage?.aboutImageId) ?? null,
      ctaImage: byId.get(config.homepage?.ctaImageId) ?? null,
    };
    config.seo = {
      ...config.seo,
      ogImage: byId.get(config.seo?.ogImageId) ?? null,
    };

    return config;
  }

  // ------------------------------------------------------------------ helpers

  private async rows(): Promise<SettingsRow[]> {
    return this.prisma.siteSettings.findMany() as unknown as Promise<SettingsRow[]>;
  }

  /** Fills in every known key, falling back to its defaults. */
  private compose(rows: SettingsRow[], source: 'published' | 'draft') {
    const config: Record<string, any> = {};

    for (const key of SETTING_KEYS) {
      const row = rows.find((r) => r.key === key);
      const raw = source === 'draft' ? (row?.draftValue ?? row?.value) : row?.value;
      config[key] = this.merge(key, raw);
    }

    return config;
  }

  private merge(key: string, raw: unknown) {
    return { ...DEFAULT_SETTINGS[key as SettingKey], ...((raw as object) ?? {}) };
  }

  private assertKnownKey(key: string) {
    if (!(SETTING_KEYS as readonly string[]).includes(key)) {
      throw new BadRequestException(
        `Clé de paramètre inconnue "${key}". Valeurs acceptées : ${SETTING_KEYS.join(', ')}`,
      );
    }
  }
}
