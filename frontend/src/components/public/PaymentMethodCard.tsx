import React, { useState } from 'react';
import { ArrowRight, Check, Copy, Phone, Smartphone } from 'lucide-react';
import { PROVIDERS, isProviderKey, telHref, type ProviderKey } from '../../lib/paymentProviders';
import { useToast } from '../ui/Toast';
import { cn } from '../../lib/cn';
import { useLocale } from '../../context/LocaleContext';
import { useComponentsT } from '../../lib/i18n/dictionaries/components';
import { localizedOrSource } from '../../lib/i18n/resolve';
import type { DonationMethod } from '../../lib/types';

/**
 * A mobile money or bank method.
 *
 * The action offered depends on what the association actually configured: an
 * official payment link opens directly, otherwise the number is shown, copyable,
 * and dialable. No URL scheme is guessed, because a link that fails on the
 * donor's phone costs a donation.
 *
 * The provider's name and the instruction under the card are read from the
 * dictionary rather than from `lib/paymentProviders`, which held them as French
 * literals: a donor on the Arabic page was being told in French how to send
 * money. The module keeps what is not language - the brand colour, and whether
 * a phone number is the meaningful detail for this provider.
 */
export const PaymentMethodCard = ({ method }: { method: DonationMethod }) => {
  const toast = useToast();
  const t = useComponentsT();
  const { locale, isRtl } = useLocale();
  const [copied, setCopied] = useState(false);

  const key = (isProviderKey(method.provider) ? method.provider : 'other') as ProviderKey;
  const provider = PROVIDERS[key];
  const number = method.actionData?.trim() ?? '';

  /*
    Indexing the two provider tables with the key is what makes a provider
    added to `lib/paymentProviders` without its wording a compile error rather
    than a French sentence on an Arabic page.
  */
  const providerLabel = t.providerLabel[key];

  // A method the association has not translated yet still has to be usable, so
  // the French is shown and marked as French rather than left blank.
  const title = localizedOrSource(method.title, locale);
  const description = localizedOrSource(method.description, locale);
  const actionLabel = localizedOrSource(method.actionLabel, locale);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard access can be denied; the number is on screen regardless.
      toast.notify(t.payment.enterNumber(number), 'info');
    }
  };

  return (
    <article className="flex flex-col rounded-card border border-navy/8 bg-white p-5 shadow-e2 sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: provider.color }}
          aria-hidden
        >
          <Smartphone className="h-5 w-5" />
        </span>
        <div>
          <h3
            className="text-h3 font-extrabold leading-tight text-navy"
            lang={title.untranslated ? 'fr' : undefined}
          >
            {title.text || providerLabel}
          </h3>
          {method.beneficiary && (
            <p className="text-caption text-navy/55">
              {t.payment.beneficiary(method.beneficiary)}
            </p>
          )}
        </div>
      </div>

      <p
        className="mb-5 text-body leading-relaxed text-navy/70"
        lang={description.untranslated ? 'fr' : undefined}
        dir={description.untranslated ? 'ltr' : undefined}
      >
        {description.text}
      </p>

      {provider.usesPhone && number && (
        <p className="mb-4 rounded-xl bg-warm-muted px-4 py-3">
          <span className="block text-xs font-semibold uppercase tracking-wide text-navy/50">
            {t.payment.numberLabel}
          </span>
          {/*
            `bdi` isolates the number from the paragraph around it. Without it
            the bidirectional algorithm treats the spaces inside "77 123 45 67"
            as part of the Arabic run and prints the groups back to front, which
            on a donation page is a wrong number.
          */}
          <span className="block select-all text-h3 font-extrabold tabular-nums text-navy">
            <bdi>{number}</bdi>
          </span>
        </p>
      )}

      <div className="mt-auto space-y-2">
        {method.paymentLink ? (
          <a
            href={method.paymentLink}
            target="_blank"
            rel="noreferrer noopener"
            className="flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white shadow-cta transition-all hover:brightness-110 sm:py-3.5"
            style={{ backgroundColor: provider.color }}
          >
            {actionLabel.text || t.payment.payWith(providerLabel)}
            {/* The arrow leads off the site, so it follows the reading
                direction. The phone and the clipboard below it are objects,
                not directions, and are left exactly as they are. */}
            <ArrowRight className={cn('h-4 w-4', isRtl && 'rotate-180')} aria-hidden />
          </a>
        ) : null}

        {provider.usesPhone && number && (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void copy()}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-navy/10 py-3 text-body font-bold text-navy transition-colors hover:border-navy/30"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green" aria-hidden /> {t.payment.copied}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden /> {t.payment.copyNumber}
                </>
              )}
            </button>
            <a
              href={telHref(number)}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-navy/10 py-3 text-body font-bold text-navy transition-colors hover:border-navy/30"
            >
              <Phone className="h-4 w-4" aria-hidden /> {t.payment.dial}
            </a>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-navy/50">
        {t.providerInstructions[key]}
      </p>
    </article>
  );
};
