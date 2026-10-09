import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, ImageIcon, Info, Tag } from 'lucide-react';
import { useNewsArticle } from '../../lib/queries/publicHooks';
import { Seo } from '../../components/seo/Seo';
import { NewsCard } from '../../components/public/NewsCard';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/cn';
import { useLocale } from '../../context/LocaleContext';
import { localized, localizedOrSource } from '../../lib/i18n/resolve';
import { usePagesT } from '../../lib/i18n/dictionaries/pages';
import type { Locale } from '../../lib/i18n/locale';
import { responsiveImage } from '../../lib/imageSrc';
import { AnnouncementActions, AnnouncementFacts, ShareBar } from '../../components/public/AnnouncementParts';

/**
 * The locale tags the dates are formatted with.
 *
 * `ar` alone would render 2 octobre 2026 as ٢ أكتوبر ٢٠٢٦: the Arabic locale's
 * default numbering system is `arab`. The association's figures are written in
 * western Arabic numerals - 620, not ٦٢٠ - and a date must match them, so the
 * numbering system is pinned on the tag rather than the month name being
 * assembled by hand.
 */
const DATE_LOCALE: Record<Locale, string> = {
  fr: 'fr-FR',
  ar: 'ar-u-nu-latn',
};

export const NewsDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError, error, refetch } = useNewsArticle(slug);
  const { locale, isRtl } = useLocale();
  const p = usePagesT();

  const isNotFound = (error as { response?: { status?: number } })?.response?.status === 404;

  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(DATE_LOCALE[locale], {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [locale],
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[800px] section-y gutter-x">
        <Skeleton className="mb-6 h-10 w-3/4" />
        <Skeleton className="mb-8 aspect-[16/9] w-full sm:mb-10" />
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
      <div className="mx-auto max-w-2xl section-y">
        <EmptyState
          icon={ImageIcon}
          title={p.newsDetail.notFoundTitle}
          description={p.newsDetail.notFoundDescription}
          action={
            <Link to="/actualites">
              <Button variant="outline">{p.cta.backToNews}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl section-y">
        <ErrorState onRetry={() => void refetch()} />
      </div>
    );
  }

  const { article, related } = data!;
  const publishedAt = article.publishedAt ?? article.createdAt;

  /*
    A listing hides what it cannot translate; a page reached by a shared link
    cannot, or the link is dead. So the article is read with the fallback, and
    the reader is told in Arabic that what follows is the French original -
    which is the one place on the public site where showing the source text is
    better than showing nothing.
  */
  const title = localizedOrSource(article.title, locale);
  const excerpt = localizedOrSource(article.excerpt, locale);
  const content = localizedOrSource(article.content, locale);
  const isUntranslated = title.untranslated || content.untranslated;

  /*
    Nothing is filtered by language: a record with no Arabic is shown in the
    original and marked as such, rather than hidden. Hiding emptied whole
    sections of the Arabic site while the headings above them stayed, which
    read as broken rather than as untranslated.
  */
  const relatedTranslated = related;

  return (
    <>
      <Seo
        title={title.text}
        description={excerpt.text}
        image={article.image?.url}
        type="article"
        /* Archived: still reachable at the address that was shared, no longer indexed. */
        noIndex={Boolean(article.archivedAt)}
      />

      <article className="bg-white section-y-sm">
        <div className="mx-auto max-w-[800px] gutter-x">
          <Link
            to="/actualites"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-navy/60 transition-colors hover:text-blue"
          >
            {/* "Back" points the way the reader came from: it follows the script. */}
            <ArrowLeft className={cn('h-4 w-4', isRtl && 'rotate-180')} aria-hidden />{' '}
            {p.cta.backToNews}
          </Link>

          <div className="mb-5 flex flex-wrap items-center gap-4 text-caption text-navy/55">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue/10 px-3 py-1 font-bold uppercase tracking-wider text-blue">
              {/* A label, not an arrow: a tag has no reading direction. */}
              <Tag className="h-3 w-3" aria-hidden />{' '}
              {localizedOrSource(article.category?.name, locale).text ||
                p.newsDetail.categoryFallback}
            </span>
            <time dateTime={publishedAt} className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {dateFormat.format(new Date(publishedAt))}
            </time>
          </div>

          <h1 className="mb-6 text-h2 font-extrabold leading-[1.15] text-navy">{title.text}</h1>

          {isUntranslated && (
            <p
              role="note"
              className="mb-6 flex items-start gap-2.5 rounded-lg border border-navy/10 bg-warm-muted px-4 py-3 text-caption text-navy/70"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue" aria-hidden />
              {p.newsDetail.untranslatedNotice}
            </p>
          )}

          {/* The rule hangs on the side the text starts from, in both scripts. */}
          <p className="mb-8 border-s-4 border-green ps-4 text-lead leading-relaxed text-navy/70 sm:mb-10 sm:ps-5">
            {excerpt.text}
          </p>

          {article.image && (
            <img
              {...responsiveImage(article.image.url, '(min-width: 768px) 720px, 100vw', 1280)}
              alt={localized(article.image.altText, locale) || title.text}
              /* The lead image of the article being read: it is the LCP here. */
              fetchPriority="high"
              decoding="async"
              width={1600}
              height={900}
              className="mb-8 aspect-[16/9] w-full rounded-2xl object-cover shadow-e3 sm:mb-10"
            />
          )}

          <AnnouncementFacts article={article} />

          {/*
            The body is sanitised server-side on every write (tags and attributes
            are whitelisted), so rendering it as HTML is safe here.

            When the body is the French original inside an Arabic page it is
            marked as such, so the browser lays those paragraphs out left to
            right and a screen reader switches voice instead of spelling French
            out in Arabic.
          */}
          <div
            className="prose-lds"
            {...(content.untranslated ? { lang: 'fr', dir: 'ltr' } : {})}
            dangerouslySetInnerHTML={{ __html: content.text }}
          />

          <AnnouncementActions article={article} />
          <ShareBar slug={article.slug} title={title.text} />
        </div>
      </article>

      {relatedTranslated.length > 0 && (
        <section className="bg-warm-muted section-y-sm">
          <div className="container-page">
            <h2 className="mb-7 text-center text-h2 font-extrabold text-navy sm:mb-10">
              {p.newsDetail.relatedTitle}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
              {relatedTranslated.map((item) => (
                <NewsCard key={item.id} article={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
};
