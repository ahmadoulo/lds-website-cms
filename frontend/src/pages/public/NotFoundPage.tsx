import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage = () => {
  return (
    <div className="py-[120px] px-6 text-center flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-[120px] font-extrabold text-[#172642] leading-none mb-4">404</h1>
      <h2 className="text-3xl font-bold text-[#172642] mb-6">Page introuvable</h2>
      <p className="text-lg text-[#172642]/70 mb-10 max-w-md mx-auto">
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <Link to="/" className="bg-[#EE7900] text-white px-8 py-3.5 rounded-full font-bold shadow-lg hover:-translate-y-1 transition-transform">
        Retour à l'accueil
      </Link>
    </div>
  );
};
