/**
 * The two languages the site is published in.
 *
 * French stays the default and the editorial source of truth. Anything that is
 * not exactly one of these - a stale bookmark, a hand-edited query string, a
 * browser reporting `ar-MA` - resolves back to French rather than being trusted.
 */
export const LOCALES = ['fr', 'ar'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'fr';

/** Where the choice survives a reload. */
export const LOCALE_STORAGE_KEY = 'lds.locale';

/** The query string that gives each language its own address. */
export const LOCALE_PARAM = 'lang';

export const DIRECTION: Record<Locale, 'ltr' | 'rtl'> = {
  fr: 'ltr',
  ar: 'rtl',
};

/** What the language is called in its own language. */
export const LOCALE_LABEL: Record<Locale, string> = {
  fr: 'Français',
  ar: 'العربية',
};

/** The short form used in a switch, where there is no room for the full name. */
export const LOCALE_SHORT: Record<Locale, string> = {
  fr: 'FR',
  ar: 'ع',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Coerces anything at all into a supported locale.
 *
 * `ar-MA`, `AR` and `ar` all mean Arabic; everything else means French. The
 * value is never used to index into anything before it has been through here,
 * which is what keeps a query string from reaching the rest of the app.
 */
export function normalizeLocale(value: unknown): Locale {
  if (typeof value !== 'string') return DEFAULT_LOCALE;
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(base) ? base : DEFAULT_LOCALE;
}

/**
 * The locale to start from, in the order the association asked for:
 * the address, then the remembered choice, then the browser, then French.
 *
 * Only the address can state Arabic explicitly, so a shared link always opens
 * in the language it was shared in, whatever the recipient last chose.
 */
export function detectLocale(options: {
  search?: string;
  stored?: string | null;
  languages?: readonly string[];
}): Locale {
  const { search = '', stored = null, languages = [] } = options;

  const fromUrl = new URLSearchParams(search).get(LOCALE_PARAM);
  if (fromUrl !== null && isLocale(normalizeLocale(fromUrl)) && normalizeLocale(fromUrl) !== DEFAULT_LOCALE) {
    return normalizeLocale(fromUrl);
  }
  // An explicit `?lang=fr` is still a choice, and outranks the stored one.
  if (fromUrl !== null) return normalizeLocale(fromUrl);

  if (stored && isLocale(stored)) return stored;

  for (const language of languages) {
    const normalized = normalizeLocale(language);
    // `normalizeLocale` answers French for anything unknown, so only a genuine
    // match counts - otherwise the first browser language would always win.
    if (normalized !== DEFAULT_LOCALE || language.toLowerCase().startsWith('fr')) {
      return normalized;
    }
  }

  return DEFAULT_LOCALE;
}
