import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_LOCALE,
  DIRECTION,
  LOCALE_PARAM,
  LOCALE_STORAGE_KEY,
  detectLocale,
  normalizeLocale,
  type Locale,
} from '../lib/i18n/locale';

interface LocaleContextValue {
  locale: Locale;
  direction: 'ltr' | 'rtl';
  isRtl: boolean;
  setLocale: (next: Locale) => void;
  /** The current address carrying a given language, for the switch and hreflang. */
  hrefFor: (next: Locale) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

function read(key: string): string | null {
  // A private window, cleared site data or a browser set to block storage all
  // throw here rather than returning null.
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The choice still holds for this page: the address carries it.
  }
}

/**
 * Builds the current address with an explicit language.
 *
 * French is the default, so it travels without a parameter and the existing
 * URLs stay exactly as they are; Arabic adds `?lang=ar`, which is what gives it
 * an address of its own for hreflang and for sharing.
 */
function urlFor(next: Locale, location: { pathname: string; search: string; hash: string }) {
  const params = new URLSearchParams(location.search);
  if (next === DEFAULT_LOCALE) params.delete(LOCALE_PARAM);
  else params.set(LOCALE_PARAM, next);

  const query = params.toString();
  return `${location.pathname}${query ? `?${query}` : ''}${location.hash}`;
}

export const LocaleProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return DEFAULT_LOCALE;
    return detectLocale({
      search: window.location.search,
      stored: read(LOCALE_STORAGE_KEY),
      languages: window.navigator.languages ?? [window.navigator.language],
    });
  });

  /*
    The address is the source of truth once the page is open: a link shared in
    Arabic must open in Arabic, and the browser's back button must change the
    language back with the page. Reading it on every navigation is what makes
    that work without the router knowing about languages at all.
  */
  useEffect(() => {
    const sync = () => {
      const fromUrl = new URLSearchParams(window.location.search).get(LOCALE_PARAM);
      setLocaleState(fromUrl === null ? (read(LOCALE_STORAGE_KEY) as Locale) ?? DEFAULT_LOCALE : normalizeLocale(fromUrl));
    };

    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  // The document itself has to say what it is: assistive technology, the
  // browser's own hyphenation and every logical CSS property read from here.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', locale);
    root.setAttribute('dir', DIRECTION[locale]);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    const safe = normalizeLocale(next);
    write(LOCALE_STORAGE_KEY, safe);
    setLocaleState(safe);

    // Replace rather than push: switching language is not a step a visitor
    // wants to walk back through with the back button.
    window.history.replaceState(window.history.state, '', urlFor(safe, window.location));
  }, []);

  const hrefFor = useCallback(
    (next: Locale) => (typeof window === 'undefined' ? '/' : urlFor(next, window.location)),
    [],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      direction: DIRECTION[locale],
      isRtl: DIRECTION[locale] === 'rtl',
      setLocale,
      hrefFor,
    }),
    [locale, setLocale, hrefFor],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used within a LocaleProvider');
  return context;
};
