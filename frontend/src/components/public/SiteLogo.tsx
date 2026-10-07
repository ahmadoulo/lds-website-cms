import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useLocale } from '../../context/LocaleContext';
import { useT } from '../../lib/i18n/useT';
import { cn } from '../../lib/cn';

/** The association's mark, extracted from the logo it supplied. */
const MARK = '/logo-mark.png';

interface SiteLogoProps {
  /** `dark` picks the variant meant for navy backgrounds (footer, sidebar). */
  variant?: 'light' | 'dark';
  className?: string;
}

/**
 * The association's identity in the header, the footer and the admin sidebar.
 *
 * The supplied logo stacks its symbol above three lines of wordmark, which is
 * right on a letterhead and wrong in a 40px bar: the wordmark would be three
 * illegible smudges. So the lockup here is horizontal - the symbol at a size
 * where it reads, the name beside it as live text. The text is real text, so
 * it stays sharp at any density, is selectable, and is what a screen reader
 * announces.
 *
 * A logo uploaded from the administration still wins over all of this: the
 * association can replace the whole lockup with a single file whenever it has
 * one drawn for a horizontal format.
 */
export const SiteLogo = ({ variant = 'light', className }: SiteLogoProps) => {
  const { settings } = useSettings();
  const { locale } = useLocale();
  const t = useT();
  const branding = settings?.branding;
  const organization = settings?.organization;

  // The dark variant is optional: when it is missing the main logo is reused.
  const media = variant === 'dark' ? (branding?.logoDark ?? branding?.logo) : branding?.logo;

  /*
    The settings carry a single name, written in French - it is the association
    naming itself, not a translatable label. French reads it; Arabic reads the
    name the glossary fixes, so an Arabic page never carries a French wordmark,
    and so the alt text below is announced in the language of the page.
  */
  const name = (locale === 'fr' && organization?.name) || t.common.organizationName;
  const height = branding?.logoHeight || 40;

  if (media) {
    return (
      <img
        src={media.url}
        alt={name}
        style={{ height: `${height}px` }}
        /* Reserving the box stops the sticky header shifting once the logo
           lands. `w-auto` keeps the rendered size exactly as before: only the
           intrinsic ratio is taken from these. */
        width={media.width ?? undefined}
        height={media.height ?? undefined}
        /*
          branding.logoHeight is chosen for the desktop header; on a phone the
          same value would make the sticky bar as tall as the logo. Declared
          before `className` so a caller can still override it.
        */
        className={cn('max-h-10 w-auto max-w-[220px] object-contain sm:max-h-none', className)}
      />
    );
  }

  /*
    The name is split the way the association splits it in its own logo: the
    city on the first line, what it does on the second. That split is a French
    typographic choice made on a French name - the Arabic name is one phrase,
    and cutting it at its first space would strand a word. So Arabic prints the
    whole name on the single line, and the second line simply does not exist.
  */
  const [firstWord, ...rest] = name.split(' ');
  const lead = locale === 'fr' ? firstWord : name;
  const tail = locale === 'fr' ? rest.join(' ') : '';

  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <img
        src={MARK}
        /* Decorative: the name is printed beside it as text. */
        alt=""
        width={512}
        height={512}
        className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10"
      />
      <span
        className={cn(
          'flex min-w-0 flex-col leading-tight',
          variant === 'dark' ? 'text-white' : 'text-navy',
        )}
      >
        {/*
          `truncate` rather than `whitespace-nowrap`: the line still never
          wraps, but it can now give way. Without it the lockup was an
          unshrinkable block, so on a narrow phone it pushed the menu button
          off the gutter instead of losing a character of its own.
        */}
        <span className="truncate text-body-lg font-extrabold tracking-tight">{lead}</span>
        {tail && (
          /*
            Between 1024 and 1279px the eight nav entries and the donate button
            need every pixel: the second line stands down there and comes back
            once there is room for it.
          */
          <span className="block truncate text-caption font-semibold opacity-80 lg:hidden xl:block">
            {tail}
          </span>
        )}
      </span>
    </span>
  );
};
