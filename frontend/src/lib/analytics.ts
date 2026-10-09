/**
 * The queue Plausible's install snippet creates.
 *
 * Plausible ships it as three lines of inline script next to the tag in the
 * head. It is here instead because the site's Content-Security-Policy does not
 * allow inline script, and widening `script-src` with `'unsafe-inline'` to
 * carry three lines would give up the single directive that does the most to
 * contain an XSS.
 *
 * What it does: the tracker is deferred, so it may not have arrived when our
 * own code first wants to record something. The stub collects those calls on
 * `plausible.q`, and the real tracker drains the queue when it loads. The
 * `||` matters - if the tracker is already there, this must not replace it.
 *
 * Pageviews need none of this. The tracker counts the first one itself and
 * follows `pushState`, so React Router navigations are already counted and
 * nothing here has to listen for them.
 */

/** The arguments Plausible accepts: an event name, then its options. */
type PlausibleArgs = [string, { props?: Record<string, string | number | boolean> }?];

interface PlausibleFn {
  (...args: PlausibleArgs): void;
  q?: PlausibleArgs[];
}

declare global {
  interface Window {
    plausible?: PlausibleFn;
  }
}

export function installAnalyticsQueue(): void {
  if (typeof window === 'undefined') return;

  const queued: PlausibleFn = (...args: PlausibleArgs) => {
    (queued.q = queued.q ?? []).push(args);
  };

  window.plausible = window.plausible ?? queued;
}

/**
 * Records a custom event, and does nothing at all if the tracker never loaded.
 *
 * Analytics must never be able to break a page: an ad blocker, an offline
 * visitor or a failed request are all ordinary, and none of them is a reason
 * for a donation button to stop working.
 */
export function track(
  event: string,
  props?: Record<string, string | number | boolean>,
): void {
  try {
    window.plausible?.(event, props ? { props } : undefined);
  } catch {
    // Deliberately silent.
  }
}
