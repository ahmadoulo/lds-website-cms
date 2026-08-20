import React from 'react';
import { cn } from '../../lib/cn';

type Tone = 'green' | 'blue' | 'orange' | 'navy' | 'neutral' | 'red';

const TONES: Record<Tone, string> = {
  green: 'bg-green/15 text-[#4d7c0f]',
  blue: 'bg-blue/10 text-blue',
  orange: 'bg-orange/10 text-orange',
  navy: 'bg-navy/10 text-navy',
  neutral: 'bg-navy/6 text-navy/60',
  red: 'bg-red-50 text-red-600',
};

interface BadgeProps {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}

export const Badge = ({ tone = 'neutral', className, children }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
      TONES[tone],
      className,
    )}
  >
    {children}
  </span>
);
