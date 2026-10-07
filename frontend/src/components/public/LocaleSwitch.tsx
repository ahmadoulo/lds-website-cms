import React from 'react';
import { useLocale } from '../../context/LocaleContext';
import { LOCALES, LOCALE_COMPACT, LOCALE_LABEL, type Locale } from '../../lib/i18n/locale';
import { useT } from '../../lib/i18n/useT';
import { cn } from '../../lib/cn';

type Variant = 'inline' | 'segmented';

/**
 * FR | العربية
 *
 * Real links rather than buttons: each language has an address of its own, so
 * the switch can be opened in a new tab, copied, and followed by a crawler
 * that never runs the click handler. The click is intercepted to change the
 * language in place instead of reloading the page.
 *
 * Two shapes, one control:
 *
 * - `inline` is the quiet text switch for the contact bar, where there is room
 *   for each language's full name and nothing is competing for attention.
 * - `segmented` is the compact pill the header carries on a phone. It has a
 *   border and a filled active half because it has to read as a control at a
 *   glance, next to a burger icon, to a visitor who does not yet know the site
 *   is published in their language. The whole point of it is to be noticed.
 */
export const LocaleSwitch = ({
  className,
  variant = 'inline',
}: {
  className?: string;
  variant?: Variant;
}) => {
  const { locale, setLocale, hrefFor } = useLocale();
  const t = useT();

  const segmented = variant === 'segmented';

  return (
    <nav
      aria-label={t.common.switchLanguage}
      className={cn(
        'flex items-center',
        segmented
          ? 'gap-0 overflow-hidden rounded-full bg-navy/8 p-0.5'
          : 'gap-1',
        className,
      )}
    >
      {LOCALES.map((candidate: Locale, index) => {
        const isCurrent = candidate === locale;

        return (
          <React.Fragment key={candidate}>
            {!segmented && index > 0 && (
              <span aria-hidden className="select-none text-current opacity-30">
                |
              </span>
            )}
            <a
              href={hrefFor(candidate)}
              hrefLang={candidate}
              lang={candidate}
              aria-current={isCurrent ? 'true' : undefined}
              /* The visible label is abbreviated in the pill, so the accessible
                 name has to carry the language's real name. */
              aria-label={segmented ? LOCALE_LABEL[candidate] : undefined}
              onClick={(event) => {
                // Let a modified click open the other language in a new tab.
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                event.preventDefault();
                setLocale(candidate);
              }}
              className={cn(
                'inline-flex items-center justify-center font-bold transition-colors',
                segmented
                  ? cn(
                      /* 13px is the smallest step in the type scale, so the
                         pill is made compact by tightening its box rather than
                         by inventing a size below the system. */
                      'min-h-8 min-w-9 rounded-full px-1.5 text-caption leading-none',
                      isCurrent
                        ? 'bg-navy text-white shadow-sm'
                        : 'text-navy/55 hover:text-navy',
                    )
                  : cn(
                      'min-h-11 rounded-lg px-2 text-caption sm:min-h-0 sm:py-1',
                      isCurrent
                        ? 'text-current opacity-100'
                        : 'text-current opacity-55 hover:opacity-100',
                    ),
              )}
            >
              {segmented ? LOCALE_COMPACT[candidate] : LOCALE_LABEL[candidate]}
            </a>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
