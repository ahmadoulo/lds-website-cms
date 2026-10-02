import { useLocale } from '../../../context/LocaleContext';

/**
 * Every static string of the eleven public pages.
 *
 * Same contract as `common.ts`: the French object is the shape, the Arabic one
 * is typed against it, so a key added without its Arabic breaks `tsc` instead of
 * shipping a French sentence into an Arabic page.
 *
 * What is NOT here: anything the association types into the back office. An
 * article title, a mission description, a photo caption and an image's alt text
 * all come from the database as `Localized` records and are read through
 * `resolve.ts`. The dictionary only holds the words the code itself writes -
 * including the fallbacks used when a database field is empty, which is why
 * `alt.*` and `home.ctaQuote` live here.
 *
 * Vocabulary is fixed by GLOSSARY.md. Where a concept appears on several pages
 * ("Nous soutenir", "Nos actions en images", the alt text of a field photo) it
 * is declared once under `shared`, `cta` or `alt` and read from there, so the
 * two languages cannot drift apart one page at a time.
 */
export const pagesFr = {
  /** Headings and labels that more than one page shows. */
  shared: {
    whoWeAreEyebrow: 'Qui sommes-nous',
    whoWeAreTitle: "L'association au service des Lougatois",
    missionsEyebrow: "Nos domaines d'action",
    missionsTitle: "Nos piliers d'intervention à Louga",
    missionsDescription:
      "Nous améliorons les conditions de vie à Louga à travers des domaines d'intervention complémentaires.",
    impactEyebrow: 'Notre impact',
    impactFiguresTitle: 'Notre impact en chiffres',
    newsEyebrow: 'Actualités',
    galleryEyebrow: 'Galerie',
    galleryTitle: 'Nos actions en images',
    partnersEyebrow: 'Partenaires',
    /*
      Shown only in Arabic, when a list holds records the association has not
      translated yet. French never reaches it - the filter is a no-op at `fr` -
      but the key still has to exist in both languages for the type to hold.
    */
    untranslatedTitle: 'Pas encore disponible dans cette langue',
    untranslatedDescription:
      "Ce contenu n'a pas encore été traduit. Il reste consultable dans l'autre langue du site.",
  },

  /** Calls to action, declared once so the same button never reads two ways. */
  cta: {
    donate: 'Faire un don',
    discoverActions: 'Découvrir nos actions',
    discoverDomains: "Découvrir nos domaines d'action",
    learnMoreAbout: "En savoir plus sur l'association",
    allImpact: 'Voir tout notre impact',
    allNews: 'Toutes les actualités',
    allGallery: 'Voir toute la galerie',
    joinMovement: 'Rejoindre le mouvement',
    support: 'Nous soutenir',
    contact: 'Nous contacter',
    backToNews: 'Retour aux actualités',
    contributeImpact: 'Contribuer à cet impact',
  },

  /**
   * Alternative text used when the media library has none of its own.
   *
   * An uploaded image carries a `Localized` alt text; these are the sentences
   * the code supplies in its absence, and they describe the photograph rather
   * than naming the page, because that is what a screen reader needs.
   */
  alt: {
    volunteers: "Bénévoles de l'association en action",
    fieldAction: "Action de l'association sur le terrain",
    ldsAction: 'Action de LDS',
    ldsPhoto: 'Photo des actions de LDS',
    organizationFieldAction: 'Action de Louga Développement Solidaire sur le terrain',
    photo: 'photo',
  },

  home: {
    errorTitle: 'Le site est momentanément indisponible',
    errorMessage:
      'Impossible de charger le contenu. Merci de réessayer dans quelques instants.',
    missionsEmpty: "Les domaines d'action seront publiés prochainement.",
    impactTitle: 'Des résultats concrets sur le terrain',
    newsTitle: 'Nos dernières actions',
    newsDescription: 'Retour sur nos événements et bilans les plus récents.',
    galleryDescription: 'Des moments forts de nos interventions sur le terrain, à Louga.',
    ctaQuote: 'Ensemble, pour le développement de Louga.',
    supportEyebrow: 'Nous soutenir',
    supportTitle: 'Comment nous soutenir ?',
    supportDescription:
      'Chaque contribution, financière, matérielle ou humaine, étend notre impact.',
    partnersTitle: 'Ils nous accompagnent',
  },

  about: {
    seoTitle: 'À propos',
    missionEyebrow: 'Notre mission',
    missionTitle: 'Ce que nous faisons',
    contactEyebrow: 'Nous joindre',
    contactTitle: 'Nos coordonnées',
  },

  actions: {
    seoTitle: 'Nos actions',
    seoDescription:
      "Les domaines d'intervention de Louga Développement Solidaire : éducation, santé, environnement, insertion professionnelle et solidarité.",
    eyebrow: 'Nos actions',
    title: "Nos domaines d'intervention à Louga",
    emptyTitle: "Aucun domaine d'action publié",
    emptyDescription: "Nos domaines d'intervention seront présentés ici prochainement.",
    supportTitle: 'Vous souhaitez soutenir nos actions ?',
    supportDescription:
      "Un don, du temps ou du matériel : chaque contribution nous permet d'aller plus loin.",
  },

  news: {
    seoTitle: 'Actualités',
    seoDescription:
      "Suivez l'évolution des projets, événements et bilans de Louga Développement Solidaire.",
    title: 'Toutes nos actions',
    description:
      "Suivez en direct l'évolution de nos projets, nos événements et nos bilans sur le terrain à Louga.",
    emptyTitle: 'Aucune actualité pour le moment',
    emptyDescription: 'Revenez bientôt pour découvrir nos prochaines actions.',
    /*
      The pagination is answered by the API, which knows nothing about
      languages: a page of nine articles can hold none that are translated. The
      visitor is told so and keeps the pagination, rather than being shown an
      empty grid or dropped back to page one.
    */
    untranslatedTitle: 'Aucune actualité traduite sur cette page',
    untranslatedDescription:
      "Les articles de cette page n'ont pas encore de version dans cette langue. Continuez la navigation ou changez de langue pour les consulter.",
    paginationLabel: 'Pagination des actualités',
    pageOf: (page: number, total: number) => `Page ${page} sur ${total}`,
  },

  newsDetail: {
    notFoundTitle: 'Article introuvable',
    notFoundDescription: "Cet article n'existe pas ou n'est plus publié.",
    categoryFallback: 'Actualité',
    relatedTitle: 'À lire également',
    /*
      A list hides what it cannot translate; a page reached by a direct link
      cannot, or the link is dead. The French original is shown with a notice
      saying what it is, which is the one place `localizedOrSource` earns its
      keep on the public site.
    */
    untranslatedNotice:
      "Cet article n'est pas encore traduit en arabe. Il est présenté ici en français.",
  },

  gallery: {
    seoTitle: 'Galerie',
    seoDescription: 'Les actions de Louga Développement Solidaire en images.',
    description: 'Plongez au cœur de nos interventions sur le terrain à Louga.',
    emptyTitle: 'Aucune photo pour le moment',
    emptyDescription: 'Nos photos de terrain seront publiées ici prochainement.',
    allPhotos: 'Toutes les photos',
    enlarge: (caption: string) => `Agrandir : ${caption}`,
  },

  impact: {
    seoTitle: 'Notre impact',
    seoDescription:
      "Les résultats concrets de Louga Développement Solidaire sur le terrain : chiffres, domaines d'action et photographies.",
    lead: 'Grâce au soutien de nos membres et partenaires, voici ce que nous avons accompli sur le terrain.',
    emptyTitle: 'Aucun chiffre publié',
    emptyDescription: "Nos indicateurs d'impact seront publiés prochainement.",
    sourceEyebrow: "D'où viennent ces chiffres",
    sourceTitle: 'Les actions qui les produisent',
    sourceDescription:
      "Chaque indicateur est le résultat d'un travail mené toute l'année sur le terrain.",
    fieldEyebrow: 'Sur le terrain',
    fieldTitle: 'Ces chiffres en images',
    takePartTitle: 'Ces résultats dépendent de vous',
    takePartDescription:
      'Chaque contribution finance directement une action sur le terrain à Louga.',
  },

  partners: {
    seoTitle: 'Partenaires',
    seoDescription: 'Les organisations qui accompagnent Louga Développement Solidaire.',
    eyebrow: 'Nos partenaires',
    title: 'Ils nous font confiance',
    description: 'Institutions, entreprises et associations qui rendent nos actions possibles.',
    emptyTitle: 'Aucun partenaire publié',
    emptyDescription: 'Nos partenaires seront présentés ici prochainement.',
    becomeTitle: "Devenir partenaire de l'association",
    becomeDescription:
      "Vous représentez une organisation qui souhaite s'engager à Louga ? Écrivez-nous.",
  },

  support: {
    seoTitle: 'Nous soutenir',
    seoDescription:
      'Don financier, bénévolat ou matériel : découvrez comment soutenir les actions de Louga Développement Solidaire.',
    eyebrow: 'Agir avec nous',
    title: 'Soutenez nos actions',
    description:
      "Chaque contribution — financière, matérielle ou humaine — nous permet d'étendre notre impact à Louga.",
    emptyTitle: 'Aucun moyen de soutien publié',
    emptyDescription: 'Contactez-nous directement pour savoir comment aider.',
    paymentsTitle: 'Envoyer un don',
    otherWaysTitle: "Autres façons d'aider",
    ideaTitle: 'Une autre idée pour nous aider ?',
    ideaDescription: 'Écrivez-nous ou appelez-nous, nous étudions toutes les propositions.',
  },

  contact: {
    seoTitle: 'Contact',
    seoDescription:
      'Contactez Louga Développement Solidaire : une question, une suggestion ou une envie de nous rejoindre.',
    title: 'Contactez-nous',
    lead: 'Une question, une suggestion ou une envie de nous rejoindre ? Écrivez-nous.',
    sendFailed: "Votre message n'a pas pu être envoyé. Merci de réessayer.",
    sentTitle: 'Message envoyé !',
    sentMessage: 'Merci pour votre message. Nous vous répondrons dans les plus brefs délais.',
    sendAnother: 'Envoyer un autre message',
    addressLabel: 'Adresse',
    phoneLabel: 'Téléphone',
    emailLabel: 'Email',
    nameLabel: 'Prénom et nom',
    namePlaceholder: 'Aïssatou Diop',
    nameRequired: "Merci d'indiquer votre nom",
    nameTooShort: 'Nom trop court',
    emailPlaceholder: 'votre@email.com',
    emailRequired: "L'adresse email est obligatoire",
    emailInvalid: 'Adresse email invalide',
    subjectLabel: 'Sujet',
    subjectPlaceholder: 'De quoi souhaitez-vous parler ?',
    subjectRequired: 'Merci de préciser un sujet',
    subjectTooShort: 'Sujet trop court',
    messageLabel: 'Message',
    messagePlaceholder: 'Votre message…',
    messageRequired: 'Le message est obligatoire',
    messageMin: '10 caractères minimum',
    messageMax: '5000 caractères maximum',
    submit: 'Envoyer le message',
  },

  notFound: {
    seoTitle: 'Page introuvable',
    title: 'Page introuvable',
    description: "La page que vous recherchez n'existe pas ou a été déplacée.",
    home: "Retour à l'accueil",
  },
} as const;

/**
 * The shape the Arabic object has to fill.
 *
 * `common.ts` is a flat object, so `{ [K in keyof typeof commonFr]: string }`
 * is enough there. These pages are namespaced two levels deep, and a
 * `Record<string, string>` for a section would let a whole section ship with
 * one key in it. Walking the sections instead keeps the guarantee that matters:
 * every key, at every depth, must be answered. Values are widened to `string`
 * so the Arabic text is free, and a function keeps its exact signature so an
 * interpolation cannot lose an argument.
 */
type Translated<T> = {
  readonly [K in keyof T]: T[K] extends (...args: infer A) => string
    ? (...args: A) => string
    : T[K] extends object
      ? Translated<T[K]>
      : string;
};

export type PagesDictionary = Translated<typeof pagesFr>;

export const pagesAr: PagesDictionary = {
  shared: {
    whoWeAreEyebrow: 'من نحن',
    whoWeAreTitle: 'جمعية في خدمة أهل لوغا',
    missionsEyebrow: 'مجالات عملنا',
    missionsTitle: 'مجالات عملنا الأساسية في لوغا',
    missionsDescription: 'نعمل على تحسين ظروف الحياة في لوغا من خلال مجالات عمل متكاملة.',
    impactEyebrow: 'أثرنا',
    impactFiguresTitle: 'أثرنا في الأرقام',
    newsEyebrow: 'الأخبار',
    galleryEyebrow: 'معرض الصور',
    galleryTitle: 'أعمالنا في صور',
    partnersEyebrow: 'شركاؤنا',
    untranslatedTitle: 'غير متوفّر بالعربية بعد',
    untranslatedDescription:
      'لم يُترجم هذا المحتوى إلى العربية بعد. يمكنك الاطّلاع عليه بالفرنسية.',
  },

  cta: {
    donate: 'تبرّع الآن',
    discoverActions: 'تعرّف على مجالات عملنا',
    // The French wording differs a little from `discoverActions`; the concept is
    // the same, so the Arabic is the same - see GLOSSARY.md.
    discoverDomains: 'تعرّف على مجالات عملنا',
    learnMoreAbout: 'اعرف المزيد عن الجمعية',
    allImpact: 'عرض كل أثرنا',
    allNews: 'كل الأخبار',
    allGallery: 'عرض كل الصور',
    joinMovement: 'انضمّ إلى المسيرة',
    support: 'ادعمنا',
    contact: 'اتصل بنا',
    backToNews: 'رجوع إلى الأخبار',
    contributeImpact: 'ساهم في هذا الأثر',
  },

  alt: {
    volunteers: 'متطوّعو الجمعية أثناء العمل',
    fieldAction: 'عمل الجمعية في الميدان',
    ldsAction: 'من أعمال لوغا للتنمية والتضامن',
    ldsPhoto: 'صورة من أعمال لوغا للتنمية والتضامن',
    organizationFieldAction: 'عمل جمعية لوغا للتنمية والتضامن في الميدان',
    photo: 'صورة',
  },

  home: {
    errorTitle: 'الموقع غير متاح مؤقتًا',
    errorMessage: 'تعذّر تحميل المحتوى. يرجى إعادة المحاولة بعد لحظات.',
    missionsEmpty: 'ستُنشر مجالات العمل قريبًا.',
    impactTitle: 'نتائج ملموسة في الميدان',
    newsTitle: 'أحدث أعمالنا',
    newsDescription: 'عودة إلى أحدث فعالياتنا وحصائل عملنا.',
    galleryDescription: 'لحظات بارزة من عملنا الميداني في لوغا.',
    ctaQuote: 'معًا من أجل تنمية لوغا.',
    supportEyebrow: 'ادعمنا',
    supportTitle: 'كيف يمكنك دعمنا؟',
    supportDescription: 'كل مساهمة، مالية أو عينية أو بجهد إنساني، توسّع أثرنا.',
    partnersTitle: 'يرافقوننا في مسيرتنا',
  },

  about: {
    seoTitle: 'من نحن',
    missionEyebrow: 'رسالتنا',
    missionTitle: 'ما نقوم به',
    contactEyebrow: 'للتواصل معنا',
    contactTitle: 'بيانات الاتصال',
  },

  actions: {
    seoTitle: 'مجالات عملنا',
    seoDescription:
      'مجالات عمل جمعية لوغا للتنمية والتضامن: التعليم، الصحة، البيئة، الإدماج المهني والتضامن.',
    eyebrow: 'مجالات عملنا',
    title: 'مجالات عملنا في لوغا',
    emptyTitle: 'لا توجد مجالات عمل منشورة',
    emptyDescription: 'سنعرض مجالات عملنا هنا قريبًا.',
    supportTitle: 'هل ترغب في دعم أعمالنا؟',
    supportDescription: 'تبرّع، أو وقت، أو عتاد: كل مساهمة تمكّننا من المضي أبعد.',
  },

  news: {
    seoTitle: 'الأخبار',
    seoDescription: 'تابع مستجدّات مشاريع جمعية لوغا للتنمية والتضامن وفعالياتها وحصائل عملها.',
    title: 'كل أعمالنا',
    description: 'تابع عن قرب مستجدّات مشاريعنا وفعالياتنا وحصائل عملنا الميداني في لوغا.',
    emptyTitle: 'لا توجد أخبار حتى الآن',
    emptyDescription: 'عد قريبًا لتتعرّف على أعمالنا القادمة.',
    untranslatedTitle: 'لا توجد أخبار بالعربية في هذه الصفحة',
    untranslatedDescription:
      'لم تُترجم أخبار هذه الصفحة إلى العربية بعد. تابع التنقّل بين الصفحات أو اطّلع عليها بالفرنسية.',
    paginationLabel: 'تصفّح الأخبار',
    // Western Arabic numerals, as the glossary requires.
    pageOf: (page: number, total: number) => `الصفحة ${page} من ${total}`,
  },

  newsDetail: {
    notFoundTitle: 'المقال غير موجود',
    notFoundDescription: 'هذا المقال غير موجود أو لم يعد منشورًا.',
    categoryFallback: 'خبر',
    relatedTitle: 'اقرأ أيضًا',
    untranslatedNotice: 'لم يُترجم هذا المقال إلى العربية بعد، وهو معروض هنا بالفرنسية.',
  },

  gallery: {
    seoTitle: 'معرض الصور',
    seoDescription: 'أعمال جمعية لوغا للتنمية والتضامن في صور.',
    description: 'اقترب من تفاصيل عملنا الميداني في لوغا.',
    emptyTitle: 'لا توجد صور حتى الآن',
    emptyDescription: 'ستُنشر صور عملنا الميداني هنا قريبًا.',
    allPhotos: 'كل الصور',
    enlarge: (caption: string) => `تكبير: ${caption}`,
  },

  impact: {
    seoTitle: 'أثرنا',
    seoDescription:
      'النتائج الملموسة لجمعية لوغا للتنمية والتضامن في الميدان: أرقام، مجالات عمل وصور.',
    lead: 'بفضل دعم أعضائنا وشركائنا، هذا ما أنجزناه في الميدان.',
    emptyTitle: 'لا توجد أرقام منشورة',
    emptyDescription: 'ستُنشر مؤشّرات أثرنا قريبًا.',
    sourceEyebrow: 'من أين تأتي هذه الأرقام',
    sourceTitle: 'الأعمال التي تقف خلفها',
    sourceDescription: 'كل مؤشّر هو حصيلة عمل متواصل طوال السنة في الميدان.',
    fieldEyebrow: 'في الميدان',
    fieldTitle: 'هذه الأرقام في صور',
    takePartTitle: 'هذه النتائج رهن دعمكم',
    takePartDescription: 'كل مساهمة تموّل مباشرةً عملًا ميدانيًا في لوغا.',
  },

  partners: {
    seoTitle: 'شركاؤنا',
    seoDescription: 'المنظّمات التي ترافق جمعية لوغا للتنمية والتضامن.',
    eyebrow: 'شركاؤنا',
    title: 'يثقون بنا',
    description: 'مؤسّسات وشركات وجمعيات تجعل أعمالنا ممكنة.',
    emptyTitle: 'لا يوجد شركاء منشورون',
    emptyDescription: 'سنعرض شركاءنا هنا قريبًا.',
    becomeTitle: 'كن شريكًا للجمعية',
    becomeDescription: 'هل تمثّل منظّمة ترغب في الانخراط بلوغا؟ اكتب إلينا.',
  },

  support: {
    seoTitle: 'ادعمنا',
    seoDescription:
      'تبرّع مالي، أو تطوّع، أو عتاد: اعرف كيف تدعم أعمال جمعية لوغا للتنمية والتضامن.',
    eyebrow: 'لنعمل معًا',
    title: 'ادعم أعمالنا',
    description: 'كل مساهمة — مالية أو عينية أو بجهد إنساني — تمكّننا من توسيع أثرنا في لوغا.',
    emptyTitle: 'لا توجد وسائل دعم منشورة',
    emptyDescription: 'اتصل بنا مباشرة لتعرف كيف يمكنك المساعدة.',
    paymentsTitle: 'إرسال تبرّع',
    otherWaysTitle: 'طرق أخرى للمساعدة',
    ideaTitle: 'لديك فكرة أخرى لمساعدتنا؟',
    ideaDescription: 'اكتب إلينا أو اتصل بنا، فنحن ندرس كل المقترحات.',
  },

  contact: {
    seoTitle: 'اتصل بنا',
    seoDescription:
      'تواصل مع جمعية لوغا للتنمية والتضامن: سؤال، أو اقتراح، أو رغبة في الانضمام إلينا.',
    title: 'اتصل بنا',
    lead: 'سؤال، أو اقتراح، أو رغبة في الانضمام إلينا؟ اكتب إلينا.',
    sendFailed: 'تعذّر إرسال رسالتك. يرجى إعادة المحاولة.',
    sentTitle: 'تم إرسال الرسالة!',
    sentMessage: 'شكرًا على رسالتك. سنردّ عليك في أقرب وقت.',
    sendAnother: 'إرسال رسالة أخرى',
    // Not just العنوان: the glossary already gives that to "Titre", and the two
    // appear on the same page in the back office.
    addressLabel: 'العنوان البريدي',
    phoneLabel: 'الهاتف',
    emailLabel: 'البريد الإلكتروني',
    nameLabel: 'الاسم واللقب',
    // A Senegalese given name, written as it reads in Arabic script.
    namePlaceholder: 'آيساتو ديوب',
    nameRequired: 'يرجى إدخال اسمك',
    nameTooShort: 'الاسم قصير جدًا',
    // An address placeholder is Latin script by nature; the French word is not.
    emailPlaceholder: 'example@email.com',
    emailRequired: 'البريد الإلكتروني حقل إلزامي',
    emailInvalid: 'بريد إلكتروني غير صالح',
    subjectLabel: 'الموضوع',
    subjectPlaceholder: 'عمّ تريد أن تحدّثنا؟',
    subjectRequired: 'يرجى تحديد الموضوع',
    subjectTooShort: 'الموضوع قصير جدًا',
    messageLabel: 'الرسالة',
    messagePlaceholder: 'رسالتك…',
    messageRequired: 'الرسالة حقل إلزامي',
    messageMin: '10 أحرف على الأقل',
    messageMax: '5000 حرف كحدّ أقصى',
    submit: 'إرسال الرسالة',
  },

  notFound: {
    seoTitle: 'الصفحة غير موجودة',
    title: 'الصفحة غير موجودة',
    description: 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.',
    home: 'رجوع إلى الرئيسية',
  },
};

const DICTIONARIES: Record<'fr' | 'ar', PagesDictionary> = {
  fr: pagesFr,
  ar: pagesAr,
};

/**
 * The public pages' dictionary for the language being displayed.
 *
 * `useT()` assembles the shared namespaces, and `pages` belongs in it the same
 * way `common` does - two lines in `useT.ts`, which is owned by another part of
 * this change and is deliberately not touched here. Until then this hook reads
 * the same `LocaleContext` through the same pattern, so a page says
 * `p.contact.submit` and the wiring can move without a single page changing.
 */
export function usePagesT(): PagesDictionary {
  const { locale } = useLocale();
  return DICTIONARIES[locale];
}
