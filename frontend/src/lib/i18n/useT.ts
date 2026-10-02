import { useLocale } from '../../context/LocaleContext';
import { commonAr, commonFr } from './dictionaries/common';
import type { Locale } from './locale';

/**
 * Every static string of the application, assembled per language.
 *
 * Namespaced so the public site, the back office and the shared components can
 * each own a file without colliding, and so a reader can tell at a glance where
 * a string belongs.
 */
const DICTIONARIES = {
  fr: { common: commonFr },
  ar: { common: commonAr },
} as const;

export type Dictionary = (typeof DICTIONARIES)['fr'];

export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale] as Dictionary;
}

/**
 * The dictionary for the language being displayed.
 *
 * Returns the object itself rather than a lookup function, so a string is read
 * as `t.common.retry`: typed end to end, impossible to misspell, and impossible
 * to reference a key that has no Arabic - the Arabic objects are typed against
 * the French ones.
 */
export function useT(): Dictionary {
  const { locale } = useLocale();
  return dictionaryFor(locale);
}
