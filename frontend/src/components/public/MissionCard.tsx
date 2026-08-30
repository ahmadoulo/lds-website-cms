import React from 'react';
import { ImageIcon } from 'lucide-react';
import { resolveIcon } from '../../lib/icons';
import { t, type Mission } from '../../lib/types';

/** Rotated so adjacent cards never share an accent. */
const ACCENTS = [
  { badge: 'bg-green', rule: 'bg-green' },
  { badge: 'bg-blue', rule: 'bg-blue' },
  { badge: 'bg-orange', rule: 'bg-orange' },
  { badge: 'bg-navy', rule: 'bg-navy' },
];

export const MissionCard = ({ mission, index }: { mission: Mission; index: number }) => {
  const Icon = resolveIcon(mission.icon);
  const accent = ACCENTS[index % ACCENTS.length];

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card bg-white shadow-e2 ring-1 ring-navy/5 transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-e3">
      <div className="relative aspect-[16/10] overflow-hidden bg-warm-muted">
        {mission.image ? (
          <img
            src={mission.image.url}
            alt={mission.image.altText?.fr || t(mission.title)}
            loading="lazy"
            decoding="async"
            width={1200}
            height={750}
            /* A restrained zoom signals the card is interactive without moving the layout. */
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-8 w-8 text-navy/15" aria-hidden />
          </div>
        )}

        {/* Keeps the badge legible whatever the photograph behind it. */}
        <div
          className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-navy/35 to-transparent"
          aria-hidden
        />

        <span
          className={`absolute -bottom-6 left-6 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-e2 ring-4 ring-white ${accent.badge}`}
          aria-hidden
        >
          <Icon className="h-6 w-6" />
        </span>
      </div>

      <div className="flex flex-1 flex-col px-6 pb-7 pt-11">
        <h3 className="mb-3 text-h3 text-navy">{t(mission.title)}</h3>
        <p className="text-body text-navy/70">{t(mission.description)}</p>
        <span
          className={`mt-6 h-1 w-10 rounded-full transition-all duration-300 group-hover:w-16 ${accent.rule}`}
          aria-hidden
        />
      </div>
    </article>
  );
};
