import React from 'react';
import { useLocale } from '../../context/LocaleContext';
import { LOCALES, LOCALE_LABEL, type Locale } from '../../lib/i18n/locale';
import { useT } from '../../lib/i18n/useT';
import { cn } from '../../lib/cn';

/**
 * FR | العربية
 *
 * Real links rather than buttons: each language has an address of its own, so
 * the switch can be opened in a new tab, copied, and followed by a crawler
 * that never runs the click handler. The click is intercepted to change the
 * language in place instead of reloading the page.
 */
export const LocaleSwitch = ({ className }: { className?: string }) => {
  const { locale, setLocale, hrefFor } = useLocale();
  const t = useT();

  return (
    <nav aria-label={t.common.switchLanguage} className={cn('flex items-center gap-1', className)}>
      {LOCALES.map((candidate: Locale, index) => (
        <React.Fragment key={candidate}>
          {index > 0 && (
            <span aria-hidden className="select-none text-current opacity-30">
              |
            </span>
          )}
          <a
            href={hrefFor(candidate)}
            hrefLang={candidate}
            lang={candidate}
            aria-current={candidate === locale ? 'true' : undefined}
            onClick={(event) => {
              // Let a modified click open the other language in a new tab.
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
              event.preventDefault();
              setLocale(candidate);
            }}
            className={cn(
              'inline-flex min-h-11 items-center rounded-lg px-2 text-caption font-bold transition-colors sm:min-h-0 sm:py-1',
              candidate === locale
                ? 'text-current opacity-100'
                : 'text-current opacity-55 hover:opacity-100',
            )}
          >
            {LOCALE_LABEL[candidate]}
          </a>
        </React.Fragment>
      ))}
    </nav>
  );
};
