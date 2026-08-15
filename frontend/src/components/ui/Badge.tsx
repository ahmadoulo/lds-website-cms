import React from 'react';

type BadgeColor = 'green' | 'blue' | 'orange' | 'navy';

interface BadgeProps {
  color?: BadgeColor;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ color = 'green', children, className = '' }: BadgeProps) {
  const colors = {
    green: 'bg-[#87CE18]/15 text-[#5c9412]',
    blue: 'bg-blue/15 text-blue',
    orange: 'bg-orange/15 text-orange',
    navy: 'bg-navy/15 text-navy',
  };

  return (
    <span className={`inline-block font-bold text-[11px] uppercase tracking-wider py-1.5 px-3 rounded-full ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}
