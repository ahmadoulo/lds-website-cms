import React from 'react';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { usePartners } from '../../lib/queries/publicHooks';
import { Seo } from '../../components/seo/Seo';
import { SectionHeading } from '../../components/public/SectionHeading';
import { PartnerCard } from '../../components/public/PartnerCard';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States';
import { usePagesT } from '../../lib/i18n/dictionaries/pages';

export const PartnersPage = () => {
  const { data: partners, isLoading, isError, refetch } = usePartners();
  const p = usePagesT();

  /*
    No language filter here, unlike the other listings: a partner is a `name`
    and a logo, not a translatable text. GIZ is GIZ in both languages.
  */

  return (
    <>
      <Seo title={p.partners.seoTitle} description={p.partners.seoDescription} />

      <div className="min-h-page bg-white section-y">
        <div className="container-page">
          <SectionHeading
            eyebrow={p.partners.eyebrow}
            title={p.partners.title}
            description={p.partners.description}
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
              title={p.partners.emptyTitle}
              description={p.partners.emptyDescription}
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
              {p.partners.becomeTitle}
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-navy/70">{p.partners.becomeDescription}</p>
            <Link
              to="/contact"
              className="inline-block rounded-full bg-navy px-8 py-3.5 font-bold text-white transition-colors hover:bg-blue"
            >
              {p.cta.contact}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};
