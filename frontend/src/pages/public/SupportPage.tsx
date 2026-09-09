import React from 'react';
import { HeartHandshake } from 'lucide-react';
import { useDonations } from '../../lib/queries/publicHooks';
import { useSettings } from '../../context/SettingsContext';
import { Seo } from '../../components/seo/Seo';
import { SectionHeading } from '../../components/public/SectionHeading';
import { DonationCard } from '../../components/public/DonationCard';
import { PaymentMethodCard } from '../../components/public/PaymentMethodCard';
import { EmptyState, ErrorState, SkeletonCards } from '../../components/ui/States';

export const SupportPage = () => {
  const { data: donations, isLoading, isError, refetch } = useDonations();
  const { settings } = useSettings();

  const contact = settings?.global_contact;

  // A method with a provider is a way to send money and gets the richer card;
  // the rest keep the generic presentation.
  const paymentMethods = (donations ?? []).filter((method) => Boolean(method.provider));
  const otherWays = (donations ?? []).filter((method) => !method.provider);

  return (
    <>
      <Seo
        title="Nous soutenir"
        description="Don financier, bénévolat ou matériel : découvrez comment soutenir les actions de Louga Développement Solidaire."
      />

      <div className="min-h-page section-y">
        <div className="container-page">
          <SectionHeading
            eyebrow="Agir avec nous"
            title="Soutenez nos actions"
            description="Chaque contribution — financière, matérielle ou humaine — nous permet d'étendre notre impact à Louga."
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
              title="Aucun moyen de soutien publié"
              description="Contactez-nous directement pour savoir comment aider."
            />
          ) : (
            <>
              {paymentMethods.length > 0 && (
                <section className="mb-10 sm:mb-14">
                  <h2 className="mb-4 text-center text-h2-sm font-extrabold text-navy sm:mb-6">
                    Envoyer un don
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
                      Autres façons d'aider
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
              <h2 className="mb-3 text-h2-sm font-extrabold text-navy">
                Une autre idée pour nous aider ?
              </h2>
              <p className="mx-auto mb-6 max-w-xl text-navy/70">
                Écrivez-nous ou appelez-nous, nous étudions toutes les propositions.
              </p>
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
