import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, detectLocale, isLocale, normalizeLocale } from '../lib/i18n/locale';
import {
  hasTranslation,
  localized,
  localizedOrSource,
  resolveLocalized,
} from '../lib/i18n/resolve';

describe('normalizeLocale', () => {
  it('accepts the two published languages', () => {
    expect(normalizeLocale('fr')).toBe('fr');
    expect(normalizeLocale('ar')).toBe('ar');
  });

  it('reads a regional tag as its base language', () => {
    expect(normalizeLocale('ar-MA')).toBe('ar');
    expect(normalizeLocale('fr_SN')).toBe('fr');
    expect(normalizeLocale('AR')).toBe('ar');
  });

  it('answers French for anything it does not publish', () => {
    // A query string is attacker-controlled; nothing indexes on it before here.
    for (const hostile of ['en', 'de', '', '  ', '../../etc', '<script>', null, undefined, 42, {}]) {
      expect(normalizeLocale(hostile)).toBe(DEFAULT_LOCALE);
    }
  });

  it('never reports an unsupported value as a locale', () => {
    expect(isLocale('en')).toBe(false);
    expect(isLocale('ar')).toBe(true);
  });
});

describe('detectLocale', () => {
  it('lets the address win, so a shared link opens in its own language', () => {
    expect(detectLocale({ search: '?lang=ar', stored: 'fr', languages: ['fr-FR'] })).toBe('ar');
  });

  it('treats an explicit ?lang=fr as a choice too', () => {
    expect(detectLocale({ search: '?lang=fr', stored: 'ar', languages: ['ar'] })).toBe('fr');
  });

  it('falls back to the remembered choice when the address says nothing', () => {
    expect(detectLocale({ search: '', stored: 'ar', languages: ['fr-FR'] })).toBe('ar');
  });

  it('then considers the browser', () => {
    expect(detectLocale({ search: '', stored: null, languages: ['ar-MA', 'fr'] })).toBe('ar');
  });

  it('ignores a browser language the site is not published in', () => {
    expect(detectLocale({ search: '', stored: null, languages: ['de-DE', 'en-US'] })).toBe('fr');
  });

  it('ends on French', () => {
    expect(detectLocale({})).toBe('fr');
  });

  it('refuses a stored value that is not a published language', () => {
    expect(detectLocale({ stored: 'en' })).toBe('fr');
  });
});

describe('resolveLocalized', () => {
  const both = { fr: 'Éducation', ar: 'التعليم' };
  const frenchOnly = { fr: 'Éducation' };

  it('returns the language that was asked for', () => {
    expect(resolveLocalized(both, 'ar').value).toBe('التعليم');
    expect(resolveLocalized(both, 'fr').value).toBe('Éducation');
  });

  it('never answers a different language than the one requested', () => {
    // The old helper walked fr -> en -> first key, so an Arabic page filled
    // itself with French and looked translated when it was not.
    const resolved = resolveLocalized(frenchOnly, 'ar');
    expect(resolved.value).toBe('');
    expect(resolved.missing).toBe(true);
  });

  it('treats whitespace as missing', () => {
    expect(resolveLocalized({ fr: 'Éducation', ar: '   ' }, 'ar').missing).toBe(true);
  });

  it('reports which languages the field does have', () => {
    expect(resolveLocalized(both, 'ar').available).toEqual(['fr', 'ar']);
    expect(resolveLocalized(frenchOnly, 'ar').available).toEqual(['fr']);
  });

  it('survives a null field', () => {
    expect(resolveLocalized(null, 'fr')).toEqual({ value: '', missing: true, available: [] });
  });

  it('ignores a legacy locale entirely', () => {
    // `en` is still stored on seeded rows; it must never reach a screen.
    expect(localized({ fr: 'Éducation', en: 'Education' }, 'ar')).toBe('');
    expect(resolveLocalized({ en: 'Education' }, 'fr').missing).toBe(true);
  });
});

describe('localizedOrSource', () => {
  it('says when it had to show the untranslated original', () => {
    const result = localizedOrSource({ fr: 'Accueil' }, 'ar');
    expect(result).toEqual({ text: 'Accueil', untranslated: true });
  });

  it('reports nothing untranslated when the language is there', () => {
    expect(localizedOrSource({ fr: 'Accueil', ar: 'الرئيسية' }, 'ar')).toEqual({
      text: 'الرئيسية',
      untranslated: false,
    });
  });
});

describe('hasTranslation', () => {
  it('is what the back office needs to flag an incomplete record', () => {
    expect(hasTranslation({ fr: 'Éducation' }, 'ar')).toBe(false);
    expect(hasTranslation({ fr: 'Éducation', ar: 'التعليم' }, 'ar')).toBe(true);
  });
});
