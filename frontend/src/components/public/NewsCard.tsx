import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ImageIcon } from 'lucide-react';
import { t, type NewsArticle } from '../../lib/types';

/**
 * One component, two compositions.
 *
 * On a phone the article becomes a row — thumbnail, title, date — so a list of
 * news reads like a list rather than a column of posters, and the excerpt is
 * held back until there is width to carry it. From `sm` upwards it is the
 * validated desktop card.
 */
export const NewsCard = ({ article }: { article: NewsArticle }) => {
  const href = `/actualites/${article.slug}`;
  const published = article.publishedAt ?? article.createdAt;

  return (
    <article className="group flex h-full items-start gap-4 rounded-card bg-white p-3 shadow-e1 ring-1 ring-navy/5 transition-[transform,box-shadow] duration-300 sm:block sm:p-0 sm:shadow-e2 sm:hover:-translate-y-1.5 sm:hover:shadow-e3">
      <Link
        to={href}
        className="block w-24 shrink-0 overflow-hidden rounded-xl bg-warm-muted sm:w-auto sm:rounded-b-none sm:rounded-t-card"
        tabIndex={-1}
        aria-hidden
      >
        <div className="aspect-square sm:aspect-[16/10]">
          {article.image ? (
            <img
              src={article.image.url}
              alt={article.image.altText?.fr || t(article.title)}
              loading="lazy"
              decoding="async"
              width={1200}
              height={750}
              className="h-full w-full object-cover transition-transform duration-500 sm:group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-6 w-6 text-navy/15 sm:h-8 sm:w-8" aria-hidden />
            </div>
          )}
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col py-0.5 sm:p-7">
        <div className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 sm:mb-3.5">
          <span className="rounded-full bg-blue/10 px-2.5 py-0.5 text-eyebrow uppercase text-blue sm:px-3 sm:py-1">
            {t(article.category?.name, 'Actualité')}
          </span>
          <time dateTime={published} className="text-caption text-navy/50">
            {new Date(published).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </time>
        </div>

        <h3 className="text-h3 leading-snug text-navy sm:mb-3">
          <Link to={href} className="transition-colors hover:text-blue">
            {t(article.title, 'Sans titre')}
          </Link>
        </h3>

        {/* The excerpt would double the row height for little gain on a phone. */}
        <p className="mt-1.5 hidden flex-1 text-body leading-relaxed text-navy/70 sm:mb-5 sm:mt-0 sm:block">
          {t(article.excerpt)}
        </p>

        <Link
          to={href}
          className="mt-2 hidden items-center text-caption font-bold text-orange transition-colors hover:text-navy sm:inline-flex"
        >
          Lire la suite
          <ArrowRight
            className="ml-1.5 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden
          />
        </Link>
      </div>
    </article>
  );
};
