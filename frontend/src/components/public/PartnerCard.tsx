import React from 'react';
import { resolveIcon } from '../../lib/icons';
import { cn } from '../../lib/cn';
import type { Partner } from '../../lib/types';

/**
 * One partner, shown the same way everywhere.
 *
 * The real logo is the point: the icon is only a placeholder for a partner
 * whose logo has not been uploaded yet, so the row stays homogeneous instead
 * of showing a hole. The name is always printed, which is why the logo itself
 * carries an empty alt - repeating the name would have a screen reader read it
 * twice.
 */
export const PartnerCard = ({ partner, className }: { partner: Partner; className?: string }) => {
  const Icon = resolveIcon(partner.icon);

  const inner = (
    <>
      <span className="mb-4 flex h-14 w-full items-center justify-center">
        {partner.logo ? (
          <img
            src={partner.logo.url}
            alt=""
            loading="lazy"
            decoding="async"
            width={partner.logo.width ?? undefined}
            height={partner.logo.height ?? undefined}
            className="max-h-14 w-auto max-w-full object-contain"
          />
        ) : (
          <Icon className="h-8 w-8 text-navy/30" aria-hidden />
        )}
      </span>
      <span className="text-balance text-center text-caption font-bold text-navy">
        {partner.name}
      </span>
    </>
  );

  const base = cn(
    'flex h-full flex-col items-center justify-center rounded-card bg-white p-5 shadow-e1 ring-1 ring-navy/5',
    className,
  );

  if (!partner.url) {
    return <div className={base}>{inner}</div>;
  }

  return (
    <a
      href={partner.url}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        base,
        'transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-e2',
      )}
    >
      {inner}
    </a>
  );
};
