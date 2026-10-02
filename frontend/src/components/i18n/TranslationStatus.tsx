import React from 'react';
import { Check, TriangleAlert } from 'lucide-react';
import { LOCALES, LOCALE_SHORT, type Locale } from '../../lib/i18n/locale';
import { hasTranslation } from '../../lib/i18n/resolve';
import { useT } from '../../lib/i18n/useT';
import { cn } from '../../lib/cn';
import type { Localized } from '../../lib/types';

/**
 * Which languages a record actually carries.
 *
 * Shown in every admin list so an editor can see, without opening anything,
 * which records are still waiting for their Arabic. A record is complete in a
 * language when every field that was asked for has text in it - a title in
 * Arabic with no summary is not a translated article.
 */
export const TranslationStatus = ({
  fields,
  className,
}: {
  fields: Array<Localized | null | undefined>;
  className?: string;
}) => {
  const t = useT();

  const present = (locale: Locale) =>
    fields.length > 0 && fields.every((field) => hasTranslation(field, locale));

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {LOCALES.map((locale) => {
        const complete = present(locale);
        return (
          <span
            key={locale}
            title={complete ? t.common.translationComplete : t.common.translationIncomplete}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold',
              complete ? 'bg-green/15 text-green-700' : 'bg-orange/15 text-orange',
            )}
          >
            {complete ? (
              <Check className="h-3 w-3" aria-hidden />
            ) : (
              <TriangleAlert className="h-3 w-3" aria-hidden />
            )}
            {LOCALE_SHORT[locale]}
          </span>
        );
      })}
    </span>
  );
};
