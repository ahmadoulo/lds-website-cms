import {
  PageShellService,
  escapeHtml,
  escapeJsonLd,
} from './page-shell.service';
import { PageMetaService } from './page-meta.service';
import type { PrismaService } from '../prisma/prisma.service';

const ORIGIN = 'https://ldslouga.sn';

/** The build output, reduced to the parts the renderer has to deal with. */
const SHELL = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Louga Développement Solidaire</title>
    <meta name="description" content="Une description générique." />
    <meta name="robots" content="index,follow" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Louga Développement Solidaire" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/logo-mark.png" />
  </head>
  <body><div id="root"></div><script type="module" src="/assets/index-abc.js"></script></body>
</html>`;

const ARTICLE = {
  title: { fr: 'Cantine scolaire solidaire', ar: 'مقصف مدرسي تضامني' },
  excerpt: { fr: 'Trois cents repas par jour.', ar: 'ثلاثمائة وجبة يوميًا.' },
  publishedAt: new Date('2026-03-01T10:00:00.000Z'),
  updatedAt: new Date('2026-03-04T10:00:00.000Z'),
  image: { id: 'media-1' },
};

/** The two reads the tests inspect, named beside the cast so `this` is never in play. */
interface Reads {
  readSettings: jest.Mock;
  readArticle: jest.Mock;
}

function prismaFake(
  article: typeof ARTICLE | null = ARTICLE,
  seo: unknown = undefined,
): PrismaService & Reads {
  const readSettings = jest.fn().mockResolvedValue(seo ? { value: seo } : null);
  const readArticle = jest.fn().mockResolvedValue(article);

  const prisma = {
    siteSettings: { findUnique: readSettings },
    news: { findFirst: readArticle },
    media: { findUnique: jest.fn().mockResolvedValue({ id: 'og-1' }) },
  } as unknown as PrismaService;

  return Object.assign(prisma, { readSettings, readArticle });
}

const render = async (
  path: string,
  locale: 'fr' | 'ar' = 'fr',
  prisma: PrismaService = prismaFake(),
) => {
  const meta = await new PageMetaService(prisma).resolve(path, locale, ORIGIN);
  return { html: new PageShellService().render(SHELL, meta), meta };
};

describe('escapeJsonLd', () => {
  it('cannot be used to close the script element', () => {
    // An article quoting some markup would otherwise end the element early
    // and drop the rest of the document in as HTML.
    const escaped = escapeJsonLd({
      headline: '</script><img src=x onerror=alert(1)>',
    });
    expect(escaped).not.toContain('</script>');
    expect(escaped).not.toContain('<img');
    expect(JSON.parse(escaped)).toEqual({
      headline: '</script><img src=x onerror=alert(1)>',
    });
  });
});

describe('escapeHtml', () => {
  it('cannot be used to break out of an attribute', () => {
    expect(escapeHtml('A "quoted" <title> & more')).toBe(
      'A &quot;quoted&quot; &lt;title&gt; &amp; more',
    );
  });
});

describe('page shell', () => {
  it('gives a static page its own title and description', async () => {
    const { html } = await render('/contact');

    expect(html).toContain(
      '<title data-lds-ssr>Contact — Louga Développement Solidaire</title>',
    );
    expect(html).toContain('Écrire à Louga Développement Solidaire');
  });

  it('gives an article its own title, description and image', async () => {
    // The whole point: Article A must preview as Article A.
    const { html } = await render('/actualites/cantine-scolaire-solidaire');

    expect(html).toContain(
      'Cantine scolaire solidaire — Louga Développement Solidaire',
    );
    expect(html).toContain('Trois cents repas par jour.');
    expect(html).toContain(
      '<meta property="og:image" content="https://ldslouga.sn/api/v1/media/media-1/file" data-lds-ssr />',
    );
    expect(html).toContain('content="article"');
  });

  it('writes the article in Arabic when Arabic is asked for', async () => {
    const { html } = await render(
      '/actualites/cantine-scolaire-solidaire',
      'ar',
    );

    expect(html).toContain('مقصف مدرسي تضامني');
    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html).toContain('content="ar_AR"');
    expect(html).toContain(
      'rel="canonical" href="https://ldslouga.sn/actualites/cantine-scolaire-solidaire?lang=ar"',
    );
  });

  it('leaves exactly one of every tag a crawler must not have to choose between', async () => {
    const { html } = await render('/contact');

    for (const pattern of [
      /<title[^>]*>/g,
      /<meta[^>]*name="description"/g,
      /<link[^>]*rel="canonical"/g,
      /<meta[^>]*property="og:title"/g,
      /<meta[^>]*name="twitter:card"/g,
      /<meta[^>]*name="robots"/g,
    ]) {
      expect(html.match(pattern) ?? []).toHaveLength(1);
    }
  });

  it('publishes both languages plus x-default on every page', async () => {
    const { html } = await render('/galerie');

    expect(html).toContain('hreflang="fr" href="https://ldslouga.sn/galerie"');
    expect(html).toContain(
      'hreflang="ar" href="https://ldslouga.sn/galerie?lang=ar"',
    );
    expect(html).toContain(
      'hreflang="x-default" href="https://ldslouga.sn/galerie"',
    );
  });

  it('carries Organization and WebSite everywhere, and the page itself', async () => {
    const { html } = await render('/impact');
    const documents = [
      ...html.matchAll(/application\/ld\+json[^>]*>(.*?)<\/script>/g),
    ].map((match) => JSON.parse(match[1]) as { '@type': string });

    expect(documents.map((document) => document['@type'])).toEqual([
      'Organization',
      'WebSite',
      'WebPage',
    ]);
  });

  it('describes an article from the CMS, inventing nothing', async () => {
    const { html } = await render('/actualites/cantine-scolaire-solidaire');
    const documents = [
      ...html.matchAll(/application\/ld\+json[^>]*>(.*?)<\/script>/g),
    ].map((match) => JSON.parse(match[1]) as Record<string, unknown>);

    const article = documents.find((d) => d['@type'] === 'NewsArticle')!;
    expect(article.headline).toBe('Cantine scolaire solidaire');
    expect(article.datePublished).toBe('2026-03-01T10:00:00.000Z');
    expect(article.dateModified).toBe('2026-03-04T10:00:00.000Z');
    expect(article.inLanguage).toBe('fr');
    // There is no author column on the model, so the association is named
    // rather than a person who is recorded nowhere.
    expect(article.author).toEqual({
      '@type': 'Organization',
      name: 'Louga Développement Solidaire',
      url: 'https://ldslouga.sn/',
    });

    const crumbs = documents.find((d) => d['@type'] === 'BreadcrumbList')!;
    expect(crumbs.itemListElement).toHaveLength(3);
  });

  it('answers 404 and asks not to be indexed for an address that is not a page', async () => {
    const { html, meta } = await render('/une-page-qui-nexiste-pas');

    // Answering 200 to every unknown path is how a site fills Search Console
    // with soft 404s.
    expect(meta.status).toBe(404);
    expect(html).toContain('content="noindex,nofollow"');
    expect(html).not.toContain('application/ld+json');
  });

  it('does the same for an article that is not published', async () => {
    const { meta, html } = await render(
      '/actualites/un-brouillon',
      'fr',
      prismaFake(null),
    );

    expect(meta.status).toBe(404);
    expect(html).toContain('content="noindex,nofollow"');
  });

  it('never serves a draft to a crawler', async () => {
    const prisma = prismaFake();
    await render('/contact', 'fr', prisma);

    expect(prisma.readArticle.mock.calls).toHaveLength(0);
    // The settings row is read for `value`, which is the published column;
    // `draftValue` is by definition not what the public site shows.
    expect(prisma.readSettings.mock.calls).toEqual([
      [{ where: { key: 'seo' } }],
    ]);
  });

  it('keeps the application markup untouched', async () => {
    const { html } = await render('/contact');

    // The shell still has to boot React: this is a metadata rewrite, not a
    // replacement for the single-page application.
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('/assets/index-abc.js');
    expect(html).toContain('rel="icon"');
  });

  it('prefers the administrator’s saved metadata over the shipped default', async () => {
    const prisma = prismaFake(null, {
      title: { fr: 'LDS', ar: 'ل.ت.ت' },
      pages: {
        '/contact': {
          title: { fr: 'Nous écrire' },
          description: { fr: 'Nos bureaux.' },
        },
      },
    });
    const { html } = await render('/contact', 'fr', prisma);

    expect(html).toContain('<title data-lds-ssr>Nous écrire — LDS</title>');
    expect(html).toContain('Nos bureaux.');
  });
});
