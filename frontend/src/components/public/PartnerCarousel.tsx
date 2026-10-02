import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PartnerCard } from './PartnerCard';
import { cn } from '../../lib/cn';
import { useLocale } from '../../context/LocaleContext';
import { useComponentsT } from '../../lib/i18n/dictionaries/components';
import type { Partner } from '../../lib/types';

/** Pixels per frame. Slow enough to read a name as it goes past. */
const DRIFT = 0.35;

/** How long a manual gesture suspends the drift. */
const RESUME_DELAY = 2500;

/**
 * A horizontal track of partners that only behaves like a carousel when it has
 * to.
 *
 * `width: fit-content` with `max-width: 100%` is what centres a short list and
 * makes a long one scroll, without `justify-content: safe center` - the `safe`
 * keyword is ignored before Safari 16 and would push the first cards out of
 * reach on iOS 15. The arrows appear only once the track actually overflows,
 * measured rather than guessed from a partner count.
 */
export const PartnerCarousel = ({ partners }: { partners: Partner[] }) => {
  const t = useComponentsT();
  const { isRtl } = useLocale();
  const trackRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<number | undefined>(undefined);

  /**
   * Which way `scrollLeft` has to move to travel forwards through the list.
   *
   * In a `dir="rtl"` scroll container the first card sits at `scrollLeft === 0`
   * exactly as it does in French, but moving on means going *down* into negative
   * numbers: the browser measures from the reading edge, which is the right one.
   * Every place this component moves the track by hand therefore multiplies by
   * this, and every place it reads a position takes an absolute value.
   */
  const forwards = isRtl ? -1 : 1;

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    // One pixel of tolerance: fractional layout widths make an exact
    // comparison report an overflow that does not exist.
    const scrollable = track.scrollWidth - track.clientWidth;
    // How far the track has travelled from its first card, whichever way the
    // page reads: negative in Arabic, positive in French, the same distance.
    const travelled = Math.abs(track.scrollLeft);

    setOverflows(scrollable > 1);
    setAtStart(travelled <= 1);
    setAtEnd(travelled >= scrollable - 1);
  }, []);

  useEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track) return undefined;

    // ResizeObserver catches a card reflowing without the window changing size,
    // but it is not universal (and absent from jsdom), so the window resize is
    // the floor rather than an assumption.
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure, partners.length]);

  /** Suspends the drift for a moment after any manual gesture. */
  const holdDrift = useCallback(() => {
    setPaused(true);
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), RESUME_DELAY);
  }, []);

  /*
    The drift moves `scrollLeft` rather than animating a transform, so the track
    stays a real scroll container: the wheel, a drag, the arrows and the keyboard
    all keep working, and the list is never trapped behind an animation that a
    reduced-motion setting would have to stop.
  */
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !overflows || paused) return undefined;

    // Someone who asked their system for less motion did not ask for this.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    if (typeof requestAnimationFrame === 'undefined') return undefined;

    let frame = 0;
    let carry = 0;

    const step = () => {
      const scrollable = track.scrollWidth - track.clientWidth;

      if (Math.abs(track.scrollLeft) >= scrollable - 1) {
        // Back to the first partner rather than reversing, so the order the
        // association chose is always read the same way round - and in Arabic
        // that first partner is the right-hand one, which is still 0.
        track.scrollLeft = 0;
        carry = 0;
      } else {
        // scrollLeft rounds to whole pixels; the remainder is carried over so
        // a sub-pixel speed is not silently floored to a standstill.
        carry += DRIFT;
        const whole = Math.floor(carry);
        if (whole >= 1) {
          track.scrollLeft += forwards * whole;
          carry -= whole;
        }
      }

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [overflows, paused, forwards]);

  useEffect(() => () => window.clearTimeout(resumeTimer.current), []);

  /** `1` moves on through the list, `-1` back towards the first partner. */
  const scrollBy = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;

    holdDrift();

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // A little under one viewport, so the card at the edge stays visible and
    // the reader keeps their place.
    track.scrollBy({
      left: forwards * direction * track.clientWidth * 0.8,
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  /*
    The arrow keys are physical, not logical: a reader of Arabic presses the key
    that points at the card they want, and that is the left one for the card
    further on. Mapping the key through the reading direction is what keeps the
    gesture matching what the eye sees.
  */
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollBy(isRtl ? -1 : 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollBy(isRtl ? 1 : -1);
    }
  };

  // A chevron is a direction, so it is chosen rather than mirrored: pointing
  // back towards the first partner means pointing right in Arabic.
  const PreviousIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        /* The group, not the list: putting role="group" on the <ul> would strip
           its implicit list role and stop it being announced as N items. */
        role="group"
        aria-label={t.partners.label}
        aria-roledescription={overflows ? t.partners.carousel : undefined}
        tabIndex={overflows ? 0 : -1}
        onKeyDown={onKeyDown}
        onScroll={measure}
        onPointerDown={holdDrift}
        onWheel={holdDrift}
        ref={trackRef}
        /* py-3 rather than pb-2: the cards lift on hover and draw a focus ring
           outside their box, and a scroll container clips both. */
        className="scrollbar-hidden overflow-x-auto scroll-px-5 py-3 outline-none focus-visible:ring-2 focus-visible:ring-blue"
      >
        {/* Safari strips the implicit list role when list-style is none, which
            Tailwind's reset sets: the role has to be stated. */}
        <ul role="list" className="mx-auto flex w-fit max-w-full gap-4 sm:gap-6">
          {partners.map((partner) => (
            <li key={partner.id} className="w-40 shrink-0 sm:w-48">
              <PartnerCard partner={partner} />
            </li>
          ))}
        </ul>
      </div>

      {overflows && (
        <>
          {/* The fade is the affordance that there is more to the side. It is
              keyed to the surface colour: `transparent` interpolates through
              grey in sRGB and leaves a visible veil. */}
          {/* The edges are logical - `start` is the right in Arabic - but the
              gradient has no logical form, so its direction is chosen. */}
          {!atStart && (
            <span
              className={cn(
                'pointer-events-none absolute inset-y-0 start-0 w-10 from-warm-muted to-warm-muted/0',
                isRtl ? 'bg-gradient-to-l' : 'bg-gradient-to-r',
              )}
              aria-hidden
            />
          )}
          {!atEnd && (
            <span
              className={cn(
                'pointer-events-none absolute inset-y-0 end-0 w-10 from-warm-muted to-warm-muted/0',
                isRtl ? 'bg-gradient-to-r' : 'bg-gradient-to-l',
              )}
              aria-hidden
            />
          )}

          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={atStart}
              aria-label={t.partners.previous}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy shadow-e1 ring-1 ring-navy/10 transition-colors hover:bg-navy hover:text-white disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-navy"
            >
              <PreviousIcon className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={atEnd}
              aria-label={t.partners.next}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy shadow-e1 ring-1 ring-navy/10 transition-colors hover:bg-navy hover:text-white disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-navy"
            >
              <NextIcon className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
