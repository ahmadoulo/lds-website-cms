import type { Locale } from './locale';
import type { Localized } from '../types';

export interface Resolved {
  /** The text to display. Empty when the requested language is missing. */
  value: string;
  /** True when the requested language has nothing, whatever the others hold. */
  missing: boolean;
  /** Which languages this field does have, in storage order. */
  available: Locale[];
}

const LOCALES: Locale[] = ['fr', 'ar'];

function filled(value: Localized | null | undefined, locale: string): string {
  const raw = value?.[locale];
  return typeof raw === 'string' && raw.trim() ? raw : '';
}

/**
 * Reads one language out of a localized field, and says when it is not there.
 *
 * The old helper walked `fr || en || first available`, which meant an Arabic
 * page quietly filled itself with French and looked translated when it was
 * not. Nothing falls back here: the caller is told the text is missing and
 * decides what that means in its own context - an article with no Arabic is
 * left out of the Arabic listing, while a label with no Arabic is worth
 * showing in French rather than showing nothing at all.
 */
export function resolveLocalized(
  value: Localized | null | undefined,
  locale: Locale,
): Resolved {
  const available = LOCALES.filter((candidate) => filled(value, candidate));
  return { value: filled(value, locale), missing: !filled(value, locale), available };
}

/** The text in `locale`, or an empty string. Never another language. */
export function localized(value: Localized | null | undefined, locale: Locale): string {
  return filled(value, locale);
}

/**
 * The text in `locale`, falling back to French and saying so.
 *
 * For the handful of places where showing nothing is worse than showing the
 * untranslated original - a navigation label, a category chip. Every use is a
 * deliberate decision, which is why it is a separate function with a name that
 * cannot be mistaken for the strict one.
 */
export function localizedOrSource(
  value: Localized | null | undefined,
  locale: Locale,
): { text: string; untranslated: boolean } {
  const exact = filled(value, locale);
  if (exact) return { text: exact, untranslated: false };

  const source = filled(value, 'fr');
  return { text: source, untranslated: Boolean(source) };
}

/** True when the record has nothing at all to show in this language. */
export function hasTranslation(value: Localized | null | undefined, locale: Locale): boolean {
  return Boolean(filled(value, locale));
}
