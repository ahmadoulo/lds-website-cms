import React from 'react';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { usePartners } from '../../lib/queries/publicHooks';
import { Seo } from '../../components/seo/Seo';
import { SectionHeading } from '../../components/public/SectionHeading';
import { PartnerCard } from '../../components/public/PartnerCard';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States';

export const PartnersPage = () => {
  const { data: partners, isLoading, isError, refetch } = usePartners();

  return (
    <>
      <Seo
        title="Partenaires"
        description="Les organisations qui accompagnent Louga Développement Solidaire."
      />

      <div className="min-h-page bg-white section-y">
        <div className="container-page">
          <SectionHeading
            eyebrow="Nos partenaires"
            title="Ils nous font confiance"
            description="Institutions, entreprises et associations qui rendent nos actions possibles."
            accent="blue"
            as="h1"
          />

          {isLoading ? (
            <div className="flex flex-wrap justify-center gap-6 sm:gap-12">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-28 w-48" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : !partners?.length ? (
            <EmptyState
              icon={Building2}
              title="Aucun partenaire publié"
              description="Nos partenaires seront présentés ici prochainement."
            />
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
              {partners.map((partner) => (
                <li key={partner.id}>
                  <PartnerCard partner={partner} />
                </li>
              ))}
            </ul>
          )}

          <div className="mt-10 rounded-2xl bg-warm-muted px-5 py-9 text-center sm:mt-16 sm:px-6 sm:py-12">
            <h2 className="mb-4 text-h2-sm font-extrabold text-navy">
              Devenir partenaire de l'association
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-navy/70">
              Vous représentez une organisation qui souhaite s'engager à Louga ? Écrivez-nous.
            </p>
            <Link
              to="/contact"
              className="inline-block rounded-full bg-navy px-8 py-3.5 font-bold text-white transition-colors hover:bg-blue"
            >
              Nous contacter
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};
