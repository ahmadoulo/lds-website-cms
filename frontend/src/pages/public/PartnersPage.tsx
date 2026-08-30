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
            accent="blue"
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
            <ul className="flex flex-wrap justify-center gap-6">
              {partners.map((partner) => {
                const Icon = resolveIcon(partner.icon);
                const inner = (
                  <>
                    <span className="mb-4 flex h-14 w-full items-center justify-center">
                      {partner.logo ? (
                        <img
                          src={partner.logo.url}
                          alt={`Logo ${partner.name}`}
                          loading="lazy"
                          className="max-h-14 w-auto max-w-full object-contain"
                        />
                      ) : (
                        <Icon className="h-8 w-8 text-navy/30" aria-hidden />
                      )}
                    </span>
                    <span className="text-balance text-center text-caption font-bold text-navy">
                      {partner.name}
                    </span>
                  </>
                );

                return (
                  <li
                    key={partner.id}
                    className="w-[calc(50%-0.75rem)] sm:w-[calc(33.333%-1rem)] lg:w-[calc(25%-1.125rem)]"
                  >
                    {partner.url ? (
                      <a
                        href={partner.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex h-full flex-col items-center justify-center rounded-card bg-white p-5 shadow-e1 ring-1 ring-navy/5 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-e2"
                      >
                        {inner}
                      </a>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center rounded-card bg-white p-5 shadow-e1 ring-1 ring-navy/5">
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
