import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'onDark';

/**
 * The call-to-action styling was written out by hand on six pages, drifting a
 * little each time. One component keeps the brand's primary action recognisable
 * wherever it appears.
 */
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-orange text-white shadow-cta hover:bg-orange/92 hover:shadow-cta-hover',
  secondary: 'border border-navy/15 bg-white text-navy hover:border-navy/45 hover:bg-white',
  ghost: 'text-navy hover:bg-navy/5',
  onDark: 'bg-white text-navy hover:bg-white/90',
};

const SIZES = {
  md: 'px-6 py-3 text-body',
  lg: 'px-7 py-3.5 text-body-lg',
};

interface CtaLinkProps {
  to?: string;
  href?: string;
  variant?: Variant;
  size?: keyof typeof SIZES;
  className?: string;
  children: React.ReactNode;
}

export const CtaLink = ({
  to,
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: CtaLinkProps) => {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-bold',
    // Lifting on hover reads as responsive without the layout shifting.
    'transition-[transform,box-shadow,background-color,border-color] duration-200 hover:-translate-y-0.5',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue',
    VARIANTS[variant],
    SIZES[size],
    className,
  );

  if (href) {
    return (
      <a href={href} className={classes} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    );
  }

  return (
    <Link to={to ?? '/'} className={classes}>
      {children}
    </Link>
  );
};
