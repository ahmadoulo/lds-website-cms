import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Copy, Heart, Mail } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { cn } from '../../lib/cn';
import { useLocale } from '../../context/LocaleContext';
import { useComponentsT } from '../../lib/i18n/dictionaries/components';
import { localizedOrSource } from '../../lib/i18n/resolve';
import type { DonationMethod } from '../../lib/types';

const COLOR_CLASSES: Record<DonationMethod['iconColor'], { bg: string; text: string; hover: string }> = {
  orange: { bg: 'bg-orange', text: 'text-orange', hover: 'hover:bg-orange/10' },
  blue: { bg: 'bg-blue', text: 'text-blue', hover: 'hover:bg-blue/10' },
  green: { bg: 'bg-green', text: 'text-[#4d7c0f]', hover: 'hover:bg-green/10' },
  navy: { bg: 'bg-navy', text: 'text-navy', hover: 'hover:bg-navy/10' },
};

/** One way to support the association, rendered from its stored action type. */
export const DonationCard = ({ method }: { method: DonationMethod }) => {
  const toast = useToast();
  const t = useComponentsT();
  const { locale, isRtl } = useLocale();
  const colors = COLOR_CLASSES[method.iconColor] ?? COLOR_CLASSES.orange;

  /*
    A way of giving that has not been translated yet still has to be usable: a
    donor on the Arabic page would otherwise find a card with no title and a
    button with no label. The French is shown and marked as French.
  */
  const title = localizedOrSource(method.title, locale);
  const description = localizedOrSource(method.description, locale);
  const actionLabel = localizedOrSource(method.actionLabel, locale);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(method.actionData);
      toast.success(t.donation.copied(method.actionData));
    } catch {
      // Clipboard access can be blocked; showing the value is the useful fallback.
      toast.notify(t.donation.dial(method.actionData), 'info');
    }
  };

  // The arrow says "this takes you somewhere", so it follows the reading
  // direction; the heart, the clipboard and the envelope are not directions.
  const arrow = cn('h-4 w-4', isRtl && 'rotate-180');

  return (
    <div className="flex flex-col rounded-card border border-navy/6 bg-white p-5 shadow-e2 transition-all sm:p-8 duration-300 hover:-translate-y-1.5 hover:shadow-e3">
      <span
        className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg ${colors.bg}`}
        aria-hidden
      >
        <Heart className="h-6 w-6" />
      </span>

      <h3
        className="mb-3 text-h3 font-extrabold text-navy"
        lang={title.untranslated ? 'fr' : undefined}
        dir={title.untranslated ? 'ltr' : undefined}
      >
        {title.text}
      </h3>
      <p
        className="mb-7 flex-1 leading-relaxed text-navy/70"
        lang={description.untranslated ? 'fr' : undefined}
        dir={description.untranslated ? 'ltr' : undefined}
      >
        {description.text}
      </p>

      {method.actionType === 'phone' ? (
        <button
          type="button"
          onClick={() => void copyToClipboard()}
          lang={actionLabel.untranslated ? 'fr' : undefined}
          className={`flex w-full flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-navy/8 px-3 py-3 font-bold transition-colors ${colors.text} ${colors.hover}`}
        >
          <span className="flex items-center gap-2">
            <Copy className="h-4 w-4 shrink-0" aria-hidden />
            {actionLabel.text}
          </span>
          {/*
            The number on its own line, and never broken.

            It used to sit after the label on one line, so a narrow card wrapped
            it mid-number - "+221 77 861 32" above "02", which is unreadable and
            uncopyable by eye. bdi isolates it as well: the groups of
            "77 123 45 67" would otherwise print back to front inside an Arabic
            sentence.
          */}
          <bdi className="whitespace-nowrap text-caption font-semibold tabular-nums opacity-75">
            {method.actionData}
          </bdi>
        </button>
      ) : method.actionType === 'email' ? (
        <a
          href={`mailto:${method.actionData}`}
          lang={actionLabel.untranslated ? 'fr' : undefined}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 border-navy/8 py-3.5 font-bold transition-colors ${colors.text} ${colors.hover}`}
        >
          <Mail className="h-4 w-4" aria-hidden /> {actionLabel.text}
        </a>
      ) : method.actionData.startsWith('/') ? (
        <Link
          to={method.actionData}
          lang={actionLabel.untranslated ? 'fr' : undefined}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-lg transition-all hover:brightness-110 ${colors.bg}`}
        >
          {actionLabel.text} <ArrowRight className={arrow} aria-hidden />
        </Link>
      ) : (
        <a
          href={method.actionData}
          target="_blank"
          rel="noreferrer noopener"
          lang={actionLabel.untranslated ? 'fr' : undefined}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-lg transition-all hover:brightness-110 ${colors.bg}`}
        >
          {actionLabel.text} <ArrowRight className={arrow} aria-hidden />
        </a>
      )}
    </div>
  );
};
