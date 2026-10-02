import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { useNews } from '../../lib/queries/publicHooks';
import { Seo } from '../../components/seo/Seo';
import { SectionHeading } from '../../components/public/SectionHeading';
import { NewsCard } from '../../components/public/NewsCard';
import { EmptyState, ErrorState, SkeletonCards } from '../../components/ui/States';
import { Button } from '../../components/ui/Button';


import { useT } from '../../lib/i18n/useT';
import { usePagesT } from '../../lib/i18n/dictionaries/pages';

export const News = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch, isPlaceholderData } = useNews(page, 9);
  const t = useT();
  const p = usePagesT();

  const articles = data?.data ?? [];
  const meta = data?.meta;

  /*
    An article with no Arabic title would sit in the Arabic grid as a French
    card, so it is left out. The API paginates without knowing about languages,
    which means a page can come back holding nothing translated: the visitor is
    told so and keeps the pagination, instead of being shown an empty grid or
    sent back to the first page. At `fr` nothing is ever removed.
  */
  /*
    Nothing is filtered by language: a record with no Arabic is shown in the
    original and marked as such, rather than hidden. Hiding emptied whole
    sections of the Arabic site while the headings above them stayed, which
    read as broken rather than as untranslated.
  */
  const visible = articles;

  return (
    <>
      <Seo title={p.news.seoTitle} description={p.news.seoDescription} />

      <div className="min-h-screen bg-warm section-y">
        <div className="container-page">
          <SectionHeading
            eyebrow={p.shared.newsEyebrow}
            title={p.news.title}
            description={p.news.description}
            accent="green"
            as="h1"
          />

          {isLoading ? (
            <SkeletonCards count={6} />
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : articles.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={p.news.emptyTitle}
              description={p.news.emptyDescription}
            />
          ) : (
            <>
              {visible.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title={p.news.emptyTitle}
                  description={p.news.emptyDescription}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
                  {visible.map((article) => (
                    <NewsCard key={article.id} article={article} />
                  ))}
                </div>
              )}

              {meta && meta.totalPages > 1 && (
                <nav
                  aria-label={p.news.paginationLabel}
                  className="mt-8 flex items-center justify-center gap-4 sm:mt-12"
                >
                  {/*
                    "Précédent" and "Suivant" are the direction of reading, not
                    of the screen: the button that steps backwards stays the one
                    the reader comes from, which in Arabic is on the right. The
                    row is a flex container, so reversing the document direction
                    has already put them there - the labels are what must not be
                    swapped, and they are not.
                  */}
                  <Button
                    variant="outline"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1 || isPlaceholderData}
                  >
                    {t.common.previous}
                  </Button>
                  <span className="text-sm text-navy/60">
                    {p.news.pageOf(meta.page, meta.totalPages)}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((current) => current + 1)}
                    disabled={page >= meta.totalPages || isPlaceholderData}
                  >
                    {t.common.next}
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};
