import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { useImpactStats } from '../../lib/queries/publicHooks';
import { Seo } from '../../components/seo/Seo';
import { ImpactCounter } from '../../components/public/ImpactCounter';
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

      <div className="relative flex min-h-[60vh] flex-col justify-center overflow-hidden bg-navy px-6 py-[110px]">
        <div
          className="absolute right-0 top-0 h-[600px] w-[600px] bg-[radial-gradient(circle,rgba(135,206,24,0.08),transparent_70%)]"
          aria-hidden
        />

        <div className="relative z-10 mx-auto w-full max-w-[1280px]">
          <div className="mb-16 text-center">
            <p className="mb-3.5 text-[13px] font-bold uppercase tracking-wider text-green">
              Notre impact
            </p>
            <h1 className="mb-4 text-[clamp(32px,4vw,44px)] font-extrabold leading-tight text-white">
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
              {stats.map((stat) => (
                <div key={stat.id} className="group text-center">
                  <dd
                    className="mb-3 text-5xl font-extrabold tabular-nums transition-transform duration-500 group-hover:scale-105 md:text-[64px]"
                    style={{ color: stat.color }}
                  >
                    <ImpactCounter value={stat.value} />
                  </dd>
                  <dt className="text-sm font-medium uppercase tracking-wide text-white/80 md:text-base">
                    {t(stat.label)}
                  </dt>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-16 text-center">
            <Link
              to="/nous-soutenir"
              className="inline-block rounded-full bg-orange px-8 py-3.5 font-bold text-white transition-colors hover:bg-green"
            >
              Contribuer à cet impact
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};
