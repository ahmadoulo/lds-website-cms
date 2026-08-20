import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { useNews } from '../../lib/queries/publicHooks';
import { Seo } from '../../components/seo/Seo';
import { SectionHeading } from '../../components/public/SectionHeading';
import { NewsCard } from '../../components/public/NewsCard';
import { EmptyState, ErrorState, SkeletonCards } from '../../components/ui/States';
import { Button } from '../../components/ui/Button';

export const News = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch, isPlaceholderData } = useNews(page, 9);

  const articles = data?.data ?? [];
  const meta = data?.meta;

  return (
    <>
      <Seo
        title="Actualités"
        description="Suivez l'évolution des projets, événements et bilans de Louga Développement Solidaire."
      />

      <div className="min-h-screen bg-warm px-6 py-[90px]">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading
            eyebrow="Actualités"
            title="Toutes nos actions"
            description="Suivez en direct l'évolution de nos projets, nos événements et nos bilans sur le terrain à Louga."
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
              title="Aucune actualité pour le moment"
              description="Revenez bientôt pour découvrir nos prochaines actions."
            />
          ) : (
            <>
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                  <NewsCard key={article.id} article={article} />
                ))}
              </div>

              {meta && meta.totalPages > 1 && (
                <nav
                  aria-label="Pagination des actualités"
                  className="mt-12 flex items-center justify-center gap-4"
                >
                  <Button
                    variant="outline"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1 || isPlaceholderData}
                  >
                    Précédent
                  </Button>
                  <span className="text-sm text-navy/60">
                    Page {meta.page} sur {meta.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((current) => current + 1)}
                    disabled={page >= meta.totalPages || isPlaceholderData}
                  >
                    Suivant
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
