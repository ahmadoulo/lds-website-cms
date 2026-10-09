/**
 * Announcements: the banner, the "À venir" block, the details and sharing of
 * an article, and the announcement part of the news editor.
 *
 * Same contract as the other dictionaries: the French object is the shape,
 * the Arabic one is typed against it.
 */
export const announcementsFr = {
  banner: {
    region: 'Annonces',
    more: 'En savoir plus',
    close: 'Fermer l’annonce',
    previous: 'Annonce précédente',
    next: 'Annonce suivante',
    pause: 'Mettre le défilement en pause',
    play: 'Reprendre le défilement',
    position: (current: number, total: number) => `${current} sur ${total}`,
  },

  upcoming: {
    eyebrow: 'Prochainement',
    title: 'À venir',
    lead: 'Les prochaines actions de l’association, et comment y prendre part.',
    featured: 'À la une',
    more: 'En savoir plus',
    contact: 'Nous contacter',
    allNews: 'Toutes les actualités',
  },

  details: {
    title: 'Informations pratiques',
    when: 'Date',
    where: 'Lieu',
    practical: 'À savoir',
    contact: 'Contact',
    archived: 'Cette annonce est archivée : les informations ci-dessous ne sont peut-être plus à jour.',
  },

  actions: {
    contact: 'Contacter l’association',
    call: 'Appeler',
    email: 'Nous écrire',
    donate: 'Faire un don',
    newsletter: 'Suivre nos actualités',
    social: 'Nous retrouver sur les réseaux',
    page: 'En savoir plus',
    external: 'En savoir plus',
  },

  share: {
    title: 'Partager',
    native: 'Partager…',
    copy: 'Copier le lien',
    copied: 'Lien copié',
    copyFailed: 'Copie impossible : sélectionnez l’adresse dans la barre du navigateur.',
    whatsapp: 'WhatsApp',
    facebook: 'Facebook',
  },

  admin: {
    section: 'Annonce',
    sectionHint:
      'Facultatif. Remplissez ce qui sert : une actualité ordinaire laisse tout vide.',
    status: {
      draft: 'Brouillon',
      scheduled: 'Programmée',
      published: 'Publiée',
      archived: 'Archivée',
    },
    allStatuses: 'Tous les statuts',
    allCategories: 'Toutes les catégories',
    placementBanner: 'Bandeau',
    placementUpcoming: 'À venir',
    periodFrom: 'Créés depuis le',
    periodTo: 'Créés jusqu’au',
    publishAt: 'Date de publication',
    publishAtHint:
      'Vide : maintenant. Une date future programme l’article : il n’apparaîtra sur le site qu’à ce moment.',
    eventStartsAt: 'Début de l’activité',
    eventEndsAt: 'Fin de l’activité',
    location: 'Lieu',
    practicalInfo: 'Informations pratiques',
    practicalInfoHint: 'Ce qu’il faut apporter, pour qui c’est, comment participer…',
    placements: 'Emplacements',
    showInBanner: 'Afficher dans le bandeau du site',
    bannerText: 'Texte du bandeau',
    bannerTextHint: 'Une phrase courte. Vide : le titre est utilisé.',
    bannerScope: 'Pages du bandeau',
    bannerScopeHome: 'Accueil uniquement',
    bannerScopeAll: 'Toutes les pages',
    showInUpcoming: 'Afficher dans « À venir » sur l’accueil',
    isFeatured: 'Mettre en avant',
    window: 'Période d’affichage',
    windowHint:
      'Pendant laquelle l’annonce apparaît dans le bandeau et « À venir ». En dehors, elle reste publiée et consultable.',
    visibleFrom: 'Du',
    visibleUntil: 'Au',
    contact: 'Contact pour cette annonce',
    contactHint: 'Facultatif. Vide : les coordonnées de l’association sont utilisées.',
    contactName: 'Nom',
    contactPhone: 'Téléphone',
    contactEmail: 'Email',
    actions: 'Boutons d’action',
    actionsHint:
      'Au plus quatre. « Appeler » et « Nous écrire » utilisent le contact ci-dessus, sinon celui de l’association.',
    addAction: 'Ajouter un bouton',
    actionType: 'Action',
    actionLabel: 'Texte du bouton (facultatif)',
    actionUrl: 'Adresse',
    actionUrlPage: 'Chemin sur le site, par exemple /nous-soutenir',
    actionUrlExternal: 'Adresse complète, en https://',
    removeAction: 'Retirer',
    archive: 'Archiver',
    unarchive: 'Désarchiver',
    archiveUpdated: 'Archivage mis à jour.',
    copyUrl: 'Copier l’adresse publique',
    urlCopied: 'Adresse copiée.',
  },
};

type Translated<T> = {
  readonly [K in keyof T]: T[K] extends (...args: infer A) => string
    ? (...args: A) => string
    : T[K] extends string
      ? string
      : Translated<T[K]>;
};

export type AnnouncementsDictionary = Translated<typeof announcementsFr>;

/* First draft to the glossary, waiting for LDS to read it. */
export const announcementsAr: AnnouncementsDictionary = {
  banner: {
    region: 'إعلانات',
    more: 'اعرف المزيد',
    close: 'إغلاق الإعلان',
    previous: 'الإعلان السابق',
    next: 'الإعلان التالي',
    pause: 'إيقاف التمرير مؤقتًا',
    play: 'استئناف التمرير',
    position: (current: number, total: number) => `${current} من ${total}`,
  },

  upcoming: {
    eyebrow: 'قريبًا',
    title: 'ما هو قادم',
    lead: 'الأعمال القادمة للجمعية، وكيفية المشاركة فيها.',
    featured: 'في الواجهة',
    more: 'اعرف المزيد',
    contact: 'تواصل معنا',
    allNews: 'كل الأخبار',
  },

  details: {
    title: 'معلومات عملية',
    when: 'التاريخ',
    where: 'المكان',
    practical: 'للعلم',
    contact: 'جهة الاتصال',
    archived: 'هذا الإعلان مؤرشف: قد لا تكون المعلومات أدناه محدَّثة.',
  },

  actions: {
    contact: 'تواصل مع الجمعية',
    call: 'اتصل',
    email: 'راسلنا',
    donate: 'تبرّع',
    newsletter: 'تابع أخبارنا',
    social: 'تابعنا على الشبكات',
    page: 'اعرف المزيد',
    external: 'اعرف المزيد',
  },

  share: {
    title: 'مشاركة',
    native: 'مشاركة…',
    copy: 'نسخ الرابط',
    copied: 'تمّ نسخ الرابط',
    copyFailed: 'تعذّر النسخ: حدّد العنوان في شريط المتصفّح.',
    whatsapp: 'واتساب',
    facebook: 'فيسبوك',
  },

  admin: {
    section: 'إعلان',
    sectionHint: 'اختياري. املأ ما يلزم: الخبر العادي يترك كل هذا فارغًا.',
    status: {
      draft: 'مسودّة',
      scheduled: 'مجدول',
      published: 'منشور',
      archived: 'مؤرشف',
    },
    allStatuses: 'كل الحالات',
    allCategories: 'كل الفئات',
    placementBanner: 'الشريط',
    placementUpcoming: 'ما هو قادم',
    periodFrom: 'أُنشئت منذ',
    periodTo: 'أُنشئت حتى',
    publishAt: 'تاريخ النشر',
    publishAtHint: 'إن تُرك فارغًا: الآن. تاريخ مستقبلي يجدول المقال: لن يظهر على الموقع إلا حينها.',
    eventStartsAt: 'بداية النشاط',
    eventEndsAt: 'نهاية النشاط',
    location: 'المكان',
    practicalInfo: 'معلومات عملية',
    practicalInfoHint: 'ما يجب إحضاره، ولمن هو، وكيفية المشاركة…',
    placements: 'أماكن العرض',
    showInBanner: 'عرض في شريط الموقع',
    bannerText: 'نص الشريط',
    bannerTextHint: 'جملة قصيرة. إن تُركت فارغة يُستعمل العنوان.',
    bannerScope: 'صفحات الشريط',
    bannerScopeHome: 'الصفحة الرئيسية فقط',
    bannerScopeAll: 'كل الصفحات',
    showInUpcoming: 'عرض في « ما هو قادم » على الصفحة الرئيسية',
    isFeatured: 'إبراز',
    window: 'فترة العرض',
    windowHint:
      'التي يظهر خلالها الإعلان في الشريط وفي « ما هو قادم ». خارجها يبقى منشورًا ويمكن الاطّلاع عليه.',
    visibleFrom: 'من',
    visibleUntil: 'إلى',
    contact: 'جهة الاتصال لهذا الإعلان',
    contactHint: 'اختياري. إن تُرك فارغًا تُستعمل بيانات الجمعية.',
    contactName: 'الاسم',
    contactPhone: 'الهاتف',
    contactEmail: 'البريد الإلكتروني',
    actions: 'أزرار الإجراءات',
    actionsHint:
      'أربعة على الأكثر. « اتصل » و« راسلنا » يستعملان جهة الاتصال أعلاه، وإلا فبيانات الجمعية.',
    addAction: 'إضافة زر',
    actionType: 'الإجراء',
    actionLabel: 'نص الزر (اختياري)',
    actionUrl: 'العنوان',
    actionUrlPage: 'مسار على الموقع، مثل /nous-soutenir',
    actionUrlExternal: 'عنوان كامل يبدأ بـ https://',
    removeAction: 'حذف',
    archive: 'أرشفة',
    unarchive: 'إلغاء الأرشفة',
    archiveUpdated: 'تمّ تحديث الأرشفة.',
    copyUrl: 'نسخ العنوان العام',
    urlCopied: 'تمّ نسخ العنوان.',
  },
};
