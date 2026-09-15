import React from 'react';
import { Target } from 'lucide-react';
import { useMissions } from '../../lib/queries/publicHooks';
import { Seo } from '../../components/seo/Seo';
import { CtaLink } from '../../components/public/CtaLink';
import { SectionHeading } from '../../components/public/SectionHeading';
import { MissionGrid } from '../../components/public/MissionGrid';
import { EmptyState, ErrorState, SkeletonCards } from '../../components/ui/States';

export const ActionsPage = () => {
  const { data: missions, isLoading, isError, refetch } = useMissions();

  // Declared once: the loading, empty and loaded branches all show the same
  // heading, and three copies of an <h1> is one edit away from two in the DOM.
  const heading = (
    <SectionHeading
      eyebrow="Nos actions"
      title="Nos domaines d'intervention à Louga"
      description="Nous améliorons les conditions de vie à Louga à travers des domaines d'intervention complémentaires."
      accent="green"
      as="h1"
    />
  );

  return (
    <>
      <Seo
        title="Nos actions"
        description="Les domaines d'intervention de Louga Développement Solidaire : éducation, santé, environnement, insertion professionnelle et solidarité."
      />

      <div className="min-h-page bg-warm-muted section-y">
        <div className="container-page">
          {isLoading ? (
            <>
              {heading}
              <SkeletonCards count={6} />
            </>
          ) : isError ? (
            // The error branch needs the heading too, or the page ships with
            // no <h1> at all exactly when something has gone wrong.
            <>
              {heading}
              <ErrorState onRetry={() => void refetch()} />
            </>
          ) : !missions?.length ? (
            <>
              {heading}
              <EmptyState
                icon={Target}
                title="Aucun domaine d'action publié"
                description="Nos domaines d'intervention seront présentés ici prochainement."
              />
            </>
          ) : (
            <MissionGrid
              missions={missions}
              eyebrow="Nos actions"
              title="Nos domaines d'intervention à Louga"
              description="Nous améliorons les conditions de vie à Louga à travers des domaines d'intervention complémentaires."
              as="h1"
            />
          )}

          <div className="mt-10 rounded-2xl bg-navy px-5 py-9 text-center sm:mt-16 sm:px-6 sm:py-12">
            <h2 className="mb-4 text-h2 font-extrabold text-white">
              Vous souhaitez soutenir nos actions ?
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-white/70">
              Un don, du temps ou du matériel : chaque contribution nous permet d'aller plus loin.
            </p>
            <CtaLink to="/nous-soutenir">Nous soutenir</CtaLink>
          </div>
        </div>
      </div>
    </>
  );
};
