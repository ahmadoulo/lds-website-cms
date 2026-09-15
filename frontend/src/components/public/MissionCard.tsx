import React from 'react';
import { ChevronRight, ImageIcon } from 'lucide-react';
import { resolveIcon } from '../../lib/icons';
import { t, type Mission } from '../../lib/types';

/**
 * The logo gives the brand three equal accents; navy is the structural colour,
 * never an accent. Cards rotate through the three so no two neighbours match.
 */
const ACCENTS = ['bg-green', 'bg-blue', 'bg-orange'];

/**
 * One component, two compositions.
 *
 * On a phone, five stacked boxes with a wide image on top read as a pile of
 * squares and push the last pillar far below the fold, so the item becomes an
 * editorial row: a small square thumbnail, the title beside it, the description
 * under. From `sm` upwards it is the validated desktop card, unchanged.
 */
export const MissionCard = ({
  mission,
  index,
  onOpen,
}: {
  mission: Mission;
  index: number;
  onOpen: () => void;
}) => {
  const Icon = resolveIcon(mission.icon);
  const accent = ACCENTS[index % ACCENTS.length];

  const image = mission.image ? (
    <img
      src={mission.image.url}
      alt={mission.image.altText?.fr || t(mission.title)}
      loading="lazy"
      decoding="async"
      width={1200}
      height={750}
      className="h-full w-full object-cover transition-transform duration-500 sm:group-hover:scale-[1.04]"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center">
      <ImageIcon className="h-6 w-6 text-navy/15 sm:h-8 sm:w-8" aria-hidden />
    </div>
  );

  return (
    /*
      The whole card opens the domain, but only the title is a real button: its
      ::after covers the card, so there is exactly one tab stop and no
      interactive element nested inside another.
    */
    <article className="group relative flex h-full items-start gap-4 rounded-card bg-white p-3 shadow-e1 ring-1 ring-navy/5 transition-[transform,box-shadow] duration-300 focus-within:ring-2 focus-within:ring-blue sm:block sm:p-0 sm:shadow-e2 sm:hover:-translate-y-1.5 sm:hover:shadow-e3">
      <div className="relative w-24 shrink-0 sm:w-auto">
        {/*
          The clipping lives here, not on the element holding the badge:
          `overflow-hidden` on the parent was slicing the badge in half.
        */}
        <div className="aspect-square overflow-hidden rounded-xl bg-warm-muted sm:aspect-[16/10] sm:rounded-b-none sm:rounded-t-card">
          {image}
        </div>

        {/* The overlapping badge only has room in the vertical composition. */}
        <span
          className={`absolute -bottom-6 left-6 hidden h-14 w-14 items-center justify-center rounded-2xl text-white shadow-e2 ring-4 ring-white sm:flex ${accent}`}
          aria-hidden
        >
          <Icon className="h-6 w-6" />
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col py-0.5 sm:px-6 sm:pb-7 sm:pt-11">
        <h3 className="mb-1.5 flex items-center gap-2 text-h3 text-navy sm:mb-3 sm:block">
          {/* On the row layout the accent travels with the title instead. */}
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white sm:hidden ${accent}`}
            aria-hidden
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <button
            type="button"
            onClick={onOpen}
            aria-haspopup="dialog"
            /* `cursor` is inherited, so the ::after overlay that covers the card
               takes the pointer with it. Without this the whole card is
               clickable but nothing says so. */
            className="min-w-0 cursor-pointer text-left outline-none after:absolute after:inset-0 after:rounded-card after:content-['']"
          >
            {/* No extra label here: the text of this button is also the text of
                the heading that wraps it, and anything added would be read as
                part of the heading in a screen reader's headings list. */}
            {t(mission.title)}
          </button>
        </h3>
        <p className="line-clamp-3 text-caption text-navy/70 sm:line-clamp-none sm:text-body">
          {t(mission.description)}
        </p>

        {/*
          On a phone the whole card is already tappable and the fold is what the
          mobile pass was fighting for, so the affordance costs a line there for
          nothing. On desktop it is what tells the visitor the card opens.
        */}
        <span className="mt-4 hidden items-center text-caption font-bold text-orange sm:inline-flex">
          En savoir plus
          <ChevronRight
            className="ml-1 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden
          />
        </span>
      </div>
    </article>
  );
};
