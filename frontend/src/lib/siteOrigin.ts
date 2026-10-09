import { DEFAULT_LOCALE, LOCALE_PARAM, type Locale } from './i18n/locale';
import type { BannerItem } from './types';

/**
 * The site's public address, as the server wrote it.
 *
 * The server builds the canonical link from PUBLIC_SITE_URL - the official
 * domain, whatever host the request came through. The window's origin is
 * only where this visitor happens to be: a preview host, an IP, a tunnel.
 * Anything meant to leave the page - a shared link, a canonical - takes the
 * server's, read once before React rewrites the head.
 */
let captured: string | null = null;

export function captureSiteOrigin(): void {
  if (typeof document === 'undefined' || captured) return;
  const href = document.head
    .querySelector<HTMLLinkElement>('link[rel="canonical"][data-lds-ssr]')
    ?.getAttribute('href');
  try {
    if (href) captured = new URL(href).origin;
  } catch {
    // A malformed link is no address; the window's is used.
  }
}

export function siteOrigin(): string {
  if (captured) return captured;
  return typeof window === 'undefined' ? '' : window.location.origin;
}

/** An article's public address in a language, as the canonical builds it. */
export function articleAddress(slug: string, locale: Locale): string {
  const base = `${siteOrigin()}/actualites/${encodeURIComponent(slug)}`;
  return locale === DEFAULT_LOCALE ? base : `${base}?${LOCALE_PARAM}=${locale}`;
}

/**
 * The banner the server wrote into the page, for the first paint.
 * Read, not executed: the element is inert JSON.
 */
export function readServerBanner(): BannerItem[] | null {
  if (typeof document === 'undefined') return null;
  const element = document.getElementById('lds-banner');
  if (!element?.textContent) return null;
  try {
    const parsed: unknown = JSON.parse(element.textContent);
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is BannerItem =>
            typeof item?.id === 'string' && typeof item?.slug === 'string' && typeof item?.text === 'string',
        )
      : null;
  } catch {
    return null;
  }
}
