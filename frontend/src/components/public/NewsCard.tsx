import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ImageIcon } from 'lucide-react';
import { t, type NewsArticle } from '../../lib/types';

export const NewsCard = ({ article }: { article: NewsArticle }) => (
  <article className="group flex h-full flex-col overflow-hidden rounded-card bg-white shadow-e2 ring-1 ring-navy/5 transition-[transform,box-shadow] duration-300 hover:-translate-y-1.5 hover:shadow-e3">
    <Link
      to={`/actualites/${article.slug}`}
      className="block aspect-[16/10] overflow-hidden bg-warm-muted"
      tabIndex={-1}
      aria-hidden
    >
      {article.image ? (
        <img
          src={article.image.url}
          alt={article.image.altText?.fr || t(article.title)}
          loading="lazy"
          decoding="async"
          width={1200}
          height={900}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageIcon className="h-8 w-8 text-navy/15" aria-hidden />
        </div>
      )}
    </Link>

    <div className="flex flex-1 flex-col p-7">
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <span className="rounded-full bg-blue/10 px-3 py-1 text-eyebrow uppercase text-blue">
          {t(article.category?.name, 'Actualité')}
        </span>
        <time
          dateTime={article.publishedAt ?? article.createdAt}
          className="text-caption text-navy/50"
        >
          {new Date(article.publishedAt ?? article.createdAt).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </time>
      </div>

      <h3 className="mb-3 text-h3 font-extrabold leading-snug text-navy">
        <Link to={`/actualites/${article.slug}`} className="transition-colors hover:text-blue">
          {t(article.title, 'Sans titre')}
        </Link>
      </h3>

      <p className="mb-5 flex-1 text-body leading-relaxed text-navy/70">{t(article.excerpt)}</p>

      <Link
        to={`/actualites/${article.slug}`}
        className="inline-flex items-center text-caption font-bold text-orange transition-colors hover:text-navy"
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
