import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, MapPin, Star } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import { useT } from '../../lib/i18n/useT';
import { localized, localizedOrSource } from '../../lib/i18n/resolve';
import { formatEventDate } from '../../lib/eventDate';
import { responsiveImage } from '../../lib/imageSrc';
import { track } from '../../lib/analytics';
import { cn } from '../../lib/cn';
import type { NewsArticle } from '../../lib/types';
import { SectionHeading } from './SectionHeading';

/**
 * "À venir" on the homepage: what is coming, where, and how to take part.
 *
 * The server only sends what is due - published, inside its display window,
 * and not over - so this renders what it is given, and nothing at all when
 * that is nothing: an empty "upcoming" heading says the association is idle.
 */
export const UpcomingAnnouncements = ({ articles }: { articles: NewsArticle[] }) => {
  const { upcoming: t, details: d } = useT().announcements;
  const { locale, isRtl } = useLocale();
  if (articles.length === 0) return null;

  return (
    <section className="bg-warm-muted section-y" aria-label={t.title}>
      <div className="container-page">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} description={t.lead} accent="orange" />

        <ul
          className={cn(
            'grid gap-4 sm:gap-8',
            articles.length === 1 ? 'mx-auto max-w-2xl' : 'sm:grid-cols-2 lg:grid-cols-3',
          )}
        >
          {articles.map((article) => {
            const title = localizedOrSource(article.title, locale);
            const excerpt = localized(article.excerpt, locale);
            const place = localized(article.location, locale);
            const when = formatEventDate(article.eventStartsAt, article.eventEndsAt, locale);
            const href = `/actualites/${article.slug}`;

            return (
              <li
                key={article.id}
                className="flex flex-col overflow-hidden rounded-card bg-white shadow-e2 ring-1 ring-navy/5"
              >
                {article.image && (
                  <img
                    {...responsiveImage(article.image.url, '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw', 960)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={1200}
                    height={750}
                    className="aspect-[16/10] w-full object-cover"
                  />
                )}
                <div className="flex flex-1 flex-col p-5 sm:p-7">
                  {article.isFeatured && (
                    <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-orange/10 px-3 py-1 text-caption font-bold text-orange">
                      <Star className="h-3 w-3" aria-hidden /> {t.featured}
                    </span>
                  )}
                  <h3 className="text-lg font-extrabold leading-snug text-navy" {...(title.untranslated ? { lang: 'fr', dir: 'ltr' } : {})}>
                    <Link to={href} className="hover:text-blue">
                      {title.text}
                    </Link>
                  </h3>

                  {(when || place) && (
                    <dl className="mt-3 space-y-1.5 text-caption text-navy/70">
                      {when && (
                        <div className="flex items-start gap-2">
                          <dt className="sr-only">{d.when}</dt>
                          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-green" aria-hidden />
                          <dd>{when}</dd>
                        </div>
                      )}
                      {place && (
                        <div className="flex items-start gap-2">
                          <dt className="sr-only">{d.where}</dt>
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-green" aria-hidden />
                          <dd>{place}</dd>
                        </div>
                      )}
                    </dl>
                  )}

                  {excerpt && <p className="mt-3 line-clamp-3 text-body text-navy/70">{excerpt}</p>}

                  <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-5">
                    <Link
                      to={href}
                      onClick={() => track('Announcement Click', { placement: 'upcoming', slug: article.slug })}
                      className="group inline-flex items-center gap-1.5 text-body font-bold text-blue"
                    >
                      {t.more}
                      <ArrowRight
                        className={cn('h-4 w-4 transition-transform', isRtl ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1')}
                        aria-hidden
                      />
                    </Link>
                    <Link
                      to="/contact"
                      onClick={() => track('Announcement Contact', { placement: 'upcoming', slug: article.slug })}
                      className="text-body font-semibold text-navy/70 underline-offset-4 hover:text-navy hover:underline"
                    >
                      {t.contact}
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
