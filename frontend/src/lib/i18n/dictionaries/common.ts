/**
 * Strings shared by the public site and the back office.
 *
 * The French object is the shape: `commonAr` is typed against it, so a key
 * added here without its Arabic breaks the build rather than shipping a French
 * word into an Arabic page. That compile-time guarantee is the whole reason the
 * dictionaries are plain objects and not a runtime key lookup.
 *
 * Vocabulary is fixed once and reused everywhere - see GLOSSARY.md. A concept
 * must read the same in a button, a notification and a form label.
 */
export const commonFr = {
  close: 'Fermer',
  closeNotification: 'Fermer la notification',
  notifications: 'Notifications',
  retry: 'Réessayer',
  loadFailed: 'Impossible de charger ces données',
  loadFailedHint: 'Une erreur est survenue. Vérifiez votre connexion puis réessayez.',
  loading: 'Chargement…',
  cancel: 'Annuler',
  save: 'Enregistrer',
  delete: 'Supprimer',
  edit: 'Modifier',
  back: 'Retour',
  next: 'Suivant',
  previous: 'Précédent',
  organizationName: 'Louga Développement Solidaire',
  /** The label of the language switch, in each language. */
  switchLanguage: 'Changer de langue',
} as const;

/**
 * The keys of the French object, with their values widened to `string`.
 *
 * `as const` above freezes the French values into literal types, which is what
 * makes a missing key an error; widening the values here is what lets the
 * Arabic object carry different text while still having to cover every key.
 */
export type CommonDictionary = { readonly [K in keyof typeof commonFr]: string };

export const commonAr: CommonDictionary = {
  close: 'إغلاق',
  closeNotification: 'إغلاق الإشعار',
  notifications: 'الإشعارات',
  retry: 'إعادة المحاولة',
  loadFailed: 'تعذّر تحميل البيانات',
  loadFailedHint: 'حدث خطأ. تحقّق من اتصالك ثم أعد المحاولة.',
  loading: 'جارٍ التحميل…',
  cancel: 'إلغاء',
  save: 'حفظ',
  delete: 'حذف',
  edit: 'تعديل',
  back: 'رجوع',
  next: 'التالي',
  previous: 'السابق',
  // A proper noun: the association is called this in both languages, with the
  // Arabic reading of the city name.
  organizationName: 'لوغا للتنمية والتضامن',
  switchLanguage: 'تغيير اللغة',
};
