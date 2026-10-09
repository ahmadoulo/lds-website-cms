import { configuredSiteUrl, normaliseSiteUrl } from '../common/site-url';
import {
  EmailSettingsService,
  SiteUrlMissingError,
} from './email-settings.service';
import { TemplatesService } from './templates.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SettingsService } from '../settings/settings.service';

function settingsWith(row: Record<string, unknown> | null) {
  let current = row;
  return new EmailSettingsService({
    emailSettings: {
      findUnique: () => Promise.resolve(current),
      upsert: ({ create, update }: { create: object; update: object }) => {
        current = current ? { ...current, ...update } : { ...create };
        return Promise.resolve(current);
      },
    },
  } as unknown as PrismaService);
}

describe('the site address emails link to', () => {
  const previous = process.env.PUBLIC_SITE_URL;
  afterEach(() => {
    if (previous === undefined) delete process.env.PUBLIC_SITE_URL;
    else process.env.PUBLIC_SITE_URL = previous;
  });

  describe('normaliseSiteUrl', () => {
    it('keeps only the origin', () => {
      expect(normaliseSiteUrl('https://ldslouga.sn/')).toBe(
        'https://ldslouga.sn',
      );
      expect(normaliseSiteUrl('  https://ldslouga.sn/contact?x=1  ')).toBe(
        'https://ldslouga.sn',
      );
      expect(normaliseSiteUrl('http://localhost:8096')).toBe(
        'http://localhost:8096',
      );
    });

    it('refuses anything that is not a plain http(s) origin', () => {
      for (const bad of [
        'javascript:alert(1)',
        'ldslouga.sn',
        'ftp://ldslouga.sn',
        'https://user:pass@ldslouga.sn',
        '',
        null,
        undefined,
      ]) {
        expect(normaliseSiteUrl(bad)).toBeNull();
      }
    });
  });

  it('prefers the deployment’s PUBLIC_SITE_URL over the saved one', async () => {
    process.env.PUBLIC_SITE_URL = 'https://ldslouga.sn';
    const service = settingsWith({
      id: 'default',
      siteUrl: 'https://autre.example',
    });
    expect(await service.siteUrl()).toBe('https://ldslouga.sn');
  });

  it('uses the saved address when the deployment sets none', async () => {
    delete process.env.PUBLIC_SITE_URL;
    expect(configuredSiteUrl()).toBeNull();
    const service = settingsWith({
      id: 'default',
      siteUrl: 'https://ldslouga.sn',
    });
    expect(await service.siteUrl()).toBe('https://ldslouga.sn');
  });

  it('refuses to switch sending on without an address', async () => {
    delete process.env.PUBLIC_SITE_URL;
    const service = settingsWith(null);
    await expect(
      service.update({
        enabled: true,
        host: 'smtp.example.com',
        port: 587,
        fromEmail: 'contact@ldslouga.sn',
      }),
    ).rejects.toThrow(/adresse publique du site/);
  });

  it('stores the address normalised, and refuses one with a path', async () => {
    delete process.env.PUBLIC_SITE_URL;
    const service = settingsWith(null);
    expect(
      (await service.update({ siteUrl: 'https://ldslouga.sn/' })).siteUrl,
    ).toBe('https://ldslouga.sn');
    await expect(
      service.update({ siteUrl: 'javascript:alert(1)' }),
    ).rejects.toThrow();
  });

  describe('templates', () => {
    const templatesFor = (siteUrl: string | null) =>
      new TemplatesService(
        {} as PrismaService,
        { findAll: () => Promise.resolve({}) } as unknown as SettingsService,
        settingsWith(siteUrl ? { id: 'default', siteUrl } : null),
      );

    it('never fall back to a literal domain', async () => {
      // A wrong link in a sent email is worse than an email that waits until
      // the address is configured.
      delete process.env.PUBLIC_SITE_URL;
      await expect(templatesFor(null).siteValues()).rejects.toThrow(
        SiteUrlMissingError,
      );
    });

    it('link to the configured address, logo included', async () => {
      delete process.env.PUBLIC_SITE_URL;
      const site = await templatesFor('https://ldslouga.sn').siteValues();
      expect(site.siteUrl).toBe('https://ldslouga.sn');
      expect(site.logoUrl).toBe('https://ldslouga.sn/logo-mark.png');
    });

    it('accept the administrator’s origin for a preview only when nothing is configured', async () => {
      delete process.env.PUBLIC_SITE_URL;
      expect(
        (await templatesFor(null).siteValues('https://preview.example'))
          .siteUrl,
      ).toBe('https://preview.example');
      // Configured wins over the fallback, always.
      expect(
        (
          await templatesFor('https://ldslouga.sn').siteValues(
            'https://preview.example',
          )
        ).siteUrl,
      ).toBe('https://ldslouga.sn');
    });
  });
});
