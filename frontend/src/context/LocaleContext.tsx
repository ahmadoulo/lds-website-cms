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
  const location = useLocation();
  const navigate = useNavigate();

  /*
    The address is the single source of truth for the language.

    It used to be a piece of React state kept in step with the URL by an effect,
    and the two could not be updated together: `setLocaleState` is React state
    while `navigate` is the router's, so they commit in separate renders. Going
    back to French produced a render that still held `ar` while the address had
    already lost its parameter - and the effect, seeing a language that needed a
    parameter and an address without one, helpfully put `?lang=ar` back. The
    language then bounced between the two sources and the visitor was locked in
    Arabic with a switch that appeared to do nothing.

    Deriving it removes the second source entirely: there is nothing left to
    disagree with the address.
  */
  const [remembered, setRemembered] = useState<string | null>(() => read(LOCALE_STORAGE_KEY));

  const locale = useMemo<Locale>(() => {
    const fromUrl = new URLSearchParams(location.search).get(LOCALE_PARAM);
    // An explicit parameter is a choice, including `?lang=fr`.
    if (fromUrl !== null) return normalizeLocale(fromUrl);

    return detectLocale({
      stored: remembered,
      languages:
        typeof window === 'undefined'
          ? []
          : (window.navigator.languages ?? [window.navigator.language]),
    });
  }, [location.search, remembered]);

  // The address always states what is being read, so a page stays shareable
  // after a <Link> navigation, which carries no query of its own.
  useEffect(() => {
    const fromUrl = new URLSearchParams(location.search).get(LOCALE_PARAM);
    if (fromUrl === null && locale !== DEFAULT_LOCALE) {
      navigate(urlFor(locale, location), { replace: true });
    }
  }, [location, locale, navigate]);

  /*
    Whatever the address says is also what gets remembered - in storage for the
    next visit, and in state so the resolution above stays consistent. Without
    the second half, opening a shared `?lang=ar` link and then following any
    <Link> fell back to French: the link carries no query of its own, and the
    language resolved from the address had never reached the value the fallback
    reads.
  */
  useEffect(() => {
    write(LOCALE_STORAGE_KEY, locale);
    setRemembered(locale);
  }, [locale]);

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
      // Re-read even when the address does not change, so choosing the default
      // language from a page that already has no parameter still takes effect.
      setRemembered(safe);

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
