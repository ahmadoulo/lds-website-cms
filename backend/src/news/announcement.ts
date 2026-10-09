import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { sanitizePlainText } from '../common/sanitize';

/**
 * What an announcement can ask a visitor to do.
 *
 * Most point at something the site already manages - the contact form, the
 * association's phone and email, the donation page, its social accounts - so
 * nothing here can invent a number or an account. Only `page` and `external`
 * carry an address, and both are checked.
 */
export const ACTION_TYPES = [
  'contact',
  'call',
  'email',
  'donate',
  'newsletter',
  'social',
  'page',
  'external',
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export interface AnnouncementAction {
  type: ActionType;
  /** Overrides the default wording, per language. */
  label?: { fr?: string; ar?: string };
  /** For `page`: a path on this site. For `external`: an https address. */
  url?: string;
}

export interface AnnouncementContact {
  name?: string;
  phone?: string;
  email?: string;
}

const MAX_ACTIONS = 4;

/** Paths that are never a destination for a visitor. */
const PRIVATE_PATHS = /^\/(admin|api)(\/|$)/i;

function label(raw: unknown): AnnouncementAction['label'] {
  if (!raw || typeof raw !== 'object') return undefined;
  const value = raw as Record<string, unknown>;
  const clean = (text: unknown) =>
    typeof text === 'string' && text.trim() ? sanitizePlainText(text).slice(0, 60) : undefined;
  const result = { fr: clean(value.fr), ar: clean(value.ar) };
  return result.fr || result.ar ? result : undefined;
}

/** Validates and cleans the actions the editor sent. */
export function validateActions(input: unknown): AnnouncementAction[] {
  if (input === null || input === undefined) return [];
  if (!Array.isArray(input) || input.length > MAX_ACTIONS) {
    throw new BadRequestException(`Une annonce propose au plus ${MAX_ACTIONS} actions.`);
  }

  return input.map((raw: unknown) => {
    const action = raw as Record<string, unknown>;
    const type = action?.type as ActionType;
    if (!ACTION_TYPES.includes(type)) throw new BadRequestException('Action inconnue.');

    const result: AnnouncementAction = { type };
    const own = label(action.label);
    if (own) result.label = own;

    if (type === 'page') {
      const path = typeof action.url === 'string' ? action.url.trim() : '';
      // A path on this site: starts with one slash, not two (which a browser
      // reads as another host), and never the back-office or the API.
      if (!/^\/(?!\/)[^\s]*$/.test(path) || PRIVATE_PATHS.test(path)) {
        throw new BadRequestException('Le lien vers une page doit être un chemin du site, par exemple /nous-soutenir.');
      }
      result.url = path;
    }

    if (type === 'external') {
      const raw = typeof action.url === 'string' ? action.url.trim() : '';
      let url: URL;
      try {
        url = new URL(raw);
      } catch {
        throw new BadRequestException('Lien externe invalide.');
      }
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new BadRequestException('Un lien externe commence par https://');
      }
      result.url = url.toString();
    }

    return result;
  });
}

/** Validates the announcement's own contact, every part optional. */
export function validateContact(input: unknown): AnnouncementContact | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== 'object') throw new BadRequestException('Contact invalide.');
  const raw = input as Record<string, unknown>;
  const text = (value: unknown, max: number) =>
    typeof value === 'string' && value.trim() ? sanitizePlainText(value).slice(0, max) : undefined;

  const contact: AnnouncementContact = {
    name: text(raw.name, 120),
    phone: text(raw.phone, 40),
    email: text(raw.email, 254),
  };
  if (contact.phone && !/^[+0-9 ().-]{6,40}$/.test(contact.phone)) {
    throw new BadRequestException('Numéro de téléphone invalide.');
  }
  if (contact.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email)) {
    throw new BadRequestException('Adresse email invalide.');
  }
  return contact.name || contact.phone || contact.email ? contact : null;
}

// ------------------------------------------------------------- visibility

/**
 * What the public may see at all.
 *
 * Published, not archived, and not scheduled for later. A published article
 * with no date is a legacy row from before scheduling existed, and stays
 * visible: this must not hide anything that was public yesterday.
 */
export function visibleNow(now = new Date()): Prisma.NewsWhereInput {
  return {
    isPublished: true,
    archivedAt: null,
    OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
  };
}

/**
 * The detail page: as above, except that an archived article still answers.
 * Its address was shared; it should say "archived", not 404.
 */
export function reachableNow(now = new Date()): Prisma.NewsWhereInput {
  return {
    isPublished: true,
    OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
  };
}

/** Within the window an announcement is pushed at visitors. */
function inWindow(now: Date): Prisma.NewsWhereInput[] {
  return [
    { OR: [{ visibleFrom: null }, { visibleFrom: { lte: now } }] },
    { OR: [{ visibleUntil: null }, { visibleUntil: { gte: now } }] },
  ];
}

export function bannerWhere(now = new Date()): Prisma.NewsWhereInput {
  return { AND: [visibleNow(now), { showInBanner: true }, ...inWindow(now)] };
}

/**
 * "À venir": only what has not happened yet.
 *
 * An activity that has ended is not upcoming, whatever its window says. One
 * with only a start date stays listed for the whole of that day - a
 * distribution at 9:00 is still today's news at 15:00.
 */
export function upcomingWhere(now = new Date()): Prisma.NewsWhereInput {
  const startOfToday = new Date(now);
  // Dakar is UTC all year, so the UTC day is the visitor's day.
  startOfToday.setUTCHours(0, 0, 0, 0);

  return {
    AND: [
      visibleNow(now),
      { showInUpcoming: true },
      ...inWindow(now),
      {
        OR: [
          { eventEndsAt: { gte: now } },
          { eventEndsAt: null, eventStartsAt: { gte: startOfToday } },
          { eventEndsAt: null, eventStartsAt: null },
        ],
      },
    ],
  };
}

export type NewsStatus = 'draft' | 'scheduled' | 'published' | 'archived';

/** The four states an editor reasons in, as a database filter. */
export function statusWhere(status: NewsStatus, now = new Date()): Prisma.NewsWhereInput {
  switch (status) {
    case 'archived':
      return { archivedAt: { not: null } };
    case 'draft':
      return { isPublished: false, archivedAt: null };
    case 'scheduled':
      return { isPublished: true, archivedAt: null, publishedAt: { gt: now } };
    case 'published':
      return visibleNow(now);
  }
}
