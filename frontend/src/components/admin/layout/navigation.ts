import {
  BarChart3,
  Building2,
  FileText,
  HeartHandshake,
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
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Mirrors the server-side permission matrix. The backend enforces access; this
 * only avoids showing an editor links that would answer 403.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Pilotage',
    items: [
      { name: "Vue d'ensemble", href: '/admin', icon: LayoutDashboard, minRole: 'EDITOR' },
    ],
  },
  {
    title: 'Contenu',
    items: [
      { name: 'Actualités', href: '/admin/actualites', icon: FileText, minRole: 'EDITOR' },
      { name: "Domaines d'action", href: '/admin/missions', icon: Target, minRole: 'EDITOR' },
      { name: 'Galerie', href: '/admin/galerie', icon: Images, minRole: 'EDITOR' },
      { name: 'Médias', href: '/admin/medias', icon: ImageIcon, minRole: 'ADMIN' },
    ],
  },
  {
    title: 'Organisation',
    items: [
      { name: 'Chiffres clés', href: '/admin/impact', icon: BarChart3, minRole: 'ADMIN' },
      { name: 'Partenaires', href: '/admin/partenaires', icon: Building2, minRole: 'ADMIN' },
      { name: 'Nous soutenir', href: '/admin/soutien', icon: HeartHandshake, minRole: 'ADMIN' },
      { name: 'Navigation', href: '/admin/navigation', icon: Menu, minRole: 'ADMIN' },
      { name: 'Informations du site', href: '/admin/parametres', icon: Settings, minRole: 'ADMIN' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { name: 'Messages', href: '/admin/messages', icon: Mail, minRole: 'ADMIN', badge: 'unreadMessages' },
      { name: 'Utilisateurs', href: '/admin/utilisateurs', icon: Users, minRole: 'SUPER_ADMIN' },
      { name: "Journal d'activité", href: '/admin/journal', icon: ShieldCheck, minRole: 'SUPER_ADMIN' },
    ],
  },
];

/** Flat list used to resolve the current page title for the top bar. */
export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);
