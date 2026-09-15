import React from 'react';
import { ImpactCounter } from './ImpactCounter';
import { resolveIcon } from '../../lib/icons';
import { BRAND, readableOn } from '../../lib/brand';
import { cn } from '../../lib/cn';
import { t, type ImpactStat } from '../../lib/types';

/**
 * The key figures, in one place.
 *
 * Three copies of this block existed - the homepage, the impact page and the
 * about page - and the third had already drifted: no pictogram, and the stored
 * colour applied raw, so a figure saved in navy was invisible on the navy band.
 *
 * Layout is flex-wrap rather than a grid on purpose. A grid leaves a leftover
 * row pinned to the left edge, which is what made five figures look broken;
 * wrapping centres whatever is left over, so any number of indicators reads as
 * a deliberate composition. It also means the section can never overflow
 * sideways nor grow a giant card, whatever the association publishes.
 */
export const ImpactFigures = ({
  stats,
  size = 'md',
  className,
}: {
  stats: ImpactStat[];
  size?: 'md' | 'lg';
  className?: string;
}) => (
  <dl className={cn('flex flex-wrap justify-center gap-x-4 gap-y-8 md:gap-10', className)}>
    {stats.map((stat) => {
      const Icon = stat.icon ? resolveIcon(stat.icon) : null;
      // The band is navy: a statistic stored as navy would vanish.
      const color = readableOn(stat.color, BRAND.navy);

      return (
        <div
          key={stat.id}
          className="group flex w-[calc(50%-0.5rem)] flex-col items-center text-center md:w-[calc(25%-1.875rem)]"
        >
          {Icon && (
            <span
              className={cn(
                'flex items-center justify-center rounded-full',
                size === 'lg' ? 'mb-5 h-14 w-14' : 'mb-4 h-12 w-12',
              )}
              style={{ backgroundColor: `${color}1f`, color }}
              aria-hidden
            >
              <Icon className={size === 'lg' ? 'h-7 w-7' : 'h-6 w-6'} />
            </span>
          )}
          <dd
            className={cn(
              'mb-3 text-stat tabular-nums',
              size === 'lg' && 'transition-transform duration-500 group-hover:scale-105',
            )}
            style={{ color }}
          >
            <ImpactCounter value={stat.value} />
          </dd>
          <dt className="text-balance text-caption font-medium uppercase tracking-wide text-white/80">
            {t(stat.label)}
          </dt>
        </div>
      );
    })}
  </dl>
);
