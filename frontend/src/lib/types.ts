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
  /** Human-readable list of the places this file is used, added by the API. */
  usedIn?: string[];
}

export interface Mission {
  id: string;
  title: Localized;
  description: Localized;
  /** Optional HTML long form, shown only in the detail dialog. */
  content: Localized | null;
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
  /** lucide-react icon name, or null to show the figure alone. */
  icon: string | null;
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
  /** Mobile money / bank provider, when this method is one. */
  provider: string | null;
  beneficiary: string | null;
  /** Official payment link. Nothing is ever fabricated in its absence. */
  paymentLink: string | null;
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
  branding: {
    logoId: string | null;
    logoDarkId: string | null;
    faviconId: string | null;
    /** Shown when no logo is uploaded. */
    wordmark: string;
    wordmarkAccent: string;
    logoHeight: number;
    /** Resolved by the public API from the ids above. */
    logo?: Media | null;
    logoDark?: Media | null;
    favicon?: Media | null;
  };
  organization: {
    /* The registered name is the same in both languages; its Arabic reading
       lives in the interface dictionary, not in the database. */
    name: string;
    shortName: string;
    tagline: Localized;
    about: Localized;
    mission: Localized;
    quote: Localized;
    foundedYear: string;
  };
  global_contact: {
    /* Dialled and clicked, not read: these stay single-valued. */
    email: string;
    phone: string;
    phoneSecondary: string;
    address: Localized;
  };
  global_social: {
    facebook: string;
    instagram: string;
    linkedin: string;
    youtube: string;
  };
  homepage: {
    heroTitle: Localized;
    heroSubtitle: Localized;
    heroBadgeTitle: Localized;
    heroBadgeSubtitle: Localized;
    heroImageId: string | null;
    aboutImageId: string | null;
    ctaQuote: Localized;
    ctaImageId: string | null;
    /** Resolved by the public API from the ids above. */
    heroImage?: Media | null;
    aboutImage?: Media | null;
    ctaImage?: Media | null;
  };
  seo: {
    title: Localized;
    description: Localized;
    keywords: Localized;
    ogImageId: string | null;
    /** Resolved by the public API from the id above. */
    ogImage?: Media | null;
    /**
     * Per-page metadata, keyed by route.
     *
     * The server writes these into the HTML a crawler receives; the browser
     * writes the same values after a client-side navigation. One source, so
     * the two cannot drift apart.
     */
    pages?: Record<string, { title?: Localized; description?: Localized } | undefined>;
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

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

export type EmailStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

export type EmailPurpose = 'contact' | 'notification' | 'newsletter';

export interface EmailIdentity {
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
}

/** What the API returns. The password is never part of it. */
export interface EmailSettings {
  enabled: boolean;
  host: string | null;
  port: number | null;
  security: 'tls' | 'starttls' | 'none';
  username: string | null;
  hasPassword: boolean;
  fromName: string | null;
  fromEmail: string | null;
  replyToName: string | null;
  replyToEmail: string | null;
  contactInbox: string | null;
  adminInbox: string | null;
  identities: Partial<Record<EmailPurpose, EmailIdentity>>;
  batchSize: number;
  ratePerMinute: number;
  siteUrl: string | null;
  siteUrlFromEnvironment: string | null;
  /** The administrator's own address, offered as a value; not saved until they save. */
  detectedSiteUrl?: string | null;
  signature: Localized;
  privacyPolicyUrl: string | null;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestError: string | null;
  encryptionReady: boolean;
  warnings: string[];
}

export interface EmailMessageRow {
  id: string;
  kind: string;
  toEmail: string;
  toName: string | null;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  subject: string;
  locale: string;
  status: EmailStatus;
  attempts: number;
  nextAttemptAt: string;
  error: string | null;
  contactMessageId: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The detail view adds the body, for the preview. */
export interface EmailMessageDetail extends EmailMessageRow {
  html: string;
  text: string;
}

export interface EmailTemplate {
  key: string;
  name: string;
  audience: 'visitor' | 'team';
  variables: Record<string, string>;
  subject: Localized;
  html: Localized;
  text: Localized;
  isActive: boolean;
  updatedAt: string | null;
  unknownVariables: string[];
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface TestResult {
  ok: boolean;
  message: string;
}

export interface DnsRecordCheck {
  found: boolean;
  record: string | null;
  advice: string | null;
}

export interface DnsReport {
  domain: string | null;
  spf: DnsRecordCheck;
  dmarc: DnsRecordCheck & { policy: string | null };
  dkim: { checkable: false; advice: string };
  checkedAt: string;
}

export interface EmailOverview {
  smtp: {
    configured: boolean;
    enabled: boolean;
    lastTestAt: string | null;
    lastTestOk: boolean | null;
    warnings: string[];
    encryptionReady: boolean;
  };
  periodDays: number;
  counts: Record<EmailStatus, number>;
  failureRate: number | null;
  oldestPendingAt: string | null;
  recentFailures: EmailMessageRow[];
  contacts: {
    unread: number;
    recent: Array<{ id: string; name: string; subject: string; isRead: boolean; createdAt: string }>;
  };
}
