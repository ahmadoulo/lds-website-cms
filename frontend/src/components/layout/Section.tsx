import React from 'react';

interface SectionProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  bg?: 'white' | 'warm' | 'warm-muted' | 'navy';
}

export function Section({ id, children, className = '', bg = 'white' }: SectionProps) {
  const backgrounds = {
    white: 'bg-white',
    warm: 'bg-warm',
    'warm-muted': 'bg-warm-muted',
    navy: 'bg-navy',
  };

  return (
    <section id={id} className={`py-24 ${backgrounds[bg]} ${className}`}>
      {children}
    </section>
  );
}
