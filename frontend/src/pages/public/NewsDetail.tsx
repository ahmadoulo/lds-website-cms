import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, ImageIcon, Tag } from 'lucide-react';
import { useNewsArticle } from '../../lib/queries/publicHooks';
import { Seo } from '../../components/seo/Seo';
import { NewsCard } from '../../components/public/NewsCard';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States';
import { Button } from '../../components/ui/Button';
import { t } from '../../lib/types';

export const NewsDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError, error, refetch } = useNewsArticle(slug);

  const isNotFound = (error as { response?: { status?: number } })?.response?.status === 404;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[800px] px-6 py-[90px]">
        <Skeleton className="mb-6 h-10 w-3/4" />
        <Skeleton className="mb-10 aspect-[16/9] w-full" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (isNotFound || (!isLoading && !data?.article)) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-[110px]">
        <EmptyState
          icon={ImageIcon}
          title="Article introuvable"
          description="Cet article n'existe pas ou n'est plus publié."
          action={
            <Link to="/actualites">
              <Button variant="outline">Retour aux actualités</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-[110px]">
        <ErrorState onRetry={() => void refetch()} />
      </div>
    );
  }

  const { article, related } = data!;
  const publishedAt = article.publishedAt ?? article.createdAt;

  return (
    <>
      <Seo
        title={t(article.title)}
        description={t(article.excerpt)}
        image={article.image?.url}
        type="article"
      />

      <article className="bg-white px-6 py-[70px]">
        <div className="mx-auto max-w-[800px]">
          <Link
            to="/actualites"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-navy/60 transition-colors hover:text-blue"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Retour aux actualités
          </Link>

          <div className="mb-5 flex flex-wrap items-center gap-4 text-[13px] text-navy/55">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue/10 px-3 py-1 font-bold uppercase tracking-wider text-blue">
              <Tag className="h-3 w-3" aria-hidden /> {t(article.category?.name, 'Actualité')}
            </span>
            <time dateTime={publishedAt} className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {new Date(publishedAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </time>
          </div>

          <h1 className="mb-6 text-[clamp(28px,4vw,42px)] font-extrabold leading-[1.15] text-navy">
            {t(article.title)}
          </h1>

          <p className="mb-10 border-l-4 border-green pl-5 text-[18px] leading-relaxed text-navy/70">
            {t(article.excerpt)}
          </p>

          {article.image && (
            <img
              src={article.image.url}
              alt={article.image.altText?.fr || t(article.title)}
              className="mb-10 aspect-[16/9] w-full rounded-2xl object-cover shadow-[0_24px_50px_-18px_rgba(23,38,66,0.25)]"
            />
          )}

          {/*
            The body is sanitised server-side on every write (tags and attributes
            are whitelisted), so rendering it as HTML is safe here.
          */}
          <div
            className="prose-lds"
            dangerouslySetInnerHTML={{ __html: t(article.content) }}
          />
        </div>
      </article>

      {related.length > 0 && (
        <section className="bg-warm-muted px-6 py-[80px]">
          <div className="mx-auto max-w-[1280px]">
            <h2 className="mb-10 text-center text-[clamp(22px,2.8vw,30px)] font-extrabold text-navy">
              À lire également
            </h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <NewsCard key={item.id} article={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
};
