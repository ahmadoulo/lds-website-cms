import { useLocale } from '../../../context/LocaleContext';
import { DEFAULT_LOCALE, type Locale } from '../locale';

/**
 * The chrome both halves of the application are framed by: the back-office
 * shell (sidebar, top bar, tables, media picker) and the shared controls
 * (dialog, toast, empty and error states) the public site borrows from it.
 *
 * Anything a human reads in those components lives here, except what is already
 * in `common.ts` - Fermer, Annuler, Enregistrer, Chargement…, Réessayer are
 * read through `t.common.*` so a concept keeps one wording across the site.
 * Vocabulary follows GLOSSARY.md.
 */

/*
  The sidebar is generated from `navigation.ts`, a plain data file with no
  access to a hook: it carries the structure (route, icon, minimum role) and the
  French label. Translating it therefore happens where it is rendered, by
  looking the route up here. The route is the key because it is the one part of
  an entry that cannot change without the entry becoming a different page, and
  the French label stays the fallback, so a route added to the navigation shows
  up in French rather than disappearing.
*/
const NAV_LABELS_FR: Record<string, string> = {
  '/admin': "Vue d'ensemble",
  '/admin/parametres?section=homepage': 'Accueil',
  '/admin/parametres?section=organization': 'À propos',
  '/admin/missions': 'Nos actions',
  '/admin/actualites': 'Actualités',
  '/admin/galerie': 'Galerie',
  '/admin/impact': 'Impact',
  '/admin/partenaires': 'Partenaires',
  '/admin/soutien': 'Nous soutenir',
  '/admin/messages': 'Contact',
  '/admin/medias': 'Médias',
  '/admin/parametres?section=branding': 'Paramètres du site',
  '/admin/navigation': 'Menu de navigation',
  '/admin/utilisateurs': 'Utilisateurs',
  '/admin/journal': "Journal d'activité",
};

const NAV_LABELS_AR: Record<string, string> = {
  '/admin': 'نظرة عامة',
  '/admin/parametres?section=homepage': 'الرئيسية',
  '/admin/parametres?section=organization': 'من نحن',
  '/admin/missions': 'مجالات عملنا',
  '/admin/actualites': 'الأخبار',
  '/admin/galerie': 'معرض الصور',
  '/admin/impact': 'أثرنا',
  '/admin/partenaires': 'شركاؤنا',
  '/admin/soutien': 'ادعمنا',
  '/admin/messages': 'اتصل بنا',
  '/admin/medias': 'الوسائط',
  '/admin/parametres?section=branding': 'إعدادات الموقع',
  '/admin/navigation': 'قائمة التنقّل',
  '/admin/utilisateurs': 'المستخدمون',
  '/admin/journal': 'سجلّ النشاط',
};

const NAV_HINTS_FR: Record<string, string> = {
  '/admin/parametres?section=homepage': 'Bandeau, présentation, appel à l’action',
  '/admin/parametres?section=organization': 'Présentation, mission, citation',
  '/admin/missions': "Domaines d'intervention",
  '/admin/actualites': 'Articles et événements',
  '/admin/galerie': 'Albums et photos',
  '/admin/impact': 'Chiffres clés',
  '/admin/soutien': 'Wave, Orange Money, bénévolat',
  '/admin/messages': 'Messages reçus du formulaire',
  '/admin/medias': 'Toutes les images du site',
  '/admin/parametres?section=branding': 'Logo, coordonnées, réseaux, SEO',
};

const NAV_HINTS_AR: Record<string, string> = {
  '/admin/parametres?section=homepage': 'الشريط الرئيسي، التقديم، الدعوة إلى العمل',
  '/admin/parametres?section=organization': 'التقديم، الرسالة، الاقتباس',
  '/admin/missions': 'مجالات العمل',
  '/admin/actualites': 'المقالات والفعاليات',
  '/admin/galerie': 'الألبومات والصور',
  '/admin/impact': 'الأرقام الرئيسية',
  // Proper nouns: a payment service keeps its own name in both languages.
  '/admin/soutien': 'Wave وOrange Money والتطوّع',
  '/admin/messages': 'الرسائل الواردة من استمارة الاتصال',
  '/admin/medias': 'جميع صور الموقع',
  '/admin/parametres?section=branding':
    'الشعار، بيانات الاتصال، الشبكات الاجتماعية، تحسين الظهور في محرّكات البحث',
};

/** Keyed by the group title in `navigation.ts`, which is its only identifier. */
const NAV_GROUPS_FR: Record<string, string> = {
  Pilotage: 'Pilotage',
  'Contenu du site': 'Contenu du site',
  Bibliothèque: 'Bibliothèque',
  Configuration: 'Configuration',
};

const NAV_GROUPS_AR: Record<string, string> = {
  Pilotage: 'الإشراف',
  'Contenu du site': 'محتوى الموقع',
  Bibliothèque: 'المكتبة',
  Configuration: 'التهيئة',
};

/** Keyed by the role name the API returns. */
const ROLES_FR: Record<string, string> = {
  SUPER_ADMIN: 'Super administrateur',
  ADMIN: 'Administrateur',
  EDITOR: 'Éditeur',
};

const ROLES_AR: Record<string, string> = {
  SUPER_ADMIN: 'مسؤول أعلى',
  ADMIN: 'مسؤول',
  EDITOR: 'محرّر',
};

export const adminShellFr = {
  navLabels: NAV_LABELS_FR,
  navHints: NAV_HINTS_FR,
  navGroups: NAV_GROUPS_FR,
  roles: ROLES_FR,

  sidebar: {
    dashboard: 'Tableau de bord',
    closeMenu: 'Fermer le menu',
    navLabel: 'Navigation administration',
    viewPublicSite: 'Voir le site public',
    unreadMessages: (count: number) =>
      `${count} message${count > 1 ? 's' : ''} non lu${count > 1 ? 's' : ''}`,
  },

  topbar: {
    openMenu: 'Ouvrir le menu',
    fallbackTitle: 'Administration',
    accountMenu: 'Menu du compte',
    changePassword: 'Changer mon mot de passe',
    logout: 'Se déconnecter',
  },

  access: {
    checkingSession: 'Vérification de la session…',
    deniedTitle: 'Accès non autorisé',
    deniedDescription:
      "Votre rôle ne vous permet pas de consulter cette page. Contactez un administrateur si vous pensez qu'il s'agit d'une erreur.",
  },

  table: {
    actions: 'Actions',
  },

  pagination: {
    label: 'Pagination',
    pageOf: (page: number, totalPages: number) => `Page ${page} sur ${totalPages}`,
    items: (total: number) => `${total} élément${total > 1 ? 's' : ''}`,
  },

  search: {
    placeholder: 'Rechercher…',
    clear: 'Effacer la recherche',
  },

  preview: {
    label: 'Prévisualiser',
  },

  media: {
    defaultLabel: 'Image',
    dropHint: 'Glissez une image ici ou cliquez pour parcourir',
    formatsHint: 'JPG, PNG, WebP · 5 Mo maximum',
    showCrop: 'Voir le cadrage du site',
    showWhole: "Voir l'image entière",
    wholeImageNotice:
      'Image entière. Seule la zone visible dans le cadrage sera affichée sur le site.',
    replace: 'Remplacer',
    choose: 'Choisir une image',
    library: 'Bibliothèque',
    remove: 'Retirer',
    pendingUpload:
      "Image sélectionnée mais pas encore envoyée. Elle sera stockée lors de l'enregistrement du formulaire.",
    libraryTitle: 'Bibliothèque de médias',
    searchPlaceholder: 'Rechercher une image…',
    libraryFailed: 'Impossible de charger la bibliothèque',
    emptyTitle: 'Aucune image',
    emptyDescription: 'Téléversez votre première image depuis un formulaire ou la page Médias.',
  },

  imageReport: {
    dimensions: 'Dimensions',
    recommended: 'Conseillé',
    weight: 'Poids',
    ratio: 'Format',
    allGood: 'Cette image convient parfaitement à cet emplacement.',
    describeHint:
      "Pensez à décrire l'image dans la bibliothèque de médias : cette description est lue par les lecteurs d'écran et affichée si l'image ne charge pas.",
  },
} as const;

/**
 * The French object is the shape; the Arabic one has to cover every key.
 *
 * Values are widened to `string` so the Arabic text is free, while a key that
 * carries an interpolation keeps its exact signature - an Arabic plural is a
 * different computation from a French one, not a different string, so the
 * function has to stay a function taking the same arguments. The sections keyed
 * by route or by role are `Record<string, string>`, and the widening preserves
 * their index signature, so they can still be looked up with a value read at
 * runtime.
 */
type Widened<Section> = {
  readonly [K in keyof Section]: Section[K] extends (...args: never[]) => string
    ? Section[K]
    : string;
};

export type AdminShellDictionary = {
  readonly [K in keyof typeof adminShellFr]: Widened<(typeof adminShellFr)[K]>;
};

export const adminShellAr: AdminShellDictionary = {
  navLabels: NAV_LABELS_AR,
  navHints: NAV_HINTS_AR,
  navGroups: NAV_GROUPS_AR,
  roles: ROLES_AR,

  sidebar: {
    dashboard: 'الرئيسية',
    closeMenu: 'إغلاق القائمة',
    navLabel: 'تنقّل لوحة التحكّم',
    viewPublicSite: 'عرض الموقع العام',
    /*
      Arabic counts in more than two classes: one, two, a small number and a
      large one each take a different form of the noun. A French plural with an
      "s" bolted on would read as broken Arabic.
    */
    unreadMessages: (count: number) => {
      if (count === 1) return 'رسالة واحدة غير مقروءة';
      if (count === 2) return 'رسالتان غير مقروءتين';
      if (count <= 10) return `${count} رسائل غير مقروءة`;
      return `${count} رسالة غير مقروءة`;
    },
  },

  topbar: {
    openMenu: 'فتح القائمة',
    fallbackTitle: 'لوحة التحكّم',
    accountMenu: 'قائمة الحساب',
    changePassword: 'تغيير كلمة المرور',
    logout: 'تسجيل الخروج',
  },

  access: {
    checkingSession: 'جارٍ التحقّق من الجلسة…',
    deniedTitle: 'الوصول غير مصرّح به',
    deniedDescription:
      'لا يسمح لك دورك بالاطّلاع على هذه الصفحة. تواصل مع أحد المسؤولين إن كنت ترى أنّ هناك خطأ.',
  },

  table: {
    actions: 'الإجراءات',
  },

  pagination: {
    label: 'التنقّل بين الصفحات',
    pageOf: (page: number, totalPages: number) => `الصفحة ${page} من ${totalPages}`,
    items: (total: number) => {
      if (total === 0) return 'لا توجد عناصر';
      if (total === 1) return 'عنصر واحد';
      if (total === 2) return 'عنصران';
      if (total <= 10) return `${total} عناصر`;
      return `${total} عنصرًا`;
    },
  },

  search: {
    placeholder: 'بحث…',
    clear: 'مسح البحث',
  },

  preview: {
    label: 'معاينة',
  },

  media: {
    defaultLabel: 'صورة',
    dropHint: 'اسحب صورة إلى هنا أو انقر للاختيار',
    formatsHint: 'JPG، PNG، WebP · 5 ميغابايت كحدّ أقصى',
    showCrop: 'عرض الإطار كما في الموقع',
    showWhole: 'عرض الصورة كاملة',
    wholeImageNotice: 'الصورة كاملة. لن يظهر في الموقع إلّا الجزء الواقع داخل الإطار.',
    replace: 'استبدال',
    choose: 'اختيار صورة',
    library: 'المكتبة',
    remove: 'إزالة',
    pendingUpload: 'تم اختيار الصورة ولم تُرسَل بعد. ستُحفَظ عند حفظ الاستمارة.',
    libraryTitle: 'مكتبة الوسائط',
    searchPlaceholder: 'ابحث عن صورة…',
    libraryFailed: 'تعذّر تحميل المكتبة',
    emptyTitle: 'لا توجد صور',
    emptyDescription: 'أضِف أول صورة من إحدى الاستمارات أو من صفحة الوسائط.',
  },

  imageReport: {
    dimensions: 'الأبعاد',
    recommended: 'المستحسن',
    weight: 'الحجم',
    ratio: 'النسبة',
    allGood: 'هذه الصورة مناسبة تمامًا لهذا الموضع.',
    describeHint:
      'لا تنسَ وصف الصورة في مكتبة الوسائط: يقرأ قارئُ الشاشة هذا الوصف، ويظهر مكان الصورة إن لم تُحمَّل.',
  },
};

/**
 * The locale, for a component that may be rendered without a LocaleProvider.
 *
 * The shared controls - Modal, ErrorState, ProtectedRoute - are mounted on
 * their own in unit tests, where there is no provider above them and
 * `useLocale` throws by design. A dialog must not fail to open because of
 * that, so a missing provider is read as French, which is what the whole
 * application falls back to anyway. The hook underneath runs on both paths, so
 * the order React sees never changes.
 */
export function useShellLocale(): { locale: Locale; isRtl: boolean } {
  try {
    const { locale, isRtl } = useLocale();
    return { locale, isRtl };
  } catch {
    return { locale: DEFAULT_LOCALE, isRtl: false };
  }
}


