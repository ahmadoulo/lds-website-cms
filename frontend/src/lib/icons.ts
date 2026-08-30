import {
  Backpack,
  Briefcase,
  Building2,
  GraduationCap,
  HandHeart,
  Heart,
  HeartPulse,
  Landmark,
  Leaf,
  Smartphone,
  Sprout,
  Target,
  TreePine,
  Users,
  Utensils,
  Droplets,
  BookOpen,
  Stethoscope,
  HandCoins,
  Home,
  School,
  Trees,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';

/**
 * Whitelisted icon set. Icons are stored in PostgreSQL by name, so the mapping
 * has to be explicit - a name that is not in this map falls back to a default
 * instead of crashing the render.
 */
export const CONTENT_ICONS: Record<string, LucideIcon> = {
  Backpack,
  HandCoins,
  Home,
  School,
  Trees,
  UserCheck,
  GraduationCap,
  BookOpen,
  HeartPulse,
  Stethoscope,
  TreePine,
  Leaf,
  Sprout,
  Briefcase,
  HandHeart,
  Heart,
  Users,
  Utensils,
  Droplets,
  Landmark,
  Building2,
  Smartphone,
  Target,
};

export const MISSION_ICON_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'GraduationCap', label: 'Éducation (chapeau de diplômé)' },
  { value: 'BookOpen', label: 'Éducation (livre)' },
  { value: 'HeartPulse', label: 'Santé (pouls)' },
  { value: 'Stethoscope', label: 'Santé (stéthoscope)' },
  { value: 'TreePine', label: 'Environnement (arbre)' },
  { value: 'Leaf', label: 'Environnement (feuille)' },
  { value: 'Sprout', label: 'Agriculture (pousse)' },
  { value: 'Briefcase', label: 'Insertion professionnelle' },
  { value: 'HandHeart', label: 'Solidarité' },
  { value: 'Users', label: 'Communauté' },
  { value: 'Utensils', label: 'Alimentation' },
  { value: 'Droplets', label: 'Accès à l\u2019eau' },
];

/**
 * Pictograms for the key figures. Chosen to read at a glance next to a number,
 * which is why they lean concrete (a backpack, a tree) rather than abstract.
 */
export const IMPACT_ICON_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Backpack', label: 'Kits scolaires (sac à dos)' },
  { value: 'GraduationCap', label: 'Élèves accompagnés (diplôme)' },
  { value: 'School', label: 'Établissements (école)' },
  { value: 'BookOpen', label: 'Formation (livre)' },
  { value: 'Stethoscope', label: 'Patients soignés (stéthoscope)' },
  { value: 'HeartPulse', label: 'Santé (pouls)' },
  { value: 'Trees', label: 'Arbres plantés (forêt)' },
  { value: 'Leaf', label: 'Environnement (feuille)' },
  { value: 'Droplets', label: "Accès à l'eau (gouttes)" },
  { value: 'Utensils', label: 'Repas distribués (couverts)' },
  { value: 'Users', label: 'Bénéficiaires (personnes)' },
  { value: 'UserCheck', label: 'Bénévoles (personne validée)' },
  { value: 'HandCoins', label: 'Dons collectés (main et pièces)' },
  { value: 'Home', label: 'Familles aidées (maison)' },
  { value: 'HandHeart', label: 'Actions solidaires (main et cœur)' },
];

export const PARTNER_ICON_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Landmark', label: 'Institution' },
  { value: 'Building2', label: 'Entreprise' },
  { value: 'HeartPulse', label: 'Santé' },
  { value: 'Smartphone', label: 'Opérateur mobile' },
  { value: 'GraduationCap', label: 'Établissement scolaire' },
  { value: 'Users', label: 'Association' },
];

export function resolveIcon(name: string | null | undefined): LucideIcon {
  return (name && CONTENT_ICONS[name]) || Target;
}
