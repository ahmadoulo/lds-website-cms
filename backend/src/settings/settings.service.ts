import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { DEFAULT_SETTINGS, SETTING_KEYS, type SettingKey } from './settings.constants';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Returns every known key as a flat object. Keys that have never been saved fall
   * back to their default, so the front end never has to guard against undefined.
   */
  async findAll() {
    const rows = await this.prisma.siteSettings.findMany();
    const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    const config: Record<string, any> = {};
    for (const key of SETTING_KEYS) {
      config[key] = { ...DEFAULT_SETTINGS[key], ...((stored[key] as object) ?? {}) };
    }

    return config;
  }

  async findOne(key: string) {
    this.assertKnownKey(key);
    const setting = await this.prisma.siteSettings.findUnique({ where: { key } });

    return {
      key,
      value: { ...DEFAULT_SETTINGS[key as SettingKey], ...((setting?.value as object) ?? {}) },
      updatedAt: setting?.updatedAt ?? null,
    };
  }

  async update(key: string, dto: UpdateSettingDto) {
    this.assertKnownKey(key);

    const existing = await this.prisma.siteSettings.findUnique({ where: { key } });
    // Merge so a form that only edits part of a section cannot wipe the rest.
    const merged = { ...((existing?.value as object) ?? {}), ...dto.value };

    return this.prisma.siteSettings.upsert({
      where: { key },
      update: { value: merged },
      create: { key, value: merged, type: 'json' },
    });
  }

  /**
   * Settings store media *ids*; the public site needs the file itself. This
   * resolves every configured image into the media object the interceptor then
   * decorates with a URL, so the front end never has to fetch them one by one.
   */
  async findAllWithMedia() {
    const config = await this.findAll();

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

  private assertKnownKey(key: string) {
    if (!(SETTING_KEYS as readonly string[]).includes(key)) {
      throw new BadRequestException(
        `Clé de paramètre inconnue "${key}". Valeurs acceptées : ${SETTING_KEYS.join(', ')}`,
      );
    }
  }
}
