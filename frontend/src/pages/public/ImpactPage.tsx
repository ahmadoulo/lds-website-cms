import React from 'react';
import { BarChart3 } from 'lucide-react';
import { useGalleryImages, useImpactStats, useMissions } from '../../lib/queries/publicHooks';
import { Seo } from '../../components/seo/Seo';
import { CtaLink } from '../../components/public/CtaLink';
import { ImpactFigures } from '../../components/public/ImpactFigures';
import { SectionHeading } from '../../components/public/SectionHeading';
import { resolveIcon } from '../../lib/icons';
import { BRAND } from '../../lib/brand';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States';
import { useLocale } from '../../context/LocaleContext';
import { localized } from '../../lib/i18n/resolve';
import { usePagesT } from '../../lib/i18n/dictionaries/pages';

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
  const { locale } = useLocale();
  const p = usePagesT();

  /*
    A figure is only an argument if its label can be read: 620 with a French
    label in an Arabic column says nothing, so an untranslated indicator is left
    out. Same for the domains below. Neither filter removes anything at `fr`.
  */
  /*
    Nothing is filtered by language: a record with no Arabic is shown in the
    original and marked as such, rather than hidden. Hiding emptied whole
    sections of the Arabic site while the headings above them stayed, which
    read as broken rather than as untranslated.
  */
  const visibleStats = stats ?? [];

  const visibleMissions = missions ?? [];

  // Photographs need no translation, so the proof strip is never filtered.
  const evidence = (gallery ?? []).slice(0, 6);

  return (
    <>
      <Seo title={p.impact.seoTitle} description={p.impact.seoDescription} />

      {/* ------------------------------------------------------------ Figures */}
      <section className="relative overflow-hidden bg-navy section-y">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_80%_0%,rgba(0,164,222,0.12),transparent_60%)]"
          aria-hidden
        />

        <div className="relative z-10 container-page">
          <div className="mb-10 text-center sm:mb-16">
            <p className="mb-3.5 text-eyebrow uppercase text-green">{p.shared.impactEyebrow}</p>
            <h1 className="mb-4 text-h1 text-white">{p.shared.impactFiguresTitle}</h1>
            <p className="mx-auto max-w-2xl text-body-lg text-white/70">{p.impact.lead}</p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4 md:gap-8">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-32 bg-white/10" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} className="bg-white" />
          ) : !stats?.length ? (
            <EmptyState
              icon={BarChart3}
              title={p.impact.emptyTitle}
              description={p.impact.emptyDescription}
            />
          ) : !visibleStats.length ? (
            <EmptyState
              icon={BarChart3}
              title={p.impact.emptyTitle}
              description={p.impact.emptyDescription}
            />
          ) : (
            <ImpactFigures stats={visibleStats} size="lg" />
          )}
        </div>
      </section>

      {/* ------------------------------------------- What produced the figures */}
      {(missions ?? []).length > 0 && (
        <section className="bg-warm section-y">
          <div className="container-page">
            <SectionHeading
              eyebrow={p.impact.sourceEyebrow}
              title={p.impact.sourceTitle}
              description={p.impact.sourceDescription}
              accent="blue"
            />

            {visibleMissions.length === 0 ? (
              <EmptyState
                title={p.impact.emptyTitle}
                description={p.impact.emptyDescription}
              />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleMissions.map((mission, index) => {
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
                        <span className="block text-h3 text-navy">
                          {localized(mission.title, locale)}
                        </span>
                        <span className="mt-1 block text-caption text-navy/65">
                          {localized(mission.description, locale)}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* --------------------------------------------------- Photographic proof */}
      {evidence.length > 0 && (
        <section className="bg-warm-muted section-y">
          <div className="container-page">
            <SectionHeading
              eyebrow={p.impact.fieldEyebrow}
              title={p.impact.fieldTitle}
              accent="green"
            />

            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {evidence.map((image) => (
                <li key={image.id} className="overflow-hidden rounded-card shadow-e1">
                  <img
                    src={image.media.url}
                    alt={
                      localized(image.media.altText, locale) ||
                      localized(image.caption, locale) ||
                      p.alt.organizationFieldAction
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
          <h2 className="mb-4 text-h2-sm text-navy">{p.impact.takePartTitle}</h2>
          <p className="mx-auto mb-8 max-w-xl text-body text-navy/70">
            {p.impact.takePartDescription}
          </p>
          <CtaLink to="/nous-soutenir" size="lg">
            {p.cta.contributeImpact}
          </CtaLink>
        </div>
      </section>
    </>
  );
};
