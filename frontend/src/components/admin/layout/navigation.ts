import {
  BarChart3,
  BookOpen,
  Building2,
  FileText,
  HeartHandshake,
  Home,
  Images,
  ImageIcon,
  LayoutDashboard,
  Mail,
  Menu,
  Settings,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react';
import type { Role } from '../../../context/AuthContext';

export interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  /** Minimum role required; items above the user's role are hidden. */
  minRole: Role;
  /** Key of the dashboard stats badge to display, if any. */
  badge?: 'unreadMessages';
  /** Public page this section renders on, for the Preview button. */
  publicPath?: string;
  /** One-line reminder of what lives here. */
  hint?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Mirrors the server-side permission matrix. The backend enforces access; this
 * only avoids showing an editor links that would answer 403.
 */
/**
 * Mirrors the public site, page by page, so "I want to change that part of the
 * site" maps to one obvious entry. `publicPath` is what the Preview button
 * opens, and doubles as the hint shown under each label.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Pilotage',
    items: [{ name: "Vue d'ensemble", href: '/admin', icon: LayoutDashboard, minRole: 'EDITOR' }],
  },
  {
    title: 'Contenu du site',
    items: [
      {
        name: 'Accueil',
        href: '/admin/parametres?section=homepage',
        icon: Home,
        minRole: 'ADMIN',
        publicPath: '/',
        hint: 'Bandeau, présentation, appel à l’action',
      },
      {
        name: 'À propos',
        href: '/admin/parametres?section=organization',
        icon: BookOpen,
        minRole: 'ADMIN',
        publicPath: '/a-propos',
        hint: 'Présentation, mission, citation',
      },
      {
        name: 'Nos actions',
        href: '/admin/missions',
        icon: Target,
        minRole: 'EDITOR',
        publicPath: '/nos-actions',
        hint: "Domaines d'intervention",
      },
      {
        name: 'Actualités',
        href: '/admin/actualites',
        icon: FileText,
        minRole: 'EDITOR',
        publicPath: '/actualites',
        hint: 'Articles et événements',
      },
      {
        name: 'Galerie',
        href: '/admin/galerie',
        icon: Images,
        minRole: 'EDITOR',
        publicPath: '/galerie',
        hint: 'Albums et photos',
      },
      {
        name: 'Impact',
        href: '/admin/impact',
        icon: BarChart3,
        minRole: 'ADMIN',
        publicPath: '/impact',
        hint: 'Chiffres clés',
      },
      {
        name: 'Partenaires',
        href: '/admin/partenaires',
        icon: Building2,
        minRole: 'ADMIN',
        publicPath: '/partenaires',
      },
      {
        name: 'Nous soutenir',
        href: '/admin/soutien',
        icon: HeartHandshake,
        minRole: 'ADMIN',
        publicPath: '/nous-soutenir',
        hint: 'Wave, Orange Money, bénévolat',
      },
      {
        name: 'Contact',
        href: '/admin/messages',
        icon: Mail,
        minRole: 'ADMIN',
        publicPath: '/contact',
        badge: 'unreadMessages',
        hint: 'Messages reçus du formulaire',
      },
    ],
  },
  {
    title: 'Bibliothèque',
    items: [
      {
        name: 'Médias',
        href: '/admin/medias',
        icon: ImageIcon,
        minRole: 'ADMIN',
        hint: 'Toutes les images du site',
      },
    ],
  },
  {
    title: 'Configuration',
    items: [
      {
        name: 'Paramètres du site',
        href: '/admin/parametres?section=branding',
        icon: Settings,
        minRole: 'ADMIN',
        hint: 'Logo, coordonnées, réseaux, SEO',
      },
      { name: 'Menu de navigation', href: '/admin/navigation', icon: Menu, minRole: 'ADMIN' },
      { name: 'Utilisateurs', href: '/admin/utilisateurs', icon: Users, minRole: 'SUPER_ADMIN' },
      {
        name: "Journal d'activité",
        href: '/admin/journal',
        icon: ShieldCheck,
        minRole: 'SUPER_ADMIN',
      },
    ],
  },
];

/** Flat list used to resolve the current page title for the top bar. */
export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);
