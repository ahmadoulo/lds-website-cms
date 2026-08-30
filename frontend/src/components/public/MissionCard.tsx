import React from 'react';
import { ImageIcon } from 'lucide-react';
import { resolveIcon } from '../../lib/icons';
import { t, type Mission } from '../../lib/types';

/**
 * The logo gives the brand three equal accents; navy is the structural colour,
 * never an accent. Cards rotate through the three so no two neighbours match.
 */
const ACCENTS = ['bg-green', 'bg-blue', 'bg-orange'];

export const MissionCard = ({ mission, index }: { mission: Mission; index: number }) => {
  const Icon = resolveIcon(mission.icon);
  const accent = ACCENTS[index % ACCENTS.length];

  return (
    <article className="group flex h-full flex-col rounded-card bg-white shadow-e2 ring-1 ring-navy/5 transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-e3">
      {/*
        The clipping lives on this wrapper, not on the element that holds the
        badge: `overflow-hidden` on the parent was slicing the badge in half.
      */}
      <div className="relative">
        <div className="aspect-[16/10] overflow-hidden rounded-t-card bg-warm-muted">
          {mission.image ? (
            <img
              src={mission.image.url}
              alt={mission.image.altText?.fr || t(mission.title)}
              loading="lazy"
              decoding="async"
              width={1200}
              height={750}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-8 w-8 text-navy/15" aria-hidden />
            </div>
          )}
        </div>

        <span
          className={`absolute -bottom-6 left-6 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-e2 ring-4 ring-white ${accent}`}
          aria-hidden
        >
          <Icon className="h-6 w-6" />
        </span>
      </div>

      <div className="flex flex-1 flex-col px-6 pb-7 pt-11">
        <h3 className="mb-3 text-h3 text-navy">{t(mission.title)}</h3>
        <p className="text-body text-navy/70">{t(mission.description)}</p>
      </div>
    </article>
  );
};
