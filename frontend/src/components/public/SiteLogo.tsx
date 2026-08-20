import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import { cn } from '../../lib/cn';

interface SiteLogoProps {
  /** `dark` picks the variant meant for navy backgrounds (footer, sidebar). */
  variant?: 'light' | 'dark';
  className?: string;
}

/**
 * The association's logo, uploaded from the admin. Falls back to the wordmark so
 * the site never renders a broken image before a logo has been provided.
 */
export const SiteLogo = ({ variant = 'light', className }: SiteLogoProps) => {
  const { settings } = useSettings();
  const branding = settings?.branding;

  // The dark variant is optional: when it is missing the main logo is reused.
  const media = variant === 'dark' ? (branding?.logoDark ?? branding?.logo) : branding?.logo;

  const wordmark = branding?.wordmark || 'LDS';
  const accent = branding?.wordmarkAccent || 'Louga';
  const height = branding?.logoHeight || 40;

  if (media) {
    return (
      <img
        src={media.url}
        alt={`${wordmark} ${accent}`.trim()}
        style={{ height: `${height}px` }}
        className={cn('w-auto max-w-[220px] object-contain', className)}
      />
    );
  }

  return (
    <span
      className={cn(
        'text-2xl font-extrabold tracking-tight',
        variant === 'dark' ? 'text-white' : 'text-navy',
        className,
      )}
    >
      {wordmark} <span className="text-green">{accent}</span>
    </span>
  );
};
