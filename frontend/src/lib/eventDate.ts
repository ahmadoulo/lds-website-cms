import { INTL_LOCALE } from './i18n/dictionaries/components';
import type { Locale } from './i18n/locale';

/**
 * Louga's clock. An activity at 9 h in Louga is at 9 h for a reader abroad
 * too: the date is the event's, not the reader's.
 */
export const EVENT_TIME_ZONE = 'Africa/Dakar';

/** Midnight in Louga means the editor entered a day, not a time. */
function hasTime(date: Date): boolean {
  const [hours, minutes] = new Intl.DateTimeFormat('en-GB', {
    timeZone: EVENT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(date)
    .split(':');
  return hours !== '00' || minutes !== '00';
}

/**
 * "12 octobre 2026, 09:00 – 12:00", "12 – 14 octobre 2026", or one day alone.
 * The range is laid out by Intl, which knows not to repeat the month or the
 * year, in both languages.
 */
export function formatEventDate(
  start: string | null | undefined,
  end: string | null | undefined,
  locale: Locale,
): string {
  if (!start) return '';
  const from = new Date(start);
  const to = end ? new Date(end) : null;
  if (Number.isNaN(from.getTime())) return '';

  const withTime = hasTime(from) || (to ? hasTime(to) : false);
  const format = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone: EVENT_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });

  if (!to || Number.isNaN(to.getTime()) || to.getTime() === from.getTime()) {
    return format.format(from);
  }
  try {
    return format.formatRange(from, to);
  } catch {
    return `${format.format(from)} – ${format.format(to)}`;
  }
}
