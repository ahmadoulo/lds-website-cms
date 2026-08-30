import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Copy, Heart, Mail } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { t, type DonationMethod } from '../../lib/types';

const COLOR_CLASSES: Record<DonationMethod['iconColor'], { bg: string; text: string; hover: string }> = {
  orange: { bg: 'bg-orange', text: 'text-orange', hover: 'hover:bg-orange/10' },
  blue: { bg: 'bg-blue', text: 'text-blue', hover: 'hover:bg-blue/10' },
  green: { bg: 'bg-green', text: 'text-[#4d7c0f]', hover: 'hover:bg-green/10' },
  navy: { bg: 'bg-navy', text: 'text-navy', hover: 'hover:bg-navy/10' },
};

/** One way to support the association, rendered from its stored action type. */
export const DonationCard = ({ method }: { method: DonationMethod }) => {
  const toast = useToast();
  const colors = COLOR_CLASSES[method.iconColor] ?? COLOR_CLASSES.orange;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(method.actionData);
      toast.success(`${method.actionData} copié dans le presse-papiers.`);
    } catch {
      // Clipboard access can be blocked; showing the value is the useful fallback.
      toast.notify(`Numéro à composer : ${method.actionData}`, 'info');
    }
  };

  return (
    <div className="flex flex-col rounded-card border border-navy/6 bg-white p-8 shadow-e2 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-e3">
      <span
        className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg ${colors.bg}`}
        aria-hidden
      >
        <Heart className="h-6 w-6" />
      </span>

      <h3 className="mb-3 text-h3 font-extrabold text-navy">{t(method.title)}</h3>
      <p className="mb-7 flex-1 leading-relaxed text-navy/70">{t(method.description)}</p>

      {method.actionType === 'phone' ? (
        <button
          type="button"
          onClick={() => void copyToClipboard()}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 border-navy/8 py-3.5 font-bold transition-colors ${colors.text} ${colors.hover}`}
        >
          <Copy className="h-4 w-4" aria-hidden /> {t(method.actionLabel)} · {method.actionData}
        </button>
      ) : method.actionType === 'email' ? (
        <a
          href={`mailto:${method.actionData}`}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border-2 border-navy/8 py-3.5 font-bold transition-colors ${colors.text} ${colors.hover}`}
        >
          <Mail className="h-4 w-4" aria-hidden /> {t(method.actionLabel)}
        </a>
      ) : method.actionData.startsWith('/') ? (
        <Link
          to={method.actionData}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-lg transition-all hover:brightness-110 ${colors.bg}`}
        >
          {t(method.actionLabel)} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <a
          href={method.actionData}
          target="_blank"
          rel="noreferrer noopener"
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-lg transition-all hover:brightness-110 ${colors.bg}`}
        >
          {t(method.actionLabel)} <ArrowRight className="h-4 w-4" aria-hidden />
        </a>
      )}
    </div>
  );
};
