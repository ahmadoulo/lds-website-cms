/**
 * What each pictogram is called in the admin dropdowns.
 *
 * Kept out of `lib/icons.ts` because that module is imported by public
 * components: the labels only ever appear in the back office, and the icon
 * itself is the same in both languages - only its name is translated.
 *
 * Keyed per list rather than per icon, because the same pictogram is named for
 * what it stands for in that list: GraduationCap is "Éducation" among the
 * domains and "Élèves accompagnés" among the key figures.
 */
const FR = {
  mission: {
    GraduationCap: 'Éducation (chapeau de diplômé)',
    BookOpen: 'Éducation (livre)',
    HeartPulse: 'Santé (pouls)',
    Stethoscope: 'Santé (stéthoscope)',
    TreePine: 'Environnement (arbre)',
    Leaf: 'Environnement (feuille)',
    Sprout: 'Agriculture (pousse)',
    Briefcase: 'Insertion professionnelle',
    HandHeart: 'Solidarité',
    Users: 'Communauté',
    Utensils: 'Alimentation',
    Droplets: 'Accès à l’eau',
  },
  impact: {
    Backpack: 'Kits scolaires (sac à dos)',
    GraduationCap: 'Élèves accompagnés (diplôme)',
    School: 'Établissements (école)',
    BookOpen: 'Formation (livre)',
    Stethoscope: 'Patients soignés (stéthoscope)',
    HeartPulse: 'Santé (pouls)',
    Trees: 'Arbres plantés (forêt)',
    Leaf: 'Environnement (feuille)',
    Utensils: 'Repas distribués (couverts)',
    Users: 'Bénéficiaires (personnes)',
    UserCheck: 'Bénévoles (personne validée)',
    HandCoins: 'Dons collectés (main et pièces)',
    Home: 'Familles aidées (maison)',
    HandHeart: 'Actions solidaires (main et cœur)',
  },
  partner: {
    Landmark: 'Institution',
    TreePine: 'Environnement / forêts',
    Building2: 'Entreprise',
    HeartPulse: 'Santé',
    Smartphone: 'Opérateur mobile',
    GraduationCap: 'Établissement scolaire',
    Users: 'Association',
  },
} as const;

export type IconLabelsDictionary = {
  readonly [K in keyof typeof FR]: Record<string, string>;
};

/** Widened, because an icon name read from the database is a plain string. */
export const iconLabelsFr: IconLabelsDictionary = FR;

export const iconLabelsAr: IconLabelsDictionary = {
  mission: {
    GraduationCap: 'التعليم (قبّعة التخرّج)',
    BookOpen: 'التعليم (كتاب)',
    HeartPulse: 'الصحة (نبض)',
    Stethoscope: 'الصحة (سمّاعة طبية)',
    TreePine: 'البيئة (شجرة)',
    Leaf: 'البيئة (ورقة شجر)',
    Sprout: 'الزراعة (برعم)',
    Briefcase: 'الإدماج المهني',
    HandHeart: 'التضامن',
    Users: 'المجتمع',
    Utensils: 'التغذية',
    Droplets: 'الوصول إلى الماء',
  },
  impact: {
    Backpack: 'الحقائب المدرسية (حقيبة)',
    GraduationCap: 'التلاميذ المرافَقون (شهادة)',
    School: 'المؤسسات (مدرسة)',
    BookOpen: 'التكوين (كتاب)',
    Stethoscope: 'المرضى المعالَجون (سمّاعة طبية)',
    HeartPulse: 'الصحة (نبض)',
    Trees: 'الأشجار المغروسة (غابة)',
    Leaf: 'البيئة (ورقة شجر)',
    Utensils: 'الوجبات الموزّعة (أدوات المائدة)',
    Users: 'المستفيدون (أشخاص)',
    UserCheck: 'المتطوّعون (شخص مؤكَّد)',
    HandCoins: 'التبرّعات المجموعة (يد ونقود)',
    Home: 'الأسر المدعومة (منزل)',
    HandHeart: 'الأعمال التضامنية (يد وقلب)',
  },
  partner: {
    Landmark: 'مؤسسة عمومية',
    TreePine: 'البيئة والغابات',
    Building2: 'شركة',
    HeartPulse: 'الصحة',
    Smartphone: 'مشغّل هاتف محمول',
    GraduationCap: 'مؤسسة تعليمية',
    Users: 'جمعية',
  },
};
