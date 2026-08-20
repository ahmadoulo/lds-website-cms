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
    tagline: 'Solidarité et action pour un avenir meilleur à Louga',
    about:
      "Louga Développement Solidaire (LDS) est une association à but non lucratif composée de membres résidant au Sénégal et à l'international. LDS tire sa particularité et sa richesse de l'hétérogénéité des profils de ses membres — de l'étudiant à l'ingénieur, en passant par le professeur.",
    mission:
      "Subvenir aux besoins primaires des Lougatois : de la formation professionnelle à l'accès aux soins de santé, en passant par les aides sociales, nous identifions les difficultés pour y apporter des solutions durables.",
    quote: 'Nous croyons qu\u2019ensemble, nous pouvons construire un avenir meilleur pour tous.',
    foundedYear: '',
  },
  global_contact: {
    email: 'lougasolidaire@gmail.com',
    phone: '+221 77 472 33 64',
    phoneSecondary: '+221 77 861 32 02',
    address: 'Keur Serigne Louga Nord, Rue 11 Villa 342, Louga, Sénégal',
  },
  global_social: {
    facebook: '',
    instagram: '',
    linkedin: '',
    youtube: '',
  },
  homepage: {
    heroTitle: 'Solidarité et action pour un avenir meilleur à Louga',
    heroSubtitle:
      "Association à but non lucratif engagée pour l'éducation, la santé et le développement durable des Lougatois, au Sénégal et depuis la diaspora.",
    heroBadgeTitle: '100% bénévole',
    heroBadgeSubtitle: 'Sénégal & diaspora',
    heroImageId: null,
    aboutImageId: null,
    ctaQuote: 'Ensemble, pour le développement de Louga.',
    ctaImageId: null,
  },
  seo: {
    title: 'Louga Développement Solidaire',
    description:
      "Association à but non lucratif engagée pour l'éducation, la santé et le développement durable des Lougatois, au Sénégal et depuis la diaspora.",
    keywords: 'association, Louga, Sénégal, solidarité, éducation, santé, développement durable',
    ogImageId: null,
  },
};
