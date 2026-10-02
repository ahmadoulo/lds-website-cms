import React, { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { LOCALES, LOCALE_LABEL, DIRECTION, type Locale } from '../../lib/i18n/locale';
import { cn } from '../../lib/cn';

export type LocalizedValue = Partial<Record<Locale, string>>;

/**
 * One editorial field, in both languages, inside one record.
 *
 * Tabs rather than two stacked boxes: a news form has a title, a summary and a
 * body, and stacking each of them twice turns a short form into a long scroll
 * where the French and the Arabic of the same field are nowhere near each
 * other. With tabs the two versions occupy the same place, which is also what
 * makes comparing them possible.
 *
 * The tab of a language with nothing in it carries a warning, so an editor
 * never has to open a tab to find out it is empty.
 */
export const LocalizedField = ({
  id,
  label,
  value,
  onChange,
  required,
  hint,
  error,
  multiline,
  rows = 4,
  maxLength,
  placeholder,
  className,
}: {
  id: string;
  label: string;
  value: LocalizedValue;
  onChange: (next: LocalizedValue) => void;
  /** Required means required in French: Arabic may be filled in later. */
  required?: boolean;
  hint?: string;
  error?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  className?: string;
}) => {
  const [active, setActive] = useState<Locale>('fr');

  const filled = (locale: Locale) => Boolean(value[locale]?.trim());
  const controlId = `${id}-${active}`;

  const controlClasses = cn(
    'w-full rounded-b-lg rounded-tr-lg border border-navy/15 bg-white px-3 py-3 text-base text-navy transition-colors',
    'sm:py-2.5 sm:text-sm',
    'placeholder:text-navy/35 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20',
    'aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-100',
  );

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={controlId} className="block text-sm font-semibold text-navy">
        {label}
        {required && (
          <span className="ms-1 text-orange" aria-hidden>
            *
          </span>
        )}
      </label>

      <div>
        {/* Named for what it does, not for the field: sharing the field's name
            makes the tablist and the input indistinguishable to a screen
            reader asked for "Titre". */}
        <div role="tablist" aria-label={`Langue du champ : ${label}`} className="flex gap-1">
          {LOCALES.map((locale) => (
            <button
              key={locale}
              type="button"
              role="tab"
              aria-selected={locale === active}
              aria-controls={`${id}-panel`}
              onClick={() => setActive(locale)}
              className={cn(
                'inline-flex min-h-9 items-center gap-1.5 rounded-t-lg border border-b-0 px-3 text-xs font-bold transition-colors',
                locale === active
                  ? 'border-navy/15 bg-white text-navy'
                  : 'border-transparent bg-navy/5 text-navy/50 hover:text-navy',
              )}
            >
              <span lang={locale}>{LOCALE_LABEL[locale]}</span>
              {!filled(locale) && (
                <TriangleAlert
                  className="h-3 w-3 text-orange"
                  aria-label="Traduction manquante"
                />
              )}
            </button>
          ))}
        </div>

        <div id={`${id}-panel`} role="tabpanel">
          {multiline ? (
            <textarea
              id={controlId}
              rows={rows}
              lang={active}
              dir={DIRECTION[active]}
              maxLength={maxLength}
              placeholder={placeholder}
              aria-invalid={Boolean(error)}
              value={value[active] ?? ''}
              onChange={(event) => onChange({ ...value, [active]: event.target.value })}
              className={cn(controlClasses, 'resize-y')}
            />
          ) : (
            <input
              id={controlId}
              type="text"
              lang={active}
              dir={DIRECTION[active]}
              maxLength={maxLength}
              placeholder={placeholder}
              aria-invalid={Boolean(error)}
              value={value[active] ?? ''}
              onChange={(event) => onChange({ ...value, [active]: event.target.value })}
              className={controlClasses}
            />
          )}
        </div>
      </div>

      {hint && !error && <p className="text-xs text-navy/50">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      {!filled('ar') && !error && (
        <p className="flex items-center gap-1.5 text-xs text-orange">
          <TriangleAlert className="h-3 w-3 shrink-0" aria-hidden />
          Traduction arabe manquante
        </p>
      )}
    </div>
  );
};

/**
 * Drops the empty languages so an untouched tab is never stored as an empty
 * string - which the merge on the API reads as "remove this translation".
 */
export function cleanLocalized(value: LocalizedValue): LocalizedValue {
  return Object.fromEntries(
    LOCALES.filter((locale) => value[locale]?.trim()).map((locale) => [
      locale,
      value[locale]!.trim(),
    ]),
  );
}
