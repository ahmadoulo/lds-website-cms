import React from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../../components/seo/Seo';
import { CtaLink } from '../../components/public/CtaLink';
import { usePagesT } from '../../lib/i18n/dictionaries/pages';

export const NotFoundPage = () => {
  const p = usePagesT();

  return (
    <>
      <Seo title={p.notFound.seoTitle} noIndex />

      <div className="flex min-h-page flex-col items-center justify-center section-y text-center">
        <p className="mb-4 text-display font-extrabold leading-none text-navy/15" aria-hidden>
          404
        </p>
        <h1 className="mb-6 text-3xl font-bold text-navy">{p.notFound.title}</h1>
        <p className="mx-auto mb-8 max-w-md text-lg text-navy/70 sm:mb-10">
          {p.notFound.description}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <CtaLink to="/">{p.notFound.home}</CtaLink>
          <Link
            to="/contact"
            className="rounded-full border-[1.5px] border-navy/15 px-8 py-3.5 font-bold text-navy transition-colors hover:border-navy"
          >
            {p.cta.contact}
          </Link>
        </div>
      </div>
    </>
  );
};
