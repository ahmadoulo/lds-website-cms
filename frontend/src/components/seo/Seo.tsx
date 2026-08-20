import { useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';

interface SeoProps {
  title?: string;
  description?: string;
  /** Absolute URL of the image used for social previews. */
  image?: string | null;
  /** Set on pages that must not be indexed. */
  noIndex?: boolean;
  type?: 'website' | 'article';
}

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
 * Sets the document title and the meta/Open Graph tags for the current page.
 * Values fall back to the site-wide SEO settings managed from the admin.
 */
export const Seo = ({ title, description, image, noIndex, type = 'website' }: SeoProps) => {
  const { settings } = useSettings();

  const siteName = settings?.seo.title || 'Louga Développement Solidaire';
  const fullTitle = title ? `${title} — ${siteName}` : siteName;
  const metaDescription = description || settings?.seo.description || '';
  const canonical = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '';
  const shareImage = image ?? settings?.seo.ogImage?.url ?? null;

  useEffect(() => {
    document.title = fullTitle;

    setMeta('meta[name="description"]', 'name', 'description', metaDescription);
    setMeta('meta[name="robots"]', 'name', 'robots', noIndex ? 'noindex,nofollow' : 'index,follow');

    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', metaDescription);
    setMeta('meta[property="og:type"]', 'property', 'og:type', type);
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', siteName);
    setMeta('meta[property="og:locale"]', 'property', 'og:locale', 'fr_FR');
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
  }, [fullTitle, metaDescription, shareImage, noIndex, type, siteName, canonical]);

  return null;
};
