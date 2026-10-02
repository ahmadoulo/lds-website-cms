import React, { useMemo } from 'react';
import { Target } from 'lucide-react';
import { useMissions } from '../../lib/queries/publicHooks';
import { Seo } from '../../components/seo/Seo';
import { CtaLink } from '../../components/public/CtaLink';
import { SectionHeading } from '../../components/public/SectionHeading';
import { MissionGrid } from '../../components/public/MissionGrid';
import { EmptyState, ErrorState, SkeletonCards } from '../../components/ui/States';
import { useLocale } from '../../context/LocaleContext';
import { hasTranslation } from '../../lib/i18n/resolve';
import { usePagesT } from '../../lib/i18n/dictionaries/pages';

export const ActionsPage = () => {
  const { data: missions, isLoading, isError, refetch } = useMissions();
  const { locale } = useLocale();
  const p = usePagesT();

  /*
    A card with an untranslated title would read as French inside an Arabic
    grid, so a domain the association has not translated is left out rather than
    mixed in. At `fr` every record has its French, and the filter keeps the list
    exactly as it was.
  */
  const visible = useMemo(
    () => (missions ?? []).filter((mission) => hasTranslation(mission.title, locale)),
    [missions, locale],
  );

  // Declared once: the loading, empty and loaded branches all show the same
  // heading, and three copies of an <h1> is one edit away from two in the DOM.
  const heading = (
    <SectionHeading
      eyebrow={p.actions.eyebrow}
      title={p.actions.title}
      description={p.shared.missionsDescription}
      accent="green"
      as="h1"
    />
  );

  return (
    <>
      <Seo title={p.actions.seoTitle} description={p.actions.seoDescription} />

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
                title={p.actions.emptyTitle}
                description={p.actions.emptyDescription}
              />
            </>
          ) : !visible.length ? (
            // There are domains, none of them in this language: say so, rather
            // than claiming the association publishes nothing.
            <>
              {heading}
              <EmptyState
                icon={Target}
                title={p.shared.untranslatedTitle}
                description={p.shared.untranslatedDescription}
              />
            </>
          ) : (
            <MissionGrid
              missions={visible}
              eyebrow={p.actions.eyebrow}
              title={p.actions.title}
              description={p.shared.missionsDescription}
              as="h1"
            />
          )}

          <div className="mt-10 rounded-2xl bg-navy px-5 py-9 text-center sm:mt-16 sm:px-6 sm:py-12">
            <h2 className="mb-4 text-h2 font-extrabold text-white">{p.actions.supportTitle}</h2>
            <p className="mx-auto mb-8 max-w-xl text-white/70">{p.actions.supportDescription}</p>
            <CtaLink to="/nous-soutenir">{p.cta.support}</CtaLink>
          </div>
        </div>
      </div>
    </>
  );
};
