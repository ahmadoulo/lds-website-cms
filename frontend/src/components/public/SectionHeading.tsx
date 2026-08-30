import React from 'react';
import { cn } from '../../lib/cn';

type Accent = 'green' | 'blue' | 'orange';

const ACCENTS: Record<Accent, string> = {
  green: 'text-green',
  blue: 'text-blue',
  orange: 'text-orange',
};

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  accent?: Accent;
  align?: 'center' | 'left';
  as?: 'h1' | 'h2';
  className?: string;
}

export const SectionHeading = ({
  eyebrow,
  title,
  description,
  accent = 'blue',
  align = 'center',
  as: Tag = 'h2',
  className,
}: SectionHeadingProps) => (
  <div
    className={cn(
      'mb-12 max-w-[640px]',
      align === 'center' ? 'mx-auto text-center' : 'text-left',
      className,
    )}
  >
    <p className={cn('mb-3.5 text-eyebrow uppercase', ACCENTS[accent])}>
      {eyebrow}
    </p>
    <Tag className="text-h2 font-extrabold leading-[1.2] text-navy">
      {title}
    </Tag>
    {description && (
      <p className="mt-4 text-body-lg leading-relaxed text-navy/70">{description}</p>
    )}
  </div>
);
