import React from 'react';
import { BarChart3 } from 'lucide-react';
import { useGalleryImages, useImpactStats, useMissions } from '../../lib/queries/publicHooks';
import { Seo } from '../../components/seo/Seo';
import { CtaLink } from '../../components/public/CtaLink';
import { ImpactCounter } from '../../components/public/ImpactCounter';
import { SectionHeading } from '../../components/public/SectionHeading';
import { resolveIcon } from '../../lib/icons';
import { BRAND, readableOn } from '../../lib/brand';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States';
import { t } from '../../lib/types';

/**
 * Four numbers and a button did not justify a page of its own.
 *
 * A donor asks three things: what did you achieve, how, and can I see it. The
 * figures answer the first; the domains of action answer the second and the
 * photographs the third. All three already exist in the CMS, so the page gains
 * substance without a single new model, endpoint or piece of invented content.
 */
export const ImpactPage = () => {
  const { data: stats, isLoading, isError, refetch } = useImpactStats();
  const { data: missions } = useMissions();
  const { data: gallery } = useGalleryImages();

  const evidence = (gallery ?? []).slice(0, 6);

  return (
    <>
      <Seo
        title="Notre impact"
        description="Les résultats concrets de Louga Développement Solidaire sur le terrain : chiffres, domaines d'action et photographies."
      />

      {/* ------------------------------------------------------------ Figures */}
      <section className="relative overflow-hidden bg-navy section-y">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_80%_0%,rgba(0,164,222,0.12),transparent_60%)]"
          aria-hidden
        />

        <div className="relative z-10 container-page">
          <div className="mb-16 text-center">
            <p className="mb-3.5 text-eyebrow uppercase text-green">Notre impact</p>
            <h1 className="mb-4 text-h1 text-white">Notre impact en chiffres</h1>
            <p className="mx-auto max-w-2xl text-body-lg text-white/70">
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
                // The band is navy: a statistic stored as navy would vanish.
                const color = readableOn(stat.color, BRAND.navy);

                return (
                  <div key={stat.id} className="group flex flex-col items-center text-center">
                    {Icon && (
                      <span
                        className="mb-5 flex h-14 w-14 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${color}1f`, color }}
                        aria-hidden
                      >
                        <Icon className="h-7 w-7" />
                      </span>
                    )}
                    <dd
                      className="mb-3 text-stat tabular-nums transition-transform duration-500 group-hover:scale-105"
                      style={{ color }}
                    >
                      <ImpactCounter value={stat.value} />
                    </dd>
                    <dt className="text-balance text-caption font-medium uppercase tracking-wide text-white/80">
                      {t(stat.label)}
                    </dt>
                  </div>
                );
              })}
            </dl>
          )}
        </div>
      </section>

      {/* ------------------------------------------- What produced the figures */}
      {(missions ?? []).length > 0 && (
        <section className="bg-warm section-y">
          <div className="container-page">
            <SectionHeading
              eyebrow="D'où viennent ces chiffres"
              title="Les actions qui les produisent"
              description="Chaque indicateur est le résultat d'un travail mené toute l'année sur le terrain."
              accent="blue"
            />

            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {missions!.map((mission, index) => {
                const Icon = resolveIcon(mission.icon);
                const accent = [BRAND.green, BRAND.blue, BRAND.orange][index % 3];

                return (
                  <li
                    key={mission.id}
                    className="flex gap-4 rounded-card bg-white p-5 shadow-e1 ring-1 ring-navy/5"
                  >
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: accent }}
                      aria-hidden
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-h3 text-navy">{t(mission.title)}</span>
                      <span className="mt-1 block text-caption text-navy/65">
                        {t(mission.description)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* --------------------------------------------------- Photographic proof */}
      {evidence.length > 0 && (
        <section className="bg-warm-muted section-y">
          <div className="container-page">
            <SectionHeading
              eyebrow="Sur le terrain"
              title="Ces chiffres en images"
              accent="green"
            />

            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {evidence.map((image) => (
                <li key={image.id} className="overflow-hidden rounded-card shadow-e1">
                  <img
                    src={image.media.url}
                    alt={
                      image.media.altText?.fr ||
                      t(image.caption, "Action de Louga Développement Solidaire sur le terrain")
                    }
                    loading="lazy"
                    decoding="async"
                    width={1200}
                    height={900}
                    className="aspect-[4/3] w-full object-cover"
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ Take part */}
      <section className="bg-warm section-y-sm">
        <div className="container-page text-center">
          <h2 className="mb-4 text-h2-sm text-navy">Ces résultats dépendent de vous</h2>
          <p className="mx-auto mb-8 max-w-xl text-body text-navy/70">
            Chaque contribution finance directement une action sur le terrain à Louga.
          </p>
          <CtaLink to="/nous-soutenir" size="lg">
            Contribuer à cet impact
          </CtaLink>
        </div>
      </section>
    </>
  );
};
