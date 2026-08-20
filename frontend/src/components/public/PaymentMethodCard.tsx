import React, { useState } from 'react';
import { ArrowRight, Check, Copy, Phone, Smartphone } from 'lucide-react';
import { PROVIDERS, isProviderKey, telHref, type ProviderKey } from '../../lib/paymentProviders';
import { useToast } from '../ui/Toast';
import { t, type DonationMethod } from '../../lib/types';

/**
 * A mobile money or bank method.
 *
 * The action offered depends on what the association actually configured: an
 * official payment link opens directly, otherwise the number is shown, copyable,
 * and dialable. No URL scheme is guessed, because a link that fails on the
 * donor's phone costs a donation.
 */
export const PaymentMethodCard = ({ method }: { method: DonationMethod }) => {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const key = (isProviderKey(method.provider) ? method.provider : 'other') as ProviderKey;
  const provider = PROVIDERS[key];
  const number = method.actionData?.trim() ?? '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard access can be denied; the number is on screen regardless.
      toast.notify(`Numéro à saisir : ${number}`, 'info');
    }
  };

  return (
    <article className="flex flex-col rounded-[20px] border border-navy/8 bg-white p-7 shadow-[0_12px_30px_-16px_rgba(23,38,66,0.12)]">
      <div className="mb-5 flex items-center gap-3">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: provider.color }}
          aria-hidden
        >
          <Smartphone className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-[17px] font-extrabold leading-tight text-navy">
            {t(method.title, provider.label)}
          </h3>
          {method.beneficiary && (
            <p className="text-[12.5px] text-navy/55">Bénéficiaire : {method.beneficiary}</p>
          )}
        </div>
      </div>

      <p className="mb-5 text-[14.5px] leading-relaxed text-navy/70">{t(method.description)}</p>

      {provider.usesPhone && number && (
        <p className="mb-4 rounded-xl bg-warm-muted px-4 py-3">
          <span className="block text-[11.5px] font-semibold uppercase tracking-wide text-navy/50">
            Numéro
          </span>
          <span className="block select-all text-[19px] font-extrabold tabular-nums text-navy">
            {number}
          </span>
        </p>
      )}

      <div className="mt-auto space-y-2">
        {method.paymentLink ? (
          <a
            href={method.paymentLink}
            target="_blank"
            rel="noreferrer noopener"
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-lg transition-all hover:brightness-110"
            style={{ backgroundColor: provider.color }}
          >
            {t(method.actionLabel, `Payer avec ${provider.label}`)}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        ) : null}

        {provider.usesPhone && number && (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void copy()}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-navy/10 py-3 text-[14px] font-bold text-navy transition-colors hover:border-navy/30"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green" aria-hidden /> Copié
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden /> Copier le numéro
                </>
              )}
            </button>
            <a
              href={telHref(number)}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-navy/10 py-3 text-[14px] font-bold text-navy transition-colors hover:border-navy/30"
            >
              <Phone className="h-4 w-4" aria-hidden /> Composer
            </a>
          </div>
        )}
      </div>

      <p className="mt-4 text-[12px] leading-relaxed text-navy/50">{provider.instructions}</p>
    </article>
  );
};
