import React from 'react';
import { Badge } from '../ui/Badge';

interface SectionHeadingProps {
  eyebrow?: string;
  eyebrowColor?: 'green' | 'blue' | 'orange';
  title: React.ReactNode;
  description?: React.ReactNode;
  centered?: boolean;
  className?: string;
}

export function SectionHeading({ 
  eyebrow, 
  eyebrowColor = 'green', 
  title, 
  description, 
  centered = false,
  className = ''
}: SectionHeadingProps) {
  return (
    <div className={`${centered ? 'text-center mx-auto max-w-2xl' : 'max-w-2xl'} mb-16 ${className}`}>
      {eyebrow && (
        <Badge color={eyebrowColor} className="mb-4">
          {eyebrow}
        </Badge>
      )}
      <h2 className="text-3xl md:text-4xl font-extrabold text-navy mb-5 leading-tight">
        {title}
      </h2>
      {description && (
        <p className="text-lg text-navy/70 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
