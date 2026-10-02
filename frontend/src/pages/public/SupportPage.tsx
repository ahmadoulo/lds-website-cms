import React, { useMemo } from 'react';
import { HeartHandshake } from 'lucide-react';
import { useDonations } from '../../lib/queries/publicHooks';
import { useSettings } from '../../context/SettingsContext';
import { Seo } from '../../components/seo/Seo';
import { SectionHeading } from '../../components/public/SectionHeading';
import { DonationCard } from '../../components/public/DonationCard';
import { PaymentMethodCard } from '../../components/public/PaymentMethodCard';
import { EmptyState, ErrorState, SkeletonCards } from '../../components/ui/States';
import { useLocale } from '../../context/LocaleContext';
import { hasTranslation } from '../../lib/i18n/resolve';
import { usePagesT } from '../../lib/i18n/dictionaries/pages';

export const SupportPage = () => {
  const { data: donations, isLoading, isError, refetch } = useDonations();
  const { settings } = useSettings();
  const { locale } = useLocale();
  const p = usePagesT();

  const contact = settings?.global_contact;

  /*
    A card that asks for money has to be understood: a method whose title has no
    Arabic is left out instead of being shown half-translated. Nothing is
    filtered at `fr`.
  */
  const translated = useMemo(
    () => (donations ?? []).filter((method) => hasTranslation(method.title, locale)),
    [donations, locale],
  );

  // A method with a provider is a way to send money and gets the richer card;
  // the rest keep the generic presentation.
  const paymentMethods = translated.filter((method) => Boolean(method.provider));
  const otherWays = translated.filter((method) => !method.provider);

  return (
    <>
      <Seo title={p.support.seoTitle} description={p.support.seoDescription} />

      <div className="min-h-page section-y">
        <div className="container-page">
          <SectionHeading
            eyebrow={p.support.eyebrow}
            title={p.support.title}
            description={p.support.description}
            accent="orange"
            as="h1"
          />

          {isLoading ? (
            <SkeletonCards count={3} />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : !donations?.length ? (
            <EmptyState
              icon={HeartHandshake}
              title={p.support.emptyTitle}
              description={p.support.emptyDescription}
            />
          ) : !translated.length ? (
            <EmptyState
              icon={HeartHandshake}
              title={p.shared.untranslatedTitle}
              description={p.shared.untranslatedDescription}
            />
          ) : (
            <>
              {paymentMethods.length > 0 && (
                <section className="mb-10 sm:mb-14">
                  <h2 className="mb-4 text-center text-h2-sm font-extrabold text-navy sm:mb-6">
                    {p.support.paymentsTitle}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
                    {paymentMethods.map((method) => (
                      <PaymentMethodCard key={method.id} method={method} />
                    ))}
                  </div>
                </section>
              )}

              {otherWays.length > 0 && (
                <section>
                  {paymentMethods.length > 0 && (
                    <h2 className="mb-4 text-center text-h2-sm font-extrabold text-navy sm:mb-6">
                      {p.support.otherWaysTitle}
                    </h2>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
                    {otherWays.map((method) => (
                      <DonationCard key={method.id} method={method} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {contact && (
            <div className="mt-10 rounded-2xl border border-navy/8 bg-white px-5 py-8 text-center sm:mt-16 sm:px-6 sm:py-10">
              <h2 className="mb-3 text-h2-sm font-extrabold text-navy">{p.support.ideaTitle}</h2>
              <p className="mx-auto mb-6 max-w-xl text-navy/70">{p.support.ideaDescription}</p>
              <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="block break-words rounded-full bg-navy px-6 py-3.5 font-bold text-white transition-colors hover:bg-blue sm:px-7 sm:py-3"
                  >
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                    /* A phone number reads left to right in both languages. */
                    dir="ltr"
                    className="block rounded-full border-[1.5px] border-navy/15 px-6 py-3.5 font-bold text-navy transition-colors hover:border-navy sm:px-7 sm:py-3"
                  >
                    {contact.phone}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
