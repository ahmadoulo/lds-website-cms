import {
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
  type LucideIcon,
} from 'lucide-react';

/**
 * Whitelisted icon set. Icons are stored in PostgreSQL by name, so the mapping
 * has to be explicit - a name that is not in this map falls back to a default
 * instead of crashing the render.
 */
export const CONTENT_ICONS: Record<string, LucideIcon> = {
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
