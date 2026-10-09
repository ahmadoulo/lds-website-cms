import { useEffect } from 'react';
import { localized, localizedOrSource } from '../../lib/i18n/resolve';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { DEFAULT_LOCALE, LOCALES, LOCALE_PARAM, type Locale } from '../../lib/i18n/locale';
import { useShellLocale } from '../../lib/i18n/dictionaries/adminShell';
import { useShellT } from '../../lib/i18n/useT';
import { siteOrigin } from '../../lib/siteOrigin';

interface SeoProps {
  title?: string;
  description?: string;
  /** Absolute URL of the image used for social previews. */
  image?: string | null;
  /** Set on pages that must not be indexed. */
  noIndex?: boolean;
  type?: 'website' | 'article';
}

/** What Facebook and LinkedIn expect in og:locale, per published language. */
const OG_LOCALES: Record<Locale, string> = {
  fr: 'fr_FR',
  ar: 'ar_AR',
};

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setCanonical(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

/**
 * One `link rel="alternate"` per language, kept in place across navigations.
 *
 * Matched on `hreflang` rather than appended, because this is a single-page
 * application: the tags outlive the route they were written for, and a second
 * set would leave a crawler with two answers for the same language.
 */
function setAlternate(hreflang: string, url: string) {
  let link = document.head.querySelector<HTMLLinkElement>(
    `link[rel="alternate"][hreflang="${hreflang}"]`,
  );
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'alternate');
    link.setAttribute('hreflang', hreflang);
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

/**
 * The address a page has in one language.
 *
 * French travels without a parameter, exactly as the language switch builds its
 * links, so the URLs already in circulation stay the canonical French ones and
 * Arabic gets a `?lang=ar` of its own. Everything else in the query string is
 * dropped: a filter or a page number is not a different document.
 */
function addressFor(which: Locale, origin: string, path: string): string {
  if (!origin) return '';
  const base = `${origin}${path}`;
  return which === DEFAULT_LOCALE ? base : `${base}?${LOCALE_PARAM}=${which}`;
}

/**
 * Sets the document title and the meta/Open Graph tags for the current page.
 * Values fall back to the site-wide SEO settings managed from the admin.
 *
 * Each language has an address of its own, so each page is published twice: the
 * canonical URL carries the language being read, and the alternates tell a
 * crawler where the other one is. `<html lang>` and `dir` are not touched here
 * - the LocaleProvider owns them, and owning them in two places is how they end
 * up disagreeing.
 */
export const Seo = ({ title, description, image, noIndex, type = 'website' }: SeoProps) => {
  const { settings } = useSettings();
  const { locale } = useShellLocale();
  const t = useShellT();

  /* The SEO settings carry both languages now: an Arabic page indexed under
     a French title is an Arabic page nobody finds. */
  const siteName = localized(settings?.seo.title, locale) || t.common.organizationName;

  const location = useLocation();
  const path = location.pathname;

  /*
    The saved metadata for this exact route, when there is one.

    The server writes these same values into the HTML before it leaves, so a
    crawler and a visitor who navigated here from another page have to agree -
    a title that changes after hydration is a title Google may report as
    cloaking, and is certainly one nobody can reason about. The props stay as
    the fallback for routes with no entry, the article page above all, which
    passes its own.
  */
  const saved = settings?.seo.pages?.[path];
  const ownTitle = localizedOrSource(saved?.title, locale).text || title;
  const ownDescription = localizedOrSource(saved?.description, locale).text || description;

  const fullTitle = ownTitle ? `${ownTitle} — ${siteName}` : siteName;
  const metaDescription =
    ownDescription || localized(settings?.seo.description, locale) || '';
  const shareImage = image ?? settings?.seo.ogImage?.url ?? null;

  /*
    The path comes from the router, not from window.location.
    The two agree in a browser, because pushState rewrites the address bar, but
    reading the window made the canonical and the alternates depend on
    something outside React's knowledge: they could not be asserted at all, and
    nothing would have caught them drifting during a transition. The origin
    is the one the server wrote (PUBLIC_SITE_URL), so the canonical does not
    switch to a preview host after hydration; the window's is the fallback.
  */
  const origin = siteOrigin();

  useEffect(() => {
    const canonical = addressFor(locale, origin, path);

    document.title = fullTitle;

    setMeta('meta[name="description"]', 'name', 'description', metaDescription);
    setMeta('meta[name="robots"]', 'name', 'robots', noIndex ? 'noindex,nofollow' : 'index,follow');

    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', metaDescription);
    setMeta('meta[property="og:type"]', 'property', 'og:type', type);
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', siteName);
    setMeta('meta[property="og:locale"]', 'property', 'og:locale', OG_LOCALES[locale]);

    const other = LOCALES.filter((candidate) => candidate !== locale).map(
      (candidate) => OG_LOCALES[candidate],
    );
    if (other.length) {
      setMeta(
        'meta[property="og:locale:alternate"]',
        'property',
        'og:locale:alternate',
        other.join(','),
      );
    }

    if (canonical) setMeta('meta[property="og:url"]', 'property', 'og:url', canonical);

    setMeta(
      'meta[name="twitter:card"]',
      'name',
      'twitter:card',
      shareImage ? 'summary_large_image' : 'summary',
    );
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', metaDescription);

    if (shareImage) {
      setMeta('meta[property="og:image"]', 'property', 'og:image', shareImage);
      setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', shareImage);
    }

    if (canonical) setCanonical(canonical);

    for (const candidate of LOCALES) {
      const url = addressFor(candidate, origin, path);
      if (url) setAlternate(candidate, url);
    }
    // What a crawler with no language preference is served: French, the
    // language the association writes in.
    const fallback = addressFor(DEFAULT_LOCALE, origin, path);
    if (fallback) setAlternate('x-default', fallback);
  }, [fullTitle, metaDescription, shareImage, noIndex, type, siteName, locale, origin, path]);

  return null;
};
