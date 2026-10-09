import React, { useCallback, useEffect, useId, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Mail, X } from 'lucide-react';
import { useT } from '../../lib/i18n/useT';
import { cn } from '../../lib/cn';
import { NewsletterSignup, SUBSCRIBED_KEY, useNewsletterStatus } from './NewsletterSignup';

const DISMISSED_KEY = 'lds.newsletterPopup.dismissedAt';

/** How long a "no thanks" holds. */
export const SNOOZE_MS = 30 * 24 * 60 * 60_000;
/** Time on the site before the offer is made, if the visitor has not scrolled. */
export const DELAY_MS = 25_000;
/** How far down a page counts as having read it. */
const SCROLL_RATIO = 0.5;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Whether this visitor may be asked at all. */
export function mayOffer(now = Date.now()): boolean {
  if (read(SUBSCRIBED_KEY)) return false;
  const dismissed = Number(read(DISMISSED_KEY));
  return !(dismissed && now - dismissed < SNOOZE_MS);
}

/**
 * "Stay informed" - the newsletter offered while the visitor reads.
 *
 * Most visitors never reach the footer, so the offer comes to them. How it
 * comes is the whole design:
 *
 * - A card that slides up from the bottom, not a full-screen modal. It never
 *   covers what is being read or takes the focus away. A full-screen popup on
 *   arrival is what Google demotes in mobile results ("intrusive
 *   interstitials"), and what visitors close without reading.
 * - Only once the visitor has engaged: half a page read, or twenty-five
 *   seconds on the site. Never on arrival.
 * - Asked once. "No thanks" holds for thirty days; anyone who subscribed,
 *   from here or from the footer, is never asked again.
 * - Only when signing up actually works, and never on the newsletter pages
 *   themselves.
 */
export const NewsletterPopup = () => {
  const t = useT();
  const p = t.newsletter.popup;
  const titleId = useId();
  const { pathname } = useLocation();
  const status = useNewsletterStatus();

  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const excluded = pathname.startsWith('/newsletter');
  const eligible = Boolean(status.data?.available) && !excluded && !dismissed;

  useEffect(() => {
    if (!eligible || open || !mayOffer()) return undefined;

    const offer = () => setOpen(true);
    const timer = window.setTimeout(offer, DELAY_MS);

    const onScroll = () => {
      const { scrollY, innerHeight } = window;
      const height = document.documentElement.scrollHeight;
      // A real scroll, not a short page that is "half read" on arrival.
      if (scrollY > 200 && (scrollY + innerHeight) / height >= SCROLL_RATIO) offer();
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [eligible, open]);

  const close = useCallback(() => {
    setOpen(false);
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Blocked storage: it may be offered again next visit. Harmless.
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open || !eligible) return null;

  return (
    <div
      role="dialog"
      // Not modal: the page behind stays usable and focus is left alone.
      aria-modal="false"
      aria-labelledby={titleId}
      className={cn(
        'fixed inset-x-3 bottom-3 z-40 rounded-panel bg-white p-5 shadow-e4 ring-1 ring-navy/10',
        'sm:inset-x-auto sm:bottom-5 sm:end-5 sm:w-96',
        // Movement only for those who have not asked for less of it.
        'motion-safe:animate-rise-in',
      )}
    >
      <button
        type="button"
        onClick={close}
        aria-label={p.close}
        className="absolute end-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-navy/45 transition-colors hover:bg-navy/5 hover:text-navy"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <div className="mb-4 flex items-start gap-3 pe-8">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green/15 text-green"
        >
          <Mail className="h-5 w-5" />
        </span>
        <div>
          <h2 id={titleId} className="text-base font-bold text-navy">
            {p.title}
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-navy/65">{p.text}</p>
        </div>
      </div>

      <NewsletterSignup source="popup" tone="light" stacked />
    </div>
  );
};
