import React from 'react';
import { ImageIcon } from 'lucide-react';
import { resolveIcon } from '../../lib/icons';
import { t, type Mission } from '../../lib/types';

const ACCENT_CLASSES = ['bg-green', 'bg-blue', 'bg-orange', 'bg-navy'];

export const MissionCard = ({ mission, index }: { mission: Mission; index: number }) => {
  const Icon = resolveIcon(mission.icon);
  const accent = ACCENT_CLASSES[index % ACCENT_CLASSES.length];

  return (
    <article className="group overflow-hidden rounded-[20px] bg-white shadow-[0_12px_30px_-14px_rgba(23,38,66,0.15)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-14px_rgba(23,38,66,0.22)]">
      <div className="relative aspect-[16/10] bg-warm-muted">
        {mission.image ? (
          <img
            src={mission.image.url}
            alt={mission.image.altText?.fr || t(mission.title)}
            loading="lazy"
          decoding="async"
          width={1200}
          height={750}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-8 w-8 text-navy/15" aria-hidden />
          </div>
        )}
        <span
          className={`absolute -bottom-6 left-5 flex h-[50px] w-[50px] items-center justify-center rounded-full text-white shadow-lg ${accent}`}
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <div className="px-6 pb-7 pt-10">
        <h3 className="mb-3 text-[18.5px] font-extrabold text-navy">{t(mission.title)}</h3>
        <p className="text-[14.5px] leading-relaxed text-navy/70">{t(mission.description)}</p>
      </div>
    </article>
  );
};
