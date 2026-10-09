import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildMediaUrl } from '../common/media-url.interceptor';
import { DEFAULT_SETTINGS } from '../settings/settings.constants';
import { SITEMAP_LOCALES, DEFAULT_LOCALE, addressFor } from './seo.service';
import { bannerWhere, reachableNow } from '../news/announcement';

export type Locale = (typeof SITEMAP_LOCALES)[number];

type Localized = Partial<Record<Locale, string>> | null | undefined;

/**
 * Reads a translation, falling back to French.
 *
 * The strict resolver the frontend uses refuses to invent a translation,
 * because showing a visitor French text under an Arabic heading is a lie about
 * what has been translated. A crawler is a different reader: a page with no
 * title at all is worse than a page titled in the other language, and an empty
 * title is exactly what Search Console reports as a defect.
 */
export function readLocalized(value: Localized, locale: Locale): string {
  if (!value) return '';
  return value[locale] || value[DEFAULT_LOCALE] || '';
}

export interface PageMeta {
  locale: Locale;
  /** The address of this page in this language. */
  canonical: string;
  /** Every published language, plus x-default. */
  alternates: Array<{ hreflang: string; href: string }>;
  title: string;
  description: string;
  image: string | null;
  siteName: string;
  type: 'website' | 'article';
  noIndex: boolean;
  /** The HTTP status the shell should be served with. */
  status: 200 | 404;
  /** Schema.org documents, already shaped. The renderer serialises them. */
  jsonLd: Array<Record<string, unknown>>;
}

const ARTICLE_PREFIX = '/actualites/';

/** See resolve(): real, reachable, and never indexed. */
const PRIVATE_PAGES: Record<string, Localized> = {
  '/newsletter/confirmation': {
    fr: 'Confirmation d’inscription',
    ar: 'تأكيد الاشتراك',
  },
  '/newsletter/desinscription': { fr: 'Désinscription', ar: 'إلغاء الاشتراك' },
};

@Injectable()
export class PageMetaService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    path: string,
    locale: Locale,
    origin: string,
  ): Promise<PageMeta> {
    const seo = await this.seoSettings();
    const siteName =
      readLocalized(seo.title as Localized, locale) ||
      'Louga Développement Solidaire';
    const siteDescription = readLocalized(seo.description as Localized, locale);
    const defaultImage = await this.mediaUrl(
      seo.ogImageId as string | null,
      origin,
    );

    const base = {
      locale,
      canonical: addressFor(origin, path, locale),
      alternates: this.alternates(path, origin),
      siteName,
      image: defaultImage,
    };

    if (path.startsWith(ARTICLE_PREFIX)) {
      return this.article(
        path.slice(ARTICLE_PREFIX.length),
        { ...base, siteDescription },
        origin,
      );
    }

    const pages = seo.pages as
      Record<string, Record<string, Localized>> | undefined;
    const page = pages?.[path];

    /*
      Pages that exist but are one person's business: the link in their
      confirmation email, the link in their newsletter footer. They answer 200
      - they are real pages - and ask not to be indexed, so a search engine
      never lists someone's unsubscribe page.
    */
    if (PRIVATE_PAGES[path]) {
      const own = readLocalized(PRIVATE_PAGES[path], locale);
      return {
        ...base,
        title: `${own} — ${siteName}`,
        description: siteDescription,
        type: 'website',
        noIndex: true,
        status: 200,
        jsonLd: [],
      };
    }

    if (!page) {
      /*
        An address the router does not publish. The SPA draws its own 404 page
        as it always has; what is new is that the response says 404 and asks
        not to be indexed. Answering 200 to every unknown path is how a site
        accumulates soft 404s in Search Console.
      */
      return {
        ...base,
        title: siteName,
        description: siteDescription,
        type: 'website',
        noIndex: true,
        status: 404,
        jsonLd: [],
      };
    }

    const own = readLocalized(page.title, locale);
    return {
      ...base,
      title: own ? `${own} — ${siteName}` : siteName,
      description: readLocalized(page.description, locale) || siteDescription,
      type: 'website',
      noIndex: false,
      status: 200,
      jsonLd: this.siteGraph(
        origin,
        locale,
        siteName,
        siteDescription,
        path,
        own,
      ),
    };
  }

  /**
   * The banner's announcements, in the visitor's language, for the shell to
   * write into the HTML. Present on the first paint, so the banner never
   * pushes the page down after it has loaded.
   */
  async banner(locale: Locale): Promise<Array<{ id: string; slug: string; text: string; scope: string }>> {
    const rows = await this.prisma.news
      .findMany({
        where: bannerWhere(),
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
        take: 5,
        select: { id: true, slug: true, title: true, bannerText: true, bannerScope: true },
      })
      .catch(() => []);
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      text:
        readLocalized(row.bannerText as Localized, locale) ||
        readLocalized(row.title as Localized, locale),
      scope: row.bannerScope,
    }));
  }

  private alternates(path: string, origin: string) {
    return [
      ...SITEMAP_LOCALES.map((candidate) => ({
        hreflang: candidate,
        href: addressFor(origin, path, candidate),
      })),
      { hreflang: 'x-default', href: addressFor(origin, path, DEFAULT_LOCALE) },
    ];
  }

  private async seoSettings(): Promise<Record<string, unknown>> {
    const row = await this.prisma.siteSettings.findUnique({
      where: { key: 'seo' },
    });
    /*
      The published value, never the draft: a draft is by definition not what
      the public site shows, and a crawler is the public. Merged over the
      defaults so a section saved before `pages` existed still resolves.
    */
    const stored = (row?.value ?? {}) as Record<string, unknown>;
    return { ...DEFAULT_SETTINGS.seo, ...stored };
  }

  private async mediaUrl(
    id: string | null,
    origin: string,
  ): Promise<string | null> {
    if (!id) return null;
    const media = await this.prisma.media.findUnique({
      where: { id },
      select: { id: true },
    });
    return media ? buildMediaUrl(origin, media.id) : null;
  }

  private async article(
    slug: string,
    base: {
      locale: Locale;
      canonical: string;
      alternates: Array<{ hreflang: string; href: string }>;
      siteName: string;
      image: string | null;
      siteDescription: string;
    },
    origin: string,
  ): Promise<PageMeta> {
    const article = await this.prisma.news.findFirst({
      // Archived articles still answer: their address was shared.
      where: { AND: [{ slug }, reachableNow()] },
      select: {
        title: true,
        excerpt: true,
        publishedAt: true,
        updatedAt: true,
        archivedAt: true,
        eventStartsAt: true,
        eventEndsAt: true,
        location: true,
        image: { select: { id: true } },
      },
    });

    const { siteDescription, ...rest } = base;

    if (!article) {
      return {
        ...rest,
        title: rest.siteName,
        description: siteDescription,
        type: 'article',
        noIndex: true,
        status: 404,
        jsonLd: [],
      };
    }

    const title = readLocalized(article.title as Localized, base.locale);
    const description =
      readLocalized(article.excerpt as Localized, base.locale) ||
      siteDescription;
    /*
      The resized render, not the upload: share previews fetch this image, and
      WhatsApp drops a preview whose image is too heavy. Previews do not ask
      for WebP, so they are served a JPEG.
    */
    const image = article.image
      ? `${buildMediaUrl(origin, article.image.id)}?w=1280`
      : base.image;
    const place = readLocalized(article.location as Localized, base.locale);

    return {
      ...rest,
      title: title ? `${title} — ${rest.siteName}` : rest.siteName,
      description,
      image,
      type: 'article',
      // Archived: reachable, not indexed. It is no longer news.
      noIndex: Boolean(article.archivedAt),
      status: 200,
      jsonLd: [
        /*
          Event only for a real one: a date and a place the association
          entered. Nothing is inferred - no time, no organiser address, no
          ticket offer the page does not state.
        */
        ...(article.eventStartsAt && place
          ? [
              {
                '@context': 'https://schema.org',
                '@type': 'Event',
                name: title,
                description,
                startDate: article.eventStartsAt.toISOString(),
                ...(article.eventEndsAt ? { endDate: article.eventEndsAt.toISOString() } : {}),
                eventStatus: 'https://schema.org/EventScheduled',
                eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
                location: { '@type': 'Place', name: place, address: place },
                organizer: { '@type': 'Organization', name: rest.siteName, url: `${origin}/` },
                ...(image ? { image: [image] } : {}),
                url: rest.canonical,
              },
            ]
          : []),
        ...this.siteGraph(
          origin,
          base.locale,
          rest.siteName,
          siteDescription,
          null,
          null,
        ),
        {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: title,
          description,
          inLanguage: base.locale,
          url: rest.canonical,
          mainEntityOfPage: { '@type': 'WebPage', '@id': rest.canonical },
          // Only dates actually held. An article with no publication date is
          // not published, so this is always present by the time we are here.
          datePublished: article.publishedAt?.toISOString(),
          dateModified: (
            article.updatedAt ?? article.publishedAt
          )?.toISOString(),
          /*
            The association is the author. There is no author column on the
            model, and naming a person who is recorded nowhere would be
            inventing the one field Google prints under a byline.
          */
          author: {
            '@type': 'Organization',
            name: rest.siteName,
            url: `${origin}/`,
          },
          publisher: {
            '@type': 'Organization',
            name: rest.siteName,
            url: `${origin}/`,
          },
          ...(image ? { image: [image] } : {}),
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: rest.siteName,
              item: addressFor(origin, '/', base.locale),
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: base.locale === 'ar' ? 'الأخبار' : 'Actualités',
              item: addressFor(origin, '/actualites', base.locale),
            },
            { '@type': 'ListItem', position: 3, name: title },
          ],
        },
      ],
    };
  }

  /**
   * The two documents every page carries: who publishes the site, and what
   * site this is. Both are true of the whole domain, so they go out
   * everywhere rather than on the home page alone - which is what lets Google
   * attach them to whichever page it happens to crawl first.
   */
  private siteGraph(
    origin: string,
    locale: Locale,
    siteName: string,
    siteDescription: string,
    path: string | null,
    pageTitle: string | null,
  ): Array<Record<string, unknown>> {
    const graph: Array<Record<string, unknown>> = [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: siteName,
        url: `${origin}/`,
        ...(siteDescription ? { description: siteDescription } : {}),
        logo: `${origin}/logo-mark.png`,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteName,
        url: `${origin}/`,
        inLanguage: [...SITEMAP_LOCALES],
      },
    ];

    if (path && path !== '/') {
      graph.push({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: pageTitle || siteName,
        url: addressFor(origin, path, locale),
        inLanguage: locale,
        isPartOf: { '@type': 'WebSite', url: `${origin}/` },
      });
    }

    return graph;
  }
}
