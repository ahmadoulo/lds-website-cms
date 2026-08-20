import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, X } from 'lucide-react';
import { usePreview } from '../../context/PreviewContext';
import { useAuth } from '../../context/AuthContext';

/**
 * Makes it impossible to mistake a preview for the live site, which is what
 * would otherwise lead an editor to think a change is already published.
 */
export const PreviewBanner = () => {
  const { isPreview } = usePreview();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isPreview) return null;

  const exit = () => {
    const params = new URLSearchParams(location.search);
    params.delete('preview');
    const query = params.toString();
    navigate(`${location.pathname}${query ? `?${query}` : ''}`, { replace: true });
  };

  return (
    <div
      role="status"
      className="sticky top-0 z-[60] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-orange px-4 py-2 text-center text-[13px] font-semibold text-white"
    >
      <span className="flex items-center gap-2">
        <Eye className="h-4 w-4" aria-hidden />
        {isAuthenticated
          ? 'Mode prévisualisation — vous voyez les modifications non publiées.'
          : 'Prévisualisation indisponible : connectez-vous à l’administration pour voir les brouillons.'}
      </span>
      <button
        type="button"
        onClick={exit}
        className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[12px] transition-colors hover:bg-white/30"
      >
        <X className="h-3 w-3" aria-hidden /> Quitter
      </button>
    </div>
  );
};
