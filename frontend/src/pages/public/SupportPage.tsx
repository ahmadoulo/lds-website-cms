import React from 'react';
import { HeartHandshake } from 'lucide-react';
import { useDonations } from '../../lib/queries/publicHooks';
import { useSettings } from '../../context/SettingsContext';
import { Seo } from '../../components/seo/Seo';
import { SectionHeading } from '../../components/public/SectionHeading';
import { DonationCard } from '../../components/public/DonationCard';
import { EmptyState, ErrorState, SkeletonCards } from '../../components/ui/States';

export const SupportPage = () => {
  const { data: donations, isLoading, isError, refetch } = useDonations();
  const { settings } = useSettings();

  const contact = settings?.global_contact;

  return (
    <>
      <Seo
        title="Nous soutenir"
        description="Don financier, bénévolat ou matériel : découvrez comment soutenir les actions de Louga Développement Solidaire."
      />

      <div className="min-h-[60vh] px-6 py-[90px]">
        <div className="mx-auto w-full max-w-[1280px]">
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
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {donations.map((method) => (
                <DonationCard key={method.id} method={method} />
              ))}
            </div>
          )}

          {contact && (
            <div className="mt-16 rounded-2xl border border-navy/8 bg-white px-6 py-10 text-center">
              <h2 className="mb-3 text-[clamp(20px,2.4vw,26px)] font-extrabold text-navy">
                Une autre idée pour nous aider ?
              </h2>
              <p className="mx-auto mb-6 max-w-xl text-navy/70">
                Écrivez-nous ou appelez-nous, nous étudions toutes les propositions.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="rounded-full bg-navy px-7 py-3 font-bold text-white transition-colors hover:bg-blue"
                  >
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                    className="rounded-full border-[1.5px] border-navy/15 px-7 py-3 font-bold text-navy transition-colors hover:border-navy"
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
