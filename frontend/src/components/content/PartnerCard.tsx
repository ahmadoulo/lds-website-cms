import React from 'react';

interface PartnerCardProps {
  name: string;
  icon?: React.ReactNode;
  logoUrl?: string;
}

export function PartnerCard({ name, icon, logoUrl }: PartnerCardProps) {
  return (
    <div className="flex items-center gap-3 bg-warm-muted px-6 py-4 rounded-full border border-navy/5 shadow-sm">
      {logoUrl ? (
        <img src={logoUrl} alt={name} className="h-6 w-auto object-contain" />
      ) : icon ? (
        <div className="text-navy text-[17px]">{icon}</div>
      ) : null}
      <span className="font-bold text-[14.5px] text-navy whitespace-nowrap">{name}</span>
    </div>
  );
}
