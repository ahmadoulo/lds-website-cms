import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ImageIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useLocale } from '../../context/LocaleContext';
import { INTL_LOCALE, useComponentsT } from '../../lib/i18n/dictionaries/components';
import { localized, localizedOrSource } from '../../lib/i18n/resolve';
import type { NewsArticle } from '../../lib/types';

/**
 * One component, two compositions.
 *
 * On a phone the article becomes a row — thumbnail, title, date — so a list of
 * news reads like a list rather than a column of posters, and the excerpt is
 * held back until there is width to carry it. From `sm` upwards it is the
 * validated desktop card.
 */
export const NewsCard = ({ article }: { article: NewsArticle }) => {
  const t = useComponentsT();
  const { locale, isRtl } = useLocale();
  const href = `/actualites/${article.slug}`;
  const published = article.publishedAt ?? article.createdAt;

  /*
    An article listed in Arabic without an Arabic title would be a blank card,
    so the French is shown and marked as French. The excerpt is held to the
    strict reading instead: a missing one simply leaves the line out, which it
    already did when the association had written none.
  */
  const title = localizedOrSource(article.title, locale);
  const category = localizedOrSource(article.category?.name, locale);
  const excerpt = localized(article.excerpt, locale);
  const altText = localized(article.image?.altText, locale) || title.text;

  // The month is a word, so the date cannot be assembled by hand; `ar-u-nu-latn`
  // is what keeps the year in the Western digits the glossary asks for.
  const publishedLabel = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(published));

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
              alt={altText}
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
          <span
            className="rounded-full bg-blue/10 px-2.5 py-0.5 text-eyebrow uppercase text-blue sm:px-3 sm:py-1"
            lang={category.untranslated ? 'fr' : undefined}
          >
            {category.text || t.news.category}
          </span>
          <time dateTime={published} className="text-caption text-navy/50">
            {publishedLabel}
          </time>
        </div>

        <h3
          className="text-h3 leading-snug text-navy sm:mb-3"
          lang={title.untranslated ? 'fr' : undefined}
          dir={title.untranslated ? 'ltr' : undefined}
        >
          <Link to={href} className="transition-colors hover:text-blue">
            {title.text || t.news.untitled}
          </Link>
        </h3>

        {/* The excerpt would double the row height for little gain on a phone. */}
        <p className="mt-1.5 hidden flex-1 text-body leading-relaxed text-navy/70 sm:mb-5 sm:mt-0 sm:block">
          {excerpt}
        </p>

        <Link
          to={href}
          className="mt-2 hidden items-center text-caption font-bold text-orange transition-colors hover:text-navy sm:inline-flex"
        >
          {t.news.readMore}
          {/* An arrow that says "onwards" has to point the way the page is
              read, so it turns round in Arabic - and drifts the same way. */}
          <ArrowRight
            className={cn(
              'ms-1.5 h-3.5 w-3.5 transition-transform duration-300',
              isRtl ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1',
            )}
            aria-hidden
          />
        </Link>
      </div>
    </article>
  );
};
