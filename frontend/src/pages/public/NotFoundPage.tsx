import React from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../../components/seo/Seo';

export const NotFoundPage = () => (
  <>
    <Seo title="Page introuvable" noIndex />

    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-[110px] text-center">
      <p className="mb-4 text-[110px] font-extrabold leading-none text-navy/15" aria-hidden>
        404
      </p>
      <h1 className="mb-6 text-3xl font-bold text-navy">Page introuvable</h1>
      <p className="mx-auto mb-10 max-w-md text-lg text-navy/70">
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          to="/"
          className="rounded-full bg-orange px-8 py-3.5 font-bold text-white shadow-lg transition-transform hover:-translate-y-1"
        >
          Retour à l'accueil
        </Link>
        <Link
          to="/contact"
          className="rounded-full border-[1.5px] border-navy/15 px-8 py-3.5 font-bold text-navy transition-colors hover:border-navy"
        >
          Nous contacter
        </Link>
      </div>
    </div>
  </>
);
