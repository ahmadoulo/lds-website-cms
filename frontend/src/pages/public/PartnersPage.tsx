import React from 'react';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { usePartners } from '../../lib/queries/publicHooks';
import { Seo } from '../../components/seo/Seo';
import { SectionHeading } from '../../components/public/SectionHeading';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States';
import { resolveIcon } from '../../lib/icons';

export const PartnersPage = () => {
  const { data: partners, isLoading, isError, refetch } = usePartners();

  return (
    <>
      <Seo
        title="Partenaires"
        description="Les organisations qui accompagnent Louga Développement Solidaire."
      />

      <div className="min-h-[60vh] bg-white section-y">
        <div className="container-page">
          <SectionHeading
            eyebrow="Nos partenaires"
            title="Ils nous font confiance"
            description="Institutions, entreprises et associations qui rendent nos actions possibles."
            accent="green"
            as="h1"
          />

          {isLoading ? (
            <div className="flex flex-wrap justify-center gap-12">
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
            <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              {partners.map((partner) => {
                const Icon = resolveIcon(partner.icon);
                const inner = (
                  <>
                    <span className="mb-4 flex h-20 items-center justify-center">
                      {partner.logo ? (
                        <img
                          src={partner.logo.url}
                          alt={`Logo ${partner.name}`}
                          loading="lazy"
                          className="max-h-16 w-auto max-w-full object-contain"
                        />
                      ) : (
                        <Icon className="h-10 w-10 text-navy/40" aria-hidden />
                      )}
                    </span>
                    <span className="text-center text-body font-bold text-navy">
                      {partner.name}
                    </span>
                  </>
                );

                return (
                  <li key={partner.id}>
                    {partner.url ? (
                      <a
                        href={partner.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex h-full flex-col items-center rounded-2xl border border-navy/8 bg-white p-6 transition-all hover:-translate-y-1 hover:border-blue/40 hover:shadow-md"
                      >
                        {inner}
                      </a>
                    ) : (
                      <div className="flex h-full flex-col items-center rounded-2xl border border-navy/8 bg-white p-6">
                        {inner}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-16 rounded-2xl bg-warm-muted px-6 py-12 text-center">
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
