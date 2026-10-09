import { Injectable, Logger } from '@nestjs/common';
import type { PageMeta } from './page-meta.service';

/** What Facebook and LinkedIn expect in og:locale, per published language. */
const OG_LOCALES: Record<string, string> = { fr: 'fr_FR', ar: 'ar_AR' };

const DIRECTION: Record<string, string> = { fr: 'ltr', ar: 'rtl' };

/** The five characters that must not reach an HTML attribute raw. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * JSON inside a script element is not JSON in a string context.
 *
 * `</script>` anywhere in a value - an article quoting some HTML, say - ends
 * the element early and drops the rest of the page into the document as
 * markup. Escaping the slash is the standard answer and leaves the JSON valid.
 */
export function escapeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/**
 * Everything between the head's own tags that depends on which page this is.
 *
 * The build-time index.html carries a generic set of these for the home page.
 * They are stripped before this is inserted, so a crawler never sees two
 * titles or two canonicals and have to guess which one counts.
 */
const MANAGED = 'data-lds-ssr';

const STRIP_PATTERNS: RegExp[] = [
  /<title>[\s\S]*?<\/title>/gi,
  /<meta\s+name="description"[^>]*>/gi,
  /<meta\s+name="robots"[^>]*>/gi,
  /<meta\s+name="keywords"[^>]*>/gi,
  /<meta\s+property="og:[^"]*"[^>]*>/gi,
  /<meta\s+name="twitter:[^"]*"[^>]*>/gi,
  /<link\s+rel="canonical"[^>]*>/gi,
  /<link\s+rel="alternate"[^>]*>/gi,
];

@Injectable()
export class PageShellService {
  private readonly logger = new Logger(PageShellService.name);

  /**
   * Where the built index.html is read from.
   *
   * nginx and the API are different containers, so the shell is fetched over
   * the Docker network rather than read from disk. Copying it into this image
   * at build time would freeze the asset hashes and serve a page pointing at
   * JavaScript that no longer exists after the next frontend deploy.
   */
  private readonly origin =
    process.env.FRONTEND_ORIGIN?.trim() || 'http://frontend';

  private cached: { html: string; at: number } | null = null;

  /**
   * A minute.
   *
   * Long enough that the fetch is not on the critical path of every page view,
   * short enough that a deploy is picked up without restarting the API. The
   * window is the only time a visitor could be served the previous build's
   * asset hashes, and those files are still on disk until the container is
   * replaced.
   */
  private readonly ttlMs = 60_000;

  async shell(): Promise<string> {
    const now = Date.now();
    if (this.cached && now - this.cached.at < this.ttlMs)
      return this.cached.html;

    const response = await fetch(`${this.origin}/index.html`, {
      signal: AbortSignal.timeout(3000),
      headers: { Accept: 'text/html' },
    });
    if (!response.ok) throw new Error(`Shell responded ${response.status}`);

    const html = await response.text();
    if (!html.includes('</head>'))
      throw new Error('Shell has no head to write into');

    this.cached = { html, at: now };
    return html;
  }

  /** Drops the cache, so a deploy can be picked up without waiting out the TTL. */
  invalidate(): void {
    this.cached = null;
  }

  render(shell: string, meta: PageMeta, banner: unknown[] = []): string {
    const head = this.head(meta);

    let html = shell;
    for (const pattern of STRIP_PATTERNS) html = html.replace(pattern, '');

    /*
      lang and dir are set here as well as by the client.

      The client owns them once React is running; before that there is no
      client, and a crawler - or a screen reader on a slow connection - reads
      an Arabic page declared as French.
    */
    html = html.replace(
      /<html[^>]*>/i,
      `<html lang="${meta.locale}" dir="${DIRECTION[meta.locale] ?? 'ltr'}">`,
    );

    /*
      The banner's data, for the client to render on its first paint. A
      script element of type application/json is inert - no browser runs it,
      and the Content-Security-Policy does not apply to it - and escapeJsonLd
      keeps a title containing "</script>" from ending it early.
    */
    const data = banner.length
      ? `\n    <script type="application/json" id="lds-banner" ${MANAGED}>${escapeJsonLd(banner)}</script>`
      : '';

    return html.replace('</head>', `${head}${data}\n  </head>`);
  }

  private head(meta: PageMeta): string {
    const tag = (markup: string) => `    ${markup}`;
    const metaTag = (
      attribute: 'name' | 'property',
      key: string,
      content: string,
    ) =>
      tag(
        `<meta ${attribute}="${key}" content="${escapeHtml(content)}" ${MANAGED} />`,
      );

    const lines: string[] = [
      tag(`<title ${MANAGED}>${escapeHtml(meta.title)}</title>`),
      metaTag(
        'name',
        'robots',
        meta.noIndex ? 'noindex,nofollow' : 'index,follow',
      ),
    ];

    if (meta.description)
      lines.push(metaTag('name', 'description', meta.description));

    lines.push(
      tag(
        `<link rel="canonical" href="${escapeHtml(meta.canonical)}" ${MANAGED} />`,
      ),
      ...meta.alternates.map(({ hreflang, href }) =>
        tag(
          `<link rel="alternate" hreflang="${hreflang}" href="${escapeHtml(href)}" ${MANAGED} />`,
        ),
      ),
      metaTag('property', 'og:type', meta.type),
      metaTag('property', 'og:site_name', meta.siteName),
      metaTag('property', 'og:title', meta.title),
      metaTag('property', 'og:url', meta.canonical),
      metaTag('property', 'og:locale', OG_LOCALES[meta.locale] ?? 'fr_FR'),
    );

    if (meta.description) {
      lines.push(metaTag('property', 'og:description', meta.description));
      lines.push(metaTag('name', 'twitter:description', meta.description));
    }

    lines.push(
      metaTag('name', 'twitter:title', meta.title),
      // summary_large_image with no image renders as an empty grey card, so
      // the card type follows whether there is one.
      metaTag(
        'name',
        'twitter:card',
        meta.image ? 'summary_large_image' : 'summary',
      ),
    );

    if (meta.image) {
      lines.push(metaTag('property', 'og:image', meta.image));
      lines.push(metaTag('name', 'twitter:image', meta.image));
    }

    for (const document of meta.jsonLd) {
      lines.push(
        tag(
          `<script type="application/ld+json" ${MANAGED}>${escapeJsonLd(document)}</script>`,
        ),
      );
    }

    return lines.join('\n');
  }

  /** Logged once per failure so a broken shell fetch is visible in the logs. */
  warn(error: unknown): void {
    this.logger.warn(`Could not render the page shell: ${String(error)}`);
  }
}
