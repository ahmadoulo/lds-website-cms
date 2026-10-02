import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
function urlFor(next: Locale, location: { pathname: string; search: string; hash?: string }) {
  const params = new URLSearchParams(location.search);
  if (next === DEFAULT_LOCALE) params.delete(LOCALE_PARAM);
  else params.set(LOCALE_PARAM, next);

  const query = params.toString();
  return `${location.pathname}${query ? `?${query}` : ''}${location.hash ?? ''}`;
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

  const location = useLocation();
  const navigate = useNavigate();

  /*
    The address is the source of truth once the page is open: a link shared in
    Arabic must open in Arabic, and the back button must change the language
    back with the page.

    This has to watch the router's location rather than `popstate`, because a
    <Link> navigates with pushState, which fires no event. Watching popstate
    alone meant the language survived a click - it is remembered - but the
    parameter fell out of the address, so an Arabic page stopped being
    shareable after the first navigation, and its canonical and hreflang went
    back to pointing at the French one.
  */
  useEffect(() => {
    const fromUrl = new URLSearchParams(location.search).get(LOCALE_PARAM);

    if (fromUrl !== null) {
      const requested = normalizeLocale(fromUrl);
      if (requested !== locale) {
        write(LOCALE_STORAGE_KEY, requested);
        setLocaleState(requested);
      }
      return;
    }

    // No parameter in a language that needs one: put it back, in place, so the
    // address always states what the visitor is reading.
    if (locale !== DEFAULT_LOCALE) {
      navigate(urlFor(locale, location), { replace: true });
    }
  }, [location, locale, navigate]);

  // The document itself has to say what it is: assistive technology, the
  // browser's own hyphenation and every logical CSS property read from here.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', locale);
    root.setAttribute('dir', DIRECTION[locale]);
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      const safe = normalizeLocale(next);
      write(LOCALE_STORAGE_KEY, safe);
      setLocaleState(safe);

      // Replace rather than push: switching language is not a step a visitor
      // wants to walk back through with the back button.
      navigate(urlFor(safe, location), { replace: true });
    },
    [navigate, location],
  );

  const hrefFor = useCallback((next: Locale) => urlFor(next, location), [location]);

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
