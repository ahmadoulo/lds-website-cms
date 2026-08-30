import React from 'react';
import { BarChart3 } from 'lucide-react';
import { useImpactStats } from '../../lib/queries/publicHooks';
import { Seo } from '../../components/seo/Seo';
import { CtaLink } from '../../components/public/CtaLink';
import { ImpactCounter } from '../../components/public/ImpactCounter';
import { resolveIcon } from '../../lib/icons';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States';
import { t } from '../../lib/types';

export const ImpactPage = () => {
  const { data: stats, isLoading, isError, refetch } = useImpactStats();

  return (
    <>
      <Seo
        title="Notre impact"
        description="Les résultats concrets de Louga Développement Solidaire sur le terrain, en chiffres."
      />

      <div className="relative flex min-h-[60vh] flex-col justify-center overflow-hidden bg-navy section-y">
        <div
          className="absolute right-0 top-0 h-[600px] w-[600px] bg-[radial-gradient(circle,rgba(135,206,24,0.08),transparent_70%)]"
          aria-hidden
        />

        <div className="relative z-10 container-page">
          <div className="mb-16 text-center">
            <p className="mb-3.5 text-eyebrow uppercase text-green">
              Notre impact
            </p>
            <h1 className="mb-4 text-h1 font-extrabold leading-tight text-white">
              Notre impact en chiffres
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-white/70">
              Grâce au soutien de nos membres et partenaires, voici ce que nous avons accompli sur le
              terrain.
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-32 bg-white/10" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} className="bg-white" />
          ) : !stats?.length ? (
            <EmptyState
              icon={BarChart3}
              title="Aucun chiffre publié"
              description="Nos indicateurs d'impact seront publiés prochainement."
            />
          ) : (
            <dl className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
              {stats.map((stat) => {
                const Icon = stat.icon ? resolveIcon(stat.icon) : null;

                return (
                  <div key={stat.id} className="group flex flex-col items-center text-center">
                    {Icon && (
                      <span
                        className="mb-5 flex h-14 w-14 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${stat.color}1f`, color: stat.color }}
                        aria-hidden
                      >
                        <Icon className="h-7 w-7" />
                      </span>
                    )}
                    <dd
                      className="mb-3 text-5xl font-extrabold leading-none tabular-nums transition-transform duration-500 group-hover:scale-105 md:text-stat"
                      style={{ color: stat.color }}
                    >
                      <ImpactCounter value={stat.value} />
                    </dd>
                    <dt className="text-sm font-medium uppercase tracking-wide text-white/80 md:text-base">
                      {t(stat.label)}
                    </dt>
                  </div>
                );
              })}
            </dl>
          )}

          <div className="mt-16 text-center">
            <CtaLink to="/nous-soutenir">Contribuer à cet impact</CtaLink>
          </div>
        </div>
      </div>
    </>
  );
};
