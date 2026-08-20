export type Localized = Record<string, string>;

export interface Media {
  id: string;
  originalName: string;
  storageKey: string;
  bucket: string;
  folder: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  altText: Localized | null;
  /** Absolute URL to the streaming endpoint, added by the API. */
  url: string;
  createdAt: string;
}

export interface Mission {
  id: string;
  title: Localized;
  description: Localized;
  icon: string | null;
  order: number;
  isPublished: boolean;
  imageId: string | null;
  image: Media | null;
}

export interface NewsCategory {
  id: string;
  name: Localized;
  slug: string;
  _count?: { news: number };
}

export interface NewsArticle {
  id: string;
  title: Localized;
  slug: string;
  excerpt: Localized;
  content: Localized;
  categoryId: string | null;
  category: NewsCategory | null;
  imageId: string | null;
  image: Media | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export interface GalleryImage {
  id: string;
  caption: Localized | null;
  order: number;
  albumId: string;
  mediaId: string;
  media: Media;
  album?: { id: string; title: Localized };
}

export interface GalleryAlbum {
  id: string;
  title: Localized;
  description: Localized | null;
  order: number;
  isPublished: boolean;
  images: GalleryImage[];
}

export interface Partner {
  id: string;
  name: string;
  icon: string | null;
  url: string | null;
  order: number;
  isPublished: boolean;
  logoId: string | null;
  logo: Media | null;
}

export interface ImpactStat {
  id: string;
  label: Localized;
  value: number;
  color: string;
  order: number;
  isPublished: boolean;
}

export interface DonationMethod {
  id: string;
  title: Localized;
  description: Localized;
  actionType: 'phone' | 'link' | 'contact' | 'email';
  actionData: string;
  actionLabel: Localized;
  iconColor: 'orange' | 'blue' | 'green' | 'navy';
  order: number;
  isPublished: boolean;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NavigationItem {
  id: string;
  label: Localized;
  href: string;
  order: number;
  parentId: string | null;
  children?: NavigationItem[];
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  userId: string | null;
  user: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  createdAt: string;
}

export interface SiteSettings {
  organization: {
    name: string;
    shortName: string;
    tagline: string;
    about: string;
    mission: string;
    quote: string;
    foundedYear: string;
  };
  global_contact: {
    email: string;
    phone: string;
    phoneSecondary: string;
    address: string;
  };
  global_social: {
    facebook: string;
    instagram: string;
    linkedin: string;
    youtube: string;
  };
  homepage: {
    heroTitle: string;
    heroSubtitle: string;
    heroBadgeTitle: string;
    heroBadgeSubtitle: string;
    heroImageId: string | null;
    aboutImageId: string | null;
    ctaQuote: string;
    ctaImageId: string | null;
    /** Resolved by the public API from the ids above. */
    heroImage?: Media | null;
    aboutImage?: Media | null;
    ctaImage?: Media | null;
  };
  seo: {
    title: string;
    description: string;
    keywords: string;
    ogImageId: string | null;
    /** Resolved by the public API from the id above. */
    ogImage?: Media | null;
  };
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** Reads the French value of a localized JSON field, with sensible fallbacks. */
export function t(value: Localized | null | undefined, fallback = ''): string {
  if (!value) return fallback;
  return value.fr || value.en || Object.values(value)[0] || fallback;
}
