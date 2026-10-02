/**
 * The site settings table is a key/value store. Whitelisting the keys keeps the
 * admin UI and the public site in agreement about what exists, and stops an
 * authenticated caller from filling the table with arbitrary keys.
 */
export const SETTING_KEYS = [
  'branding',
  'organization',
  'global_contact',
  'global_social',
  'homepage',
  'seo',
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

/**
 * Which settings carry editorial text, and therefore exist in both languages.
 *
 * Everything else in a section stays single-valued, because it is not a
 * sentence: a media id, a phone number, a social URL, a colour, the height of
 * the logo, the founding year. The association's registered name is on that
 * list too - it is the same name in both languages, and its Arabic reading
 * lives in the interface dictionary rather than in the database.
 *
 * The values are stored exactly like every other editorial column of the
 * schema, `{ fr, ar }`, so the same resolver reads them and the same rule
 * applies: Arabic that is missing is missing, never quietly replaced by French.
 */
export const LOCALIZED_SETTINGS: Partial<Record<SettingKey, readonly string[]>> = {
  organization: ['tagline', 'about', 'mission', 'quote'],
  global_contact: ['address'],
  homepage: ['heroTitle', 'heroSubtitle', 'heroBadgeTitle', 'heroBadgeSubtitle', 'ctaQuote'],
  seo: ['title', 'description', 'keywords'],
};

/** Every localized setting, as `section.field`, for migrations and audits. */
export const LOCALIZED_SETTING_PATHS: string[] = Object.entries(LOCALIZED_SETTINGS).flatMap(
  ([section, fields]) => (fields ?? []).map((field) => `${section}.${field}`),
);

export const DEFAULT_SETTINGS: Record<SettingKey, Record<string, any>> = {
  branding: {
    // Uploaded logos. Empty means the site falls back to the wordmark below.
    logoId: null,
    // Version used on the dark navy backgrounds (footer, admin sidebar).
    logoDarkId: null,
    faviconId: null,
    // Wordmark shown when no logo is uploaded, and used as the logo alt text.
    wordmark: 'LDS',
    wordmarkAccent: 'Louga',
    logoHeight: 40,
  },
  organization: {
    name: 'Louga Développement Solidaire',
    shortName: 'LDS',
    /*
      Everything below carries the association's own voice. The Arabic is a
      first draft, written to the glossary, and is marked for LDS to read
      before publication - a competent translation is not an editorial
      validation. The French is the source and is never rewritten to make a
      translation easier.
    */
    tagline: {
      fr: 'Solidarité et action pour un avenir meilleur à Louga',
      ar: 'تضامن وعمل من أجل مستقبل أفضل في لوغا',
    },
    about: {
      fr: "Louga Développement Solidaire (LDS) est une association à but non lucratif composée de membres résidant au Sénégal et à l'international. LDS tire sa particularité et sa richesse de l'hétérogénéité des profils de ses membres — de l'étudiant à l'ingénieur, en passant par le professeur.",
      ar: 'لوغا للتنمية والتضامن جمعية غير ربحية يقيم أعضاؤها في السنغال وخارجها. تستمدّ الجمعية خصوصيتها وغناها من تنوّع مسارات أعضائها، من الطالب إلى المهندس مرورًا بالأستاذ.',
    },
    mission: {
      fr: "Subvenir aux besoins primaires des Lougatois : de la formation professionnelle à l'accès aux soins de santé, en passant par les aides sociales, nous identifions les difficultés pour y apporter des solutions durables.",
      ar: 'تلبية الحاجات الأساسية لأهل لوغا: من التكوين المهني إلى الوصول إلى الرعاية الصحية، مرورًا بالمساعدات الاجتماعية، نحدّد الصعوبات لنقدّم لها حلولًا مستدامة.',
    },
    quote: {
      fr: 'Nous croyons qu\u2019ensemble, nous pouvons construire un avenir meilleur pour tous.',
      ar: 'نؤمن بأنّنا معًا نستطيع بناء مستقبل أفضل للجميع.',
    },
    foundedYear: '',
  },
  global_contact: {
    email: 'lougasolidaire@gmail.com',
    phone: '+221 77 472 33 64',
    phoneSecondary: '+221 77 861 32 02',
    // The postal address is read, not dialled: it is editorial. The phone
    // numbers and the email above are not, and stay single-valued.
    address: {
      fr: 'Keur Serigne Louga Nord, Rue 11 Villa 342, Louga, Sénégal',
      ar: 'كير سرين لوغا الشمالية، شارع 11 فيلا 342، لوغا، السنغال',
    },
  },
  global_social: {
    facebook: '',
    instagram: '',
    linkedin: '',
    youtube: '',
  },
  homepage: {
    // The H1 of the homepage: the first thing anyone reads on the site.
    heroTitle: {
      fr: 'Solidarité et action pour un avenir meilleur à Louga',
      ar: 'تضامن وعمل من أجل مستقبل أفضل في لوغا',
    },
    heroSubtitle: {
      fr: "Association à but non lucratif engagée pour l'éducation, la santé et le développement durable des Lougatois, au Sénégal et depuis la diaspora.",
      ar: 'جمعية غير ربحية تعمل من أجل التعليم والصحة والتنمية المستدامة لأهل لوغا، في السنغال ومن المهجر.',
    },
    heroBadgeTitle: { fr: '100% bénévole', ar: 'تطوّع بالكامل' },
    heroBadgeSubtitle: { fr: 'Sénégal & diaspora', ar: 'السنغال والمهجر' },
    heroImageId: null,
    aboutImageId: null,
    // The association's own motto: the first line LDS should read back.
    ctaQuote: {
      fr: 'Ensemble, pour le développement de Louga.',
      ar: 'معًا من أجل تنمية لوغا.',
    },
    ctaImageId: null,
  },
  seo: {
    // What a search engine and a shared link show. Localized because an Arabic
    // page indexed under a French title is an Arabic page nobody finds.
    title: {
      fr: 'Louga Développement Solidaire',
      ar: 'لوغا للتنمية والتضامن',
    },
    description: {
      fr: "Association à but non lucratif engagée pour l'éducation, la santé et le développement durable des Lougatois, au Sénégal et depuis la diaspora.",
      ar: 'جمعية غير ربحية تعمل من أجل التعليم والصحة والتنمية المستدامة لأهل لوغا، في السنغال ومن المهجر.',
    },
    keywords: {
      fr: 'association, Louga, Sénégal, solidarité, éducation, santé, développement durable',
      ar: 'جمعية، لوغا، السنغال، تضامن، تعليم، صحة، تنمية مستدامة',
    },
    ogImageId: null,
  },
};
