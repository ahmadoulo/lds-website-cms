import type {
  AnnouncementAction,
  AnnouncementActionType,
  Localized,
  NewsArticle,
} from './types';

/**
 * The announcement half of the news editor, as plain functions: the form
 * holds strings, the API takes dates, nulls and arrays, and the conversion is
 * where a cleared field silently surviving would come from - so it is tested
 * here rather than through the dialog.
 */

export type ArticleStatus = 'draft' | 'scheduled' | 'published' | 'archived';

/** The state an editor thinks in, from the four fields that make it. */
export function articleStatus(
  article: Pick<NewsArticle, 'isPublished' | 'publishedAt' | 'archivedAt'>,
  now = Date.now(),
): ArticleStatus {
  if (article.archivedAt) return 'archived';
  if (!article.isPublished) return 'draft';
  if (article.publishedAt && new Date(article.publishedAt).getTime() > now) return 'scheduled';
  return 'published';
}

/** ISO -> the value a datetime-local input shows, in the editor's clock. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** A datetime-local value -> ISO, or null when the field was emptied. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export interface ActionRow {
  type: AnnouncementActionType;
  labelFr: string;
  labelAr: string;
  url: string;
}

export interface AnnouncementFormValues {
  publishedAt: string;
  eventStartsAt: string;
  eventEndsAt: string;
  visibleFrom: string;
  visibleUntil: string;
  location: Localized;
  practicalInfo: Localized;
  bannerText: Localized;
  showInBanner: boolean;
  bannerScope: 'home' | 'all';
  showInUpcoming: boolean;
  isFeatured: boolean;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  actions: ActionRow[];
}

export const EMPTY_ANNOUNCEMENT: AnnouncementFormValues = {
  publishedAt: '',
  eventStartsAt: '',
  eventEndsAt: '',
  visibleFrom: '',
  visibleUntil: '',
  location: {},
  practicalInfo: {},
  bannerText: {},
  showInBanner: false,
  bannerScope: 'home',
  showInUpcoming: false,
  isFeatured: false,
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  actions: [],
};

export const ACTION_TYPES: readonly AnnouncementActionType[] = [
  'contact',
  'call',
  'email',
  'donate',
  'newsletter',
  'social',
  'page',
  'external',
];

/** Only these two carry an address of their own; the rest use the site's. */
export const actionNeedsUrl = (type: AnnouncementActionType) => type === 'page' || type === 'external';

export function announcementFormValues(article: NewsArticle): AnnouncementFormValues {
  return {
    publishedAt: toLocalInput(article.publishedAt),
    eventStartsAt: toLocalInput(article.eventStartsAt),
    eventEndsAt: toLocalInput(article.eventEndsAt),
    visibleFrom: toLocalInput(article.visibleFrom),
    visibleUntil: toLocalInput(article.visibleUntil),
    location: article.location ?? {},
    practicalInfo: article.practicalInfo ?? {},
    bannerText: article.bannerText ?? {},
    showInBanner: Boolean(article.showInBanner),
    bannerScope: article.bannerScope === 'all' ? 'all' : 'home',
    showInUpcoming: Boolean(article.showInUpcoming),
    isFeatured: Boolean(article.isFeatured),
    contactName: article.contact?.name ?? '',
    contactPhone: article.contact?.phone ?? '',
    contactEmail: article.contact?.email ?? '',
    actions: (article.actions ?? []).map((action) => ({
      type: action.type,
      labelFr: action.label?.fr ?? '',
      labelAr: action.label?.ar ?? '',
      url: action.url ?? '',
    })),
  };
}

/**
 * Both languages are always sent, empty included: the API merges a localized
 * field language by language and deletes one sent empty, so leaving a key out
 * would keep the text the editor just erased.
 */
const both = (value: Localized) => {
  const fr = value.fr?.trim() ?? '';
  const ar = value.ar?.trim() ?? '';
  return fr || ar ? { fr, ar } : null;
};

export function announcementPayload(values: AnnouncementFormValues, isEditing: boolean) {
  const localizedField = (value: Localized) =>
    isEditing ? { fr: value.fr?.trim() ?? '', ar: value.ar?.trim() ?? '' } : both(value);

  const actions: AnnouncementAction[] = values.actions.map((row) => {
    const label = {
      ...(row.labelFr.trim() ? { fr: row.labelFr.trim() } : {}),
      ...(row.labelAr.trim() ? { ar: row.labelAr.trim() } : {}),
    };
    return {
      type: row.type,
      ...(Object.keys(label).length ? { label } : {}),
      ...(actionNeedsUrl(row.type) && row.url.trim() ? { url: row.url.trim() } : {}),
    };
  });

  return {
    // No date: unchanged on edit, "now" on create.
    ...(values.publishedAt ? { publishedAt: fromLocalInput(values.publishedAt) } : {}),
    eventStartsAt: fromLocalInput(values.eventStartsAt),
    eventEndsAt: fromLocalInput(values.eventEndsAt),
    visibleFrom: fromLocalInput(values.visibleFrom),
    visibleUntil: fromLocalInput(values.visibleUntil),
    location: localizedField(values.location),
    practicalInfo: localizedField(values.practicalInfo),
    bannerText: localizedField(values.bannerText),
    showInBanner: values.showInBanner,
    bannerScope: values.bannerScope,
    showInUpcoming: values.showInUpcoming,
    isFeatured: values.isFeatured,
    contact: {
      name: values.contactName.trim(),
      phone: values.contactPhone.trim(),
      email: values.contactEmail.trim(),
    },
    actions,
  };
}

/** Whether the section has anything in it, to open it on edit. */
export function hasAnnouncement(values: AnnouncementFormValues): boolean {
  return Boolean(
    values.eventStartsAt ||
      values.visibleFrom ||
      values.visibleUntil ||
      values.location.fr ||
      values.location.ar ||
      values.practicalInfo.fr ||
      values.showInBanner ||
      values.showInUpcoming ||
      values.isFeatured ||
      values.contactName ||
      values.contactPhone ||
      values.contactEmail ||
      values.actions.length,
  );
}
