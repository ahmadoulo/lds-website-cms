import React from 'react';
import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import { useMissions } from '../../lib/queries/publicHooks';
import { Seo } from '../../components/seo/Seo';
import { SectionHeading } from '../../components/public/SectionHeading';
import { MissionCard } from '../../components/public/MissionCard';
import { EmptyState, ErrorState, SkeletonCards } from '../../components/ui/States';

export const ActionsPage = () => {
  const { data: missions, isLoading, isError, refetch } = useMissions();

  return (
    <>
      <Seo
        title="Nos actions"
        description="Les domaines d'intervention de Louga Développement Solidaire : éducation, santé, environnement, insertion professionnelle et solidarité."
      />

      <div className="min-h-[60vh] bg-warm-muted px-6 py-[90px]">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading
            eyebrow="Nos actions"
            title="Nos domaines d'intervention à Louga"
            description="Nous améliorons les conditions de vie à Louga à travers des domaines d'intervention complémentaires."
            accent="orange"
            as="h1"
          />

          {isLoading ? (
            <SkeletonCards count={6} />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : !missions?.length ? (
            <EmptyState
              icon={Target}
              title="Aucun domaine d'action publié"
              description="Nos domaines d'intervention seront présentés ici prochainement."
            />
          ) : (
            <div className="flex flex-wrap justify-center gap-8">
              {missions.map((mission, index) => (
                <div
                  key={mission.id}
                  className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.334rem)]"
                >
                  <MissionCard mission={mission} index={index} />
                </div>
              ))}
            </div>
          )}

          <div className="mt-16 rounded-2xl bg-navy px-6 py-12 text-center">
            <h2 className="mb-4 text-[clamp(22px,2.6vw,28px)] font-extrabold text-white">
              Vous souhaitez soutenir nos actions ?
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-white/70">
              Un don, du temps ou du matériel : chaque contribution nous permet d'aller plus loin.
            </p>
            <Link
              to="/nous-soutenir"
              className="inline-block rounded-full bg-orange px-8 py-3.5 font-bold text-white transition-colors hover:bg-green"
            >
              Nous soutenir
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};
