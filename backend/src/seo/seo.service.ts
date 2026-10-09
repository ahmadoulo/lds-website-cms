import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * The languages the public site is published in, and the query string each one
 * travels under. French is the default and carries no parameter, which is what
 * keeps the URLs already in circulation canonical.
 *
 * Mirrors `frontend/src/lib/i18n/locale.ts`. The two cannot import from each
 * other, so the pairing is asserted in `seo.service.spec.ts` against the same
 * literal the frontend uses.
 */
export const SITEMAP_LOCALES = ['fr', 'ar'] as const;
export const DEFAULT_LOCALE = 'fr';
const LOCALE_PARAM = 'lang';

interface StaticRoute {
  path: string;
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: string;
}

/**
 * Every public route the router answers, except the ones that must not be
 * indexed.
 *
 * `/actualites/:slug` is not here because it is not one URL: the published
 * articles are read from the database below. The admin tree is absent for the
 * same reason robots.txt disallows it.
 */
const STATIC_ROUTES: readonly StaticRoute[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/a-propos', changefreq: 'monthly', priority: '0.8' },
  { path: '/nos-actions', changefreq: 'monthly', priority: '0.8' },
  { path: '/actualites', changefreq: 'weekly', priority: '0.9' },
  { path: '/galerie', changefreq: 'monthly', priority: '0.7' },
  { path: '/impact', changefreq: 'monthly', priority: '0.7' },
  { path: '/partenaires', changefreq: 'monthly', priority: '0.6' },
  { path: '/nous-soutenir', changefreq: 'monthly', priority: '0.9' },
  { path: '/contact', changefreq: 'monthly', priority: '0.7' },
  { path: '/newsletter', changefreq: 'yearly', priority: '0.4' },
];

/** The five characters that are not allowed to appear raw in a sitemap URL. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function addressFor(
  origin: string,
  path: string,
  locale: string,
): string {
  const base = `${origin}${path}`;
  return locale === DEFAULT_LOCALE ? base : `${base}?${LOCALE_PARAM}=${locale}`;
}

interface SitemapEntry {
  path: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
}

@Injectable()
export class SeoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * robots.txt.
   *
   * The Sitemap directive is the reason this is generated rather than served
   * as a file: it is the one line in the format that a relative path makes
   * invalid, and the file shipped with the build carried `Sitemap:
   * /sitemap.xml`. Google rejects that line, which is the single error
   * Lighthouse reports.
   */
  buildRobots(origin: string): string {
    return [
      'User-agent: *',
      'Allow: /',
      '',
      '# The administration is not public content.',
      'Disallow: /admin',
      'Disallow: /admin/',
      '',
      '# The API answers JSON and media bytes, neither of which is a page.',
      'Disallow: /api/',
      '',
      `Sitemap: ${origin}/sitemap.xml`,
      '',
    ].join('\n');
  }

  async buildSitemap(origin: string): Promise<string> {
    const entries = await this.collect();

    const urls = entries
      .map((entry) => this.renderUrl(origin, entry))
      .join('\n');

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
      urls,
      '</urlset>',
      '',
    ].join('\n');
  }

  private async collect(): Promise<SitemapEntry[]> {
    /*
      Only what a visitor can actually open. An unpublished article, or one
      with a future publication date, answers 404 on the public site, and a
      sitemap that lists 404s is a sitemap Search Console reports as broken.
    */
    const articles = await this.prisma.news.findMany({
      // Archived articles keep their address but leave the sitemap.
      where: {
        isPublished: true,
        archivedAt: null,
        publishedAt: { not: null, lte: new Date() },
      },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
    });

    const newest = articles[0]?.updatedAt;

    return [
      ...STATIC_ROUTES.map((route) => ({
        ...route,
        /*
          lastmod is declared only where it is true. The home page and the news
          index genuinely change when an article does; the other static pages
          are rendered from settings whose modification date is not tracked per
          page, so claiming one would be inventing it - and a lastmod a crawler
          learns to distrust is worse than none.
        */
        lastmod:
          newest && (route.path === '/' || route.path === '/actualites')
            ? newest.toISOString()
            : undefined,
      })),
      ...articles.map((article) => ({
        path: `/actualites/${article.slug}`,
        changefreq: 'monthly',
        priority: '0.6',
        lastmod: (
          article.updatedAt ??
          article.publishedAt ??
          undefined
        )?.toISOString(),
      })),
    ];
  }

  /**
   * One `<url>` per page per language, each carrying the full set of
   * alternates including itself - which is what Google requires: a page that
   * does not list its own hreflang is one Search Console reports as having no
   * return link.
   */
  private renderUrl(origin: string, entry: SitemapEntry): string {
    const alternates = SITEMAP_LOCALES.map(
      (locale) =>
        `    <xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(
          addressFor(origin, entry.path, locale),
        )}" />`,
    )
      .concat(
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(
          addressFor(origin, entry.path, DEFAULT_LOCALE),
        )}" />`,
      )
      .join('\n');

    return SITEMAP_LOCALES.map((locale) =>
      [
        '  <url>',
        `    <loc>${escapeXml(addressFor(origin, entry.path, locale))}</loc>`,
        entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : null,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        alternates,
        '  </url>',
      ]
        .filter((line) => line !== null)
        .join('\n'),
    ).join('\n');
  }
}
