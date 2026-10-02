import React from 'react';
import { cn } from '../../lib/cn';
import { useShellLocale } from '../../lib/i18n/dictionaries/adminShell';

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

export const Badge = ({ tone = 'neutral', className, children }: BadgeProps) => {
  const { isRtl } = useShellLocale();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-eyebrow uppercase',
        /*
          `text-eyebrow` tracks its letters out by 0.08em, which is what gives a
          small French label its poise. Arabic letters are joined to each other:
          spacing them apart pulls the word into pieces, so the tracking is
          dropped and only the size and the weight are kept.
        */
        isRtl && 'tracking-normal',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
};
