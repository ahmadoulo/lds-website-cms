import { useLocale } from '../../../context/LocaleContext';

/**
 * The shell of the public site: contact bar, sticky header, main navigation,
 * mobile menu, footer, preview banner.
 *
 * Same contract as common.ts: the French object is the shape, `layoutAr` is
 * typed against it, so a key added here without its Arabic breaks the build
 * instead of shipping a French word into an Arabic page.
 *
 * Vocabulary comes from GLOSSARY.md and is not re-decided here - the eight
 * navigation labels and "Faire un don" read the same in the header, the mobile
 * panel and the footer because they are one entry each.
 */
export const layoutFr = {
  /** The eight entries of the main navigation, in display order. */
  nav: {
    home: 'Accueil',
    about: 'À propos',
    actions: 'Nos actions',
    news: 'Actualités',
    gallery: 'Galerie',
    impact: 'Impact',
    partners: 'Partenaires',
    contact: 'Contact',
  },
  header: {
    /** The first thing a keyboard user reaches, before the whole navigation. */
    skipToContent: 'Aller au contenu principal',
    /** On the logo, which is a link to the home page and has no visible label. */
    home: 'Accueil',
    mainNavigation: 'Navigation principale',
    mobileNavigation: 'Navigation mobile',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
  },
  /** Shared by the header, the mobile panel and the footer: one button, one wording. */
  actions: {
    donate: 'Faire un don',
  },
  footer: {
    /**
     * Shown only until the association fills its own tagline in the settings.
     * Editorial: this is the association's voice, not ours - flagged for review.
     */
    tagline:
      "Association à but non lucratif engagée pour l'éducation, la santé et le développement durable des Lougatois.",
    navigationHeading: 'Navigation',
    footerNavigation: 'Navigation du pied de page',
    contactHeading: 'Contact',
    /** Follows the year and the organization name, which are composed in the JSX. */
    rights: 'Tous droits réservés.',
  },
  preview: {
    editor: 'Mode prévisualisation — vous voyez les modifications non publiées.',
    visitor:
      'Prévisualisation indisponible : connectez-vous à l’administration pour voir les brouillons.',
    exit: 'Quitter',
  },
} as const;

/**
 * The keys of the French object, with their values widened to `string`.
 *
 * Widening per section rather than per key keeps the declaration short while
 * still forcing the Arabic object to carry every section; a missing key inside
 * a section is caught at the point of use, because the French object is what
 * types the reader.
 */
export type LayoutDictionary = { readonly [K in keyof typeof layoutFr]: Record<string, string> };

export const layoutAr: LayoutDictionary = {
  nav: {
    home: 'الرئيسية',
    about: 'من نحن',
    actions: 'مجالات عملنا',
    news: 'الأخبار',
    gallery: 'معرض الصور',
    impact: 'أثرنا',
    partners: 'شركاؤنا',
    contact: 'اتصل بنا',
  },
  header: {
    skipToContent: 'الانتقال إلى المحتوى الرئيسي',
    home: 'الرئيسية',
    mainNavigation: 'التنقّل الرئيسي',
    mobileNavigation: 'قائمة التنقّل',
    openMenu: 'فتح القائمة',
    closeMenu: 'إغلاق القائمة',
  },
  actions: {
    donate: 'تبرّع الآن',
  },
  footer: {
    // Editorial, to be read back by the association: the intention is kept
    // ("des Lougatois" is the people of Louga, not an adjective to transliterate).
    tagline: 'جمعية غير ربحية تعمل من أجل التعليم والصحة والتنمية المستدامة لأبناء لوغا.',
    // "Navigation" as a footer column heading: Arabic names what the list holds
    // rather than the act of moving through it.
    navigationHeading: 'أقسام الموقع',
    footerNavigation: 'روابط أسفل الصفحة',
    contactHeading: 'اتصل بنا',
    rights: 'جميع الحقوق محفوظة.',
  },
  preview: {
    editor: 'وضع المعاينة — أنت ترى التعديلات غير المنشورة.',
    visitor: 'المعاينة غير متاحة: سجّل الدخول إلى لوحة التحكّم لعرض المسوّدات.',
    exit: 'خروج',
  },
};

/** A navigation entry, so the NAV table can hold keys instead of French text. */
export type NavKey = keyof typeof layoutFr.nav;

/**
 * This namespace, in the language being displayed.
 *
 * Read exactly like `useT()` - `t.nav.home`, no string keys - and selected the
 * same way, by casting the Arabic object back to the French shape so the keys
 * stay literal and a typo stays a compile error. It lives here rather than in
 * `useT` only because `DICTIONARIES` is being extended by several hands at
 * once; folding `layout` into that table is a two-line change that leaves
 * every call site below untouched.
 */
export function useLayoutT(): typeof layoutFr {
  const { locale } = useLocale();
  return (locale === 'ar' ? layoutAr : layoutFr) as typeof layoutFr;
}
