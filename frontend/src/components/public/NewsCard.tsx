import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ImageIcon } from 'lucide-react';
import { t, type NewsArticle } from '../../lib/types';

export const NewsCard = ({ article }: { article: NewsArticle }) => (
  <article className="flex flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_12px_30px_-14px_rgba(23,38,66,0.14)] transition-transform hover:-translate-y-1">
    <Link to={`/actualites/${article.slug}`} className="block aspect-[4/3] overflow-hidden bg-warm-muted">
      {article.image ? (
        <img
          src={article.image.url}
          alt={article.image.altText?.fr || t(article.title)}
          loading="lazy"
          decoding="async"
          width={1200}
          height={900}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageIcon className="h-8 w-8 text-navy/15" aria-hidden />
        </div>
      )}
    </Link>

    <div className="flex flex-1 flex-col p-7">
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <span className="rounded-full bg-blue/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue">
          {t(article.category?.name, 'Actualité')}
        </span>
        <time
          dateTime={article.publishedAt ?? article.createdAt}
          className="text-[12.5px] text-navy/50"
        >
          {new Date(article.publishedAt ?? article.createdAt).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </time>
      </div>

      <h3 className="mb-3 text-[17.5px] font-extrabold leading-snug text-navy">
        <Link to={`/actualites/${article.slug}`} className="transition-colors hover:text-blue">
          {t(article.title, 'Sans titre')}
        </Link>
      </h3>

      <p className="mb-5 flex-1 text-[14.5px] leading-relaxed text-navy/70">{t(article.excerpt)}</p>

      <Link
        to={`/actualites/${article.slug}`}
        className="group inline-flex items-center text-[13.5px] font-bold text-orange"
      >
        Lire la suite
        <ArrowRight className="ml-1.5 h-3 w-3 transition-transform group-hover:translate-x-1" aria-hidden />
      </Link>
    </div>
  </article>
);
