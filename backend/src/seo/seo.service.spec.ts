import { SeoService, SITEMAP_LOCALES, addressFor } from './seo.service';
import type { PrismaService } from '../prisma/prisma.service';

const ORIGIN = 'https://ldslouga.sn';

/** Just enough of the news query to assert what the sitemap asks the database for. */
type FindMany = jest.Mock<
  Promise<unknown>,
  [
    {
      where: {
        isPublished: boolean;
        publishedAt: { not: null; lte: Date };
      };
    },
  ]
>;

const prismaWith = (
  articles: Array<{ slug: string; updatedAt: Date; publishedAt: Date }>,
) =>
  ({
    news: { findMany: jest.fn().mockResolvedValue(articles) },
  }) as unknown as PrismaService;

describe('SeoService', () => {
  describe('robots.txt', () => {
    it('states the sitemap as an absolute URL', () => {
      const robots = new SeoService(prismaWith([])).buildRobots(ORIGIN);

      /*
        This is the whole reason the file is generated. The Sitemap directive
        is the one line in the format that a relative path makes invalid, and
        `Sitemap: /sitemap.xml` is the single error Lighthouse was reporting.
      */
      expect(robots).toContain('Sitemap: https://ldslouga.sn/sitemap.xml');
      expect(robots).not.toMatch(/Sitemap:\s*\//);
    });

    it('keeps the administration and the API out', () => {
      const robots = new SeoService(prismaWith([])).buildRobots(ORIGIN);
      expect(robots).toContain('Disallow: /admin');
      expect(robots).toContain('Disallow: /api/');
      expect(robots).toContain('Allow: /');
    });
  });

  describe('sitemap.xml', () => {
    const article = {
      slug: 'une-ecole-a-louga',
      updatedAt: new Date('2026-03-04T10:00:00.000Z'),
      publishedAt: new Date('2026-03-01T10:00:00.000Z'),
    };

    it('writes every location as an absolute URL', async () => {
      const xml = await new SeoService(prismaWith([article])).buildSitemap(
        ORIGIN,
      );

      // A relative <loc> makes Google reject the document outright, which is
      // what the file shipped with the build contained.
      expect(xml).not.toMatch(/<loc>\//);
      for (const loc of xml.match(/<loc>([^<]*)<\/loc>/g) ?? []) {
        expect(loc).toContain('https://ldslouga.sn/');
      }
    });

    it('lists published articles, which a static file could never do', async () => {
      const xml = await new SeoService(prismaWith([article])).buildSitemap(
        ORIGIN,
      );
      expect(xml).toContain(
        '<loc>https://ldslouga.sn/actualites/une-ecole-a-louga</loc>',
      );
    });

    it('asks only for articles a visitor can actually open', async () => {
      const findMany = jest.fn().mockResolvedValue([]) as FindMany;
      await new SeoService({
        news: { findMany },
      } as unknown as PrismaService).buildSitemap(ORIGIN);

      // A sitemap that lists 404s is one Search Console reports as broken.
      const { where } = findMany.mock.calls[0][0];
      expect(where.isPublished).toBe(true);
      expect(where.publishedAt.not).toBeNull();
      expect(where.publishedAt.lte).toBeInstanceOf(Date);
    });

    it('publishes each page in both languages', async () => {
      const xml = await new SeoService(prismaWith([])).buildSitemap(ORIGIN);
      expect(xml).toContain('<loc>https://ldslouga.sn/contact</loc>');
      expect(xml).toContain('<loc>https://ldslouga.sn/contact?lang=ar</loc>');
    });

    it('gives every URL a return link to itself and to the other language', async () => {
      const xml = await new SeoService(prismaWith([])).buildSitemap(ORIGIN);

      // Google reports a page that omits its own hreflang as having no return
      // link, and drops the whole cluster.
      const block = xml.slice(
        xml.indexOf('<loc>https://ldslouga.sn/contact?lang=ar</loc>'),
      );
      const url = block.slice(0, block.indexOf('</url>'));
      for (const locale of SITEMAP_LOCALES) {
        expect(url).toContain(`hreflang="${locale}"`);
      }
      expect(url).toContain('hreflang="x-default"');
      expect(url).toContain('href="https://ldslouga.sn/contact?lang=ar"');
    });

    it('escapes the ampersand a query string would otherwise inject', () => {
      // `?lang=ar` is the only query the sitemap writes today, but a second
      // parameter would produce a raw & and an XML parse error.
      expect(addressFor(ORIGIN, '/x', 'ar')).toBe(
        'https://ldslouga.sn/x?lang=ar',
      );
    });

    it('never claims a modification date it cannot support', async () => {
      const xml = await new SeoService(prismaWith([])).buildSitemap(ORIGIN);

      // With no article, nothing in the site has a date we track, so the
      // document declares none rather than inventing today.
      expect(xml).not.toContain('<lastmod>');
    });

    it('dates the home page and the news index from the newest article', async () => {
      const xml = await new SeoService(prismaWith([article])).buildSitemap(
        ORIGIN,
      );
      expect(xml).toContain('<lastmod>2026-03-04T10:00:00.000Z</lastmod>');
    });

    it('keeps the administration out of the document', async () => {
      const xml = await new SeoService(prismaWith([article])).buildSitemap(
        ORIGIN,
      );
      expect(xml).not.toContain('/admin');
    });

    it('is well-formed XML with a single urlset', async () => {
      const xml = await new SeoService(prismaWith([article])).buildSitemap(
        ORIGIN,
      );
      expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(
        true,
      );
      expect((xml.match(/<urlset/g) ?? []).length).toBe(1);
      expect((xml.match(/<url>/g) ?? []).length).toBe(
        (xml.match(/<\/url>/g) ?? []).length,
      );
      expect((xml.match(/<loc>/g) ?? []).length).toBe(
        (xml.match(/<\/loc>/g) ?? []).length,
      );
    });
  });
});
