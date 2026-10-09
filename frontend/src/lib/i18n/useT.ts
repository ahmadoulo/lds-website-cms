import { useLocale } from '../../context/LocaleContext';
import { adminScreensAr, adminScreensFr } from './dictionaries/adminScreens';
import { adminShellAr, adminShellFr } from './dictionaries/adminShell';
import { commonAr, commonFr } from './dictionaries/common';
import { componentsAr, componentsFr } from './dictionaries/components';
import { iconLabelsAr, iconLabelsFr } from './dictionaries/iconLabels';
import { layoutAr, layoutFr } from './dictionaries/layout';
import { pagesAr, pagesFr } from './dictionaries/pages';
import { newsletterAr, newsletterFr } from './dictionaries/newsletter';
import type { Locale } from './locale';

/**
 * Every static string of the application, assembled per language.
 *
 * Namespaced so the public site, the back office and the shared components can
 * each own a file without colliding, and so a reader can tell at a glance where
 * a string belongs. One assembly point: the per-namespace hooks each dictionary
 * exports are thin readers of this object, not a second mechanism.
 */
const DICTIONARIES = {
  fr: {
    common: commonFr,
    layout: layoutFr,
    pages: pagesFr,
    components: componentsFr,
    adminShell: adminShellFr,
    admin: adminScreensFr,
    iconLabels: iconLabelsFr,
    newsletter: newsletterFr,
  },
  ar: {
    common: commonAr,
    layout: layoutAr,
    pages: pagesAr,
    components: componentsAr,
    adminShell: adminShellAr,
    admin: adminScreensAr,
    iconLabels: iconLabelsAr,
    newsletter: newsletterAr,
  },
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
/**
 * Alias of `useT` kept for the back-office shell.
 *
 * It lives here rather than in the adminShell dictionary because that file is
 * imported by this one: a hook defined there and reading this module's
 * DICTIONARIES closed a circular import, and whichever module happened to
 * evaluate first saw the other half-initialised - `t.adminShell` arrived
 * undefined at runtime while the types still checked out.
 */
export function useShellT(): Dictionary {
  return useT();
}

export function useT(): Dictionary {
  const { locale } = useLocale();
  return dictionaryFor(locale);
}
