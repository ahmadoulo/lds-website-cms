import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PartnerCard } from './PartnerCard';
import type { Partner } from '../../lib/types';

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
  const trackRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    // One pixel of tolerance: fractional layout widths make an exact
    // comparison report an overflow that does not exist.
    const scrollable = track.scrollWidth - track.clientWidth;
    setOverflows(scrollable > 1);
    setAtStart(track.scrollLeft <= 1);
    setAtEnd(track.scrollLeft >= scrollable - 1);
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

  const scrollBy = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;

    // Someone who asked their system for less motion means it here too.
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // A little under one viewport, so the card at the edge stays visible and
    // the reader keeps their place.
    track.scrollBy({
      left: direction * track.clientWidth * 0.8,
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollBy(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollBy(-1);
    }
  };

  return (
    <div className="relative">
      <div
        /* The group, not the list: putting role="group" on the <ul> would strip
           its implicit list role and stop it being announced as N items. */
        role="group"
        aria-label="Nos partenaires"
        aria-roledescription={overflows ? 'carrousel' : undefined}
        tabIndex={overflows ? 0 : -1}
        onKeyDown={onKeyDown}
        onScroll={measure}
        ref={trackRef}
        /* py-3 rather than pb-2: the cards lift on hover and draw a focus ring
           outside their box, and a scroll container clips both. */
        className="snap-x snap-mandatory overflow-x-auto scroll-px-5 py-3 outline-none focus-visible:ring-2 focus-visible:ring-blue"
      >
        {/* Safari strips the implicit list role when list-style is none, which
            Tailwind's reset sets: the role has to be stated. */}
        <ul role="list" className="mx-auto flex w-fit max-w-full gap-4 sm:gap-6">
          {partners.map((partner) => (
            <li key={partner.id} className="w-40 shrink-0 snap-start sm:w-48">
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
          {!atStart && (
            <span
              className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-warm-muted to-warm-muted/0"
              aria-hidden
            />
          )}
          {!atEnd && (
            <span
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-warm-muted to-warm-muted/0"
              aria-hidden
            />
          )}

          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={atStart}
              aria-label="Partenaires précédents"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy shadow-e1 ring-1 ring-navy/10 transition-colors hover:bg-navy hover:text-white disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-navy"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={atEnd}
              aria-label="Partenaires suivants"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy shadow-e1 ring-1 ring-navy/10 transition-colors hover:bg-navy hover:text-white disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-navy"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
