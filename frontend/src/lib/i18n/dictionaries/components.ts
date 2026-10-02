import { useLocale } from '../../../context/LocaleContext';
import type { Locale } from '../locale';

/**
 * The shared public components: domain cards and their dialog, news cards, the
 * partner carousel, the key figures, the ways of giving and the image viewer.
 *
 * Same contract as common.ts - the French object is the shape and `componentsAr`
 * is typed against it, so a key added here without its Arabic breaks the build
 * rather than shipping a French word into an Arabic page.
 *
 * Vocabulary comes from GLOSSARY.md and is not re-decided here: "En savoir
 * plus", "Lire la suite", "Nous soutenir" and "Nous contacter" read the same in
 * a card, a dialog and the navigation because each is one entry.
 */
export const componentsFr = {
  mission: {
    /** On the card, under the description: the card itself opens the dialog. */
    learnMore: 'En savoir plus',
    support: 'Nous soutenir',
    contact: 'Nous contacter',
  },
  news: {
    readMore: 'Lire la suite',
    /** The chip shown when an article is filed under no category. */
    category: 'Actualité',
    /** An article whose title is missing in every language. */
    untitled: 'Sans titre',
  },
  partners: {
    /** Names the scroll container, which is a group rather than the list. */
    label: 'Nos partenaires',
    /** aria-roledescription, only once the track actually overflows. */
    carousel: 'carrousel',
    previous: 'Partenaires précédents',
    next: 'Partenaires suivants',
  },
  lightbox: {
    label: "Visionneuse d'images",
    previous: 'Image précédente',
    next: 'Image suivante',
    /** Both figures are digits, so the form is the same in both languages. */
    position: (current: number, total: number) => `${current} / ${total}`,
  },
  donation: {
    copied: (value: string) => `${value} copié dans le presse-papiers.`,
    /** Shown instead when the browser refuses clipboard access. */
    dial: (value: string) => `Numéro à composer : ${value}`,
  },
  payment: {
    beneficiary: (name: string) => `Bénéficiaire : ${name}`,
    numberLabel: 'Numéro',
    payWith: (provider: string) => `Payer avec ${provider}`,
    copied: 'Copié',
    copyNumber: 'Copier le numéro',
    dial: 'Composer',
    enterNumber: (value: string) => `Numéro à saisir : ${value}`,
  },
  /*
    The provider names and instructions used to live in lib/paymentProviders.ts
    as French literals, which left French sentences on an Arabic page. The French
    wording below is that file's wording, unchanged to the character; the module
    keeps what is not language - the brand colour and whether a phone number is
    the meaningful detail. Indexing these two tables with a `ProviderKey` is what
    makes a new provider without its wording a compile error.
  */
  providerLabel: {
    wave: 'Wave',
    orange_money: 'Orange Money',
    bank: 'Virement bancaire',
    cash: 'Espèces',
    other: 'Autre moyen',
  },
  providerInstructions: {
    wave: "Ouvrez l'application Wave, choisissez « Envoyer », puis saisissez le numéro ci-dessus.",
    orange_money:
      "Ouvrez l'application Orange Money ou composez le #144# depuis votre mobile, puis suivez « Transfert d'argent » vers le numéro ci-dessus.",
    bank: 'Utilisez les coordonnées bancaires ci-dessus depuis votre banque en ligne.',
    cash: 'Contactez-nous pour convenir d’un rendez-vous.',
    other: 'Contactez-nous pour en savoir plus.',
  },
} as const;

/**
 * One section of the French object, with its text widened to `string` and its
 * interpolations left exactly as they are.
 *
 * Widening every value to `string` the way a flat dictionary does would reject
 * the functions; typing a section as `Record<string, string>` would accept them
 * nowhere and would also stop requiring the keys. This keeps both: the Arabic
 * object has to carry every key of every section, and an interpolation has to
 * keep the same signature, so `position(current, total)` cannot quietly become
 * a one-argument function in Arabic.
 */
type Widened<T> = { readonly [K in keyof T]: T[K] extends string ? string : T[K] };

export type ComponentsDictionary = {
  readonly [K in keyof typeof componentsFr]: Widened<(typeof componentsFr)[K]>;
};

export const componentsAr: ComponentsDictionary = {
  mission: {
    learnMore: 'اعرف المزيد',
    support: 'ادعمنا',
    contact: 'اتصل بنا',
  },
  news: {
    readMore: 'اقرأ المزيد',
    category: 'خبر',
    untitled: 'بدون عنوان',
  },
  partners: {
    label: 'شركاؤنا',
    carousel: 'عرض دوّار',
    /*
      "الشركاء السابقون" on its own would read as "our former partners", which
      is the opposite of a scroll button: the verb is what makes these an
      action on the strip rather than a category of partner.
    */
    previous: 'عرض الشركاء السابقين',
    next: 'عرض الشركاء التاليين',
  },
  lightbox: {
    label: 'عارض الصور',
    previous: 'الصورة السابقة',
    next: 'الصورة التالية',
    position: (current: number, total: number) => `${current} / ${total}`,
  },
  donation: {
    copied: (value: string) => `تمّ نسخ ${value} إلى الحافظة.`,
    dial: (value: string) => `الرقم المطلوب الاتصال به: ${value}`,
  },
  payment: {
    beneficiary: (name: string) => `المستفيد: ${name}`,
    numberLabel: 'الرقم',
    payWith: (provider: string) => `ادفع عبر ${provider}`,
    copied: 'تمّ النسخ',
    copyNumber: 'نسخ الرقم',
    dial: 'اتصال',
    enterNumber: (value: string) => `الرقم المطلوب إدخاله: ${value}`,
  },
  providerLabel: {
    // Brand names travel untranslated, as GLOSSARY.md allows for Wave and GIZ.
    wave: 'Wave',
    orange_money: 'Orange Money',
    bank: 'تحويل بنكي',
    cash: 'نقدًا',
    other: 'طريقة أخرى',
  },
  providerInstructions: {
    wave: 'افتح تطبيق Wave، واختر «إرسال»، ثم أدخل الرقم الظاهر أعلاه.',
    orange_money:
      'افتح تطبيق Orange Money أو اتصل بالرمز #144# من هاتفك، ثم اختر «تحويل الأموال» نحو الرقم الظاهر أعلاه.',
    bank: 'استخدم البيانات البنكية الظاهرة أعلاه من خلال خدمة بنكك الإلكترونية.',
    cash: 'اتصل بنا لتحديد موعد.',
    other: 'اتصل بنا لمعرفة المزيد.',
  },
};

/**
 * The tag `Intl` is given, which is not the same thing as the locale.
 *
 * Plain `ar` formats with Arabic-Indic digits (٦٢٠), and GLOSSARY.md asks for
 * Western ones: `-u-nu-latn` keeps the Arabic month names and the Arabic
 * reading order while printing 620 as 620. Every date and every figure in this
 * namespace goes through here rather than through a hand-written format.
 */
export const INTL_LOCALE: Record<Locale, string> = {
  fr: 'fr-FR',
  ar: 'ar-u-nu-latn',
};

/**
 * This namespace, in the language being displayed.
 *
 * Read exactly like `useT()` - `t.mission.learnMore`, no string keys - and
 * selected the same way as `useLayoutT`, by casting the Arabic object back to
 * the French shape so the keys stay literal and a typo stays a compile error.
 * It lives here rather than in `useT` only because `DICTIONARIES` is being
 * extended by several hands at once; folding `components` into that table is a
 * two-line change that leaves every call site untouched.
 */
export function useComponentsT(): typeof componentsFr {
  const { locale } = useLocale();
  return (locale === 'ar' ? componentsAr : componentsFr) as typeof componentsFr;
}
