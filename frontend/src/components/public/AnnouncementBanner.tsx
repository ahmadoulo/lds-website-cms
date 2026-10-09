import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Megaphone, Pause, Play, X } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import { useT } from '../../lib/i18n/useT';
import { localized, localizedOrSource } from '../../lib/i18n/resolve';
import { useBannerAnnouncements } from '../../lib/queries/publicHooks';
import { readServerBanner } from '../../lib/siteOrigin';
import { track } from '../../lib/analytics';
import { cn } from '../../lib/cn';

const DISMISSED_KEY = 'lds.banner.dismissed';
const ROTATE_MS = 8000;

function readDismissed(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(DISMISSED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeDismissed(ids: string[]) {
  try {
    // The last twenty are plenty; the list never grows without bound.
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids.slice(-20)));
  } catch {
    // Storage blocked: closed for this visit, which is still what was asked.
  }
}

interface Item {
  id: string;
  slug: string;
  text: string;
  scope: string;
}

/**
 * The site banner: what the association wants every visitor to see first.
 *
 * The server writes its announcements into the page, so the banner is there
 * on the first paint and never pushes the page down once it has loaded. The
 * API is read as well, for the other language when the visitor switches.
 *
 * A closed announcement stays closed - on every page and on the next visit -
 * and only that one: a new announcement still shows.
 */
export const AnnouncementBanner = () => {
  const t = useT().announcements.banner;
  const { locale, isRtl } = useLocale();
  const { pathname } = useLocation();
  const [serverItems] = useState(readServerBanner);
  const { data } = useBannerAnnouncements();
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion] = useState(
    () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  );

  const all: Item[] = useMemo(() => {
    if (data) {
      return data.map((row) => ({
        id: row.id,
        slug: row.slug,
        text: localized(row.bannerText, locale) || localizedOrSource(row.title, locale).text,
        scope: row.bannerScope,
      }));
    }
    return serverItems ?? [];
  }, [data, serverItems, locale]);

  const items = all.filter(
    (item) =>
      item.text &&
      !dismissed.includes(item.id) &&
      (item.scope === 'all' || pathname === '/') &&
      // Not over the article it points to.
      pathname !== `/actualites/${item.slug}`,
  );
  const count = items.length;
  const current = items[Math.min(index, count - 1)];
  const rotating = count > 1 && !paused && !hovered && !reducedMotion;

  useEffect(() => {
    if (!rotating) return undefined;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % count), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [rotating, count]);

  if (!current) return null;

  const go = (step: number) => setIndex((value) => (Math.min(value, count - 1) + step + count) % count);
  const close = () => {
    const next = [...dismissed, current.id];
    setDismissed(next);
    writeDismissed(next);
    track('Announcement Dismiss', { slug: current.slug });
  };

  const control =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-navy/10';

  return (
    <div
      role="region"
      aria-label={t.region}
      className="bg-green text-navy"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {/* One line at any width: a longer announcement truncates rather than
          changing the banner's height as it rotates. */}
      <div className="container-page flex h-11 items-center gap-2 text-caption sm:gap-3">
        <Megaphone className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden />
        <p className="min-w-0 flex-1" aria-live={rotating ? 'off' : 'polite'}>
          <Link
            to={`/actualites/${current.slug}`}
            onClick={() => track('Announcement Click', { placement: 'banner', slug: current.slug })}
            className="block truncate font-semibold underline-offset-4 hover:underline"
          >
            {current.text}
            <span className="ms-2 hidden font-bold sm:inline">{t.more}</span>
          </Link>
        </p>

        {count > 1 && (
          <div className="flex shrink-0 items-center">
            <button type="button" onClick={() => go(-1)} aria-label={t.previous} className={control}>
              {isRtl ? <ChevronRight className="h-4 w-4" aria-hidden /> : <ChevronLeft className="h-4 w-4" aria-hidden />}
            </button>
            <span className="hidden px-1 tabular-nums sm:inline">
              {t.position(Math.min(index, count - 1) + 1, count)}
            </span>
            {!reducedMotion && (
              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                aria-pressed={paused}
                aria-label={paused ? t.play : t.pause}
                className={control}
              >
                {paused ? <Play className="h-3.5 w-3.5" aria-hidden /> : <Pause className="h-3.5 w-3.5" aria-hidden />}
              </button>
            )}
            <button type="button" onClick={() => go(1)} aria-label={t.next} className={control}>
              {isRtl ? <ChevronLeft className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        )}

        <button type="button" onClick={close} aria-label={t.close} className={cn(control, '-me-1.5')}>
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
};
