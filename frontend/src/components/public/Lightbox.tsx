import React, { useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface LightboxSlide {
  src: string;
  alt: string;
  caption?: string;
}

interface LightboxProps {
  slides: LightboxSlide[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

/**
 * Minimal full-screen image viewer. Purpose-built rather than pulled from a
 * package so the production bundle has no ESM/CommonJS interop surprises and
 * the keyboard behaviour matches the rest of the site.
 */
export const Lightbox = ({ slides, index, onIndexChange, onClose }: LightboxProps) => {
  const slide = slides[index];

  const goTo = useCallback(
    (next: number) => {
      if (!slides.length) return;
      onIndexChange((next + slides.length) % slides.length);
    },
    [slides.length, onIndexChange],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') goTo(index + 1);
      if (event.key === 'ArrowLeft') goTo(index - 1);
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [index, goTo, onClose]);

  if (!slide) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visionneuse d'images"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/95 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Image précédente"
            className="absolute left-3 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 sm:left-6"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Image suivante"
            className="absolute right-3 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 sm:right-6"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <figure className="flex max-h-full max-w-5xl flex-col items-center gap-4">
        <img
          src={slide.src}
          alt={slide.alt}
          className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
        />
        {slide.caption && (
          <figcaption className="text-center text-sm text-white/75">{slide.caption}</figcaption>
        )}
        {slides.length > 1 && (
          <p className="text-xs text-white/45">
            {index + 1} / {slides.length}
          </p>
        )}
      </figure>
    </div>
  );
};
