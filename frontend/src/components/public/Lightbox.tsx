import React, { useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';
import { useComponentsT } from '../../lib/i18n/dictionaries/components';
import { useT } from '../../lib/i18n/useT';

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
  const t = useComponentsT();
  const common = useT().common;
  const { isRtl } = useLocale();
  const slide = slides[index];

  const goTo = useCallback(
    (next: number) => {
      if (!slides.length) return;
      onIndexChange((next + slides.length) % slides.length);
    },
    [slides.length, onIndexChange],
  );

  useEffect(() => {
    /*
      The arrow keys are physical: the key that points at the next photo is the
      left one when the gallery is read right to left, so the direction is what
      decides which way the index moves, not the key's name.
    */
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') goTo(index + (isRtl ? -1 : 1));
      if (event.key === 'ArrowLeft') goTo(index + (isRtl ? 1 : -1));
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [index, goTo, onClose, isRtl]);

  if (!slide) return null;

  const PreviousIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.lightbox.label}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/95 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={common.close}
        /* The close button stays in the trailing top corner, which is the
           left-hand one in Arabic. */
        className="absolute end-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:end-4 sm:top-4"
      >
        <X className="h-5 w-5" />
      </button>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label={t.lightbox.previous}
            /* Going back is going towards the reading edge, so this button sits
               at the start - the right in Arabic - and its chevron is chosen
               rather than mirrored, because a chevron is a direction. */
            className="absolute start-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:start-6 sm:h-11 sm:w-11"
          >
            <PreviousIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label={t.lightbox.next}
            className="absolute end-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:end-6 sm:h-11 sm:w-11"
          >
            <NextIcon className="h-6 w-6" />
          </button>
        </>
      )}

      <figure className="flex max-h-full max-w-5xl flex-col items-center gap-4">
        <img
          src={slide.src}
          alt={slide.alt}
          decoding="async"
          /* dvh, not vh: on a phone the browser chrome would push the bottom
             of the photo and its caption off screen. */
          className="max-h-[80dvh] w-auto max-w-full rounded-lg object-contain"
        />
        {slide.caption && (
          <figcaption className="text-center text-sm text-white/75">{slide.caption}</figcaption>
        )}
        {slides.length > 1 && (
          <p className="text-xs text-white/45">
            {/* Two numbers either side of a slash: isolated, or the
                bidirectional algorithm prints 1 / 12 as 12 / 1. */}
            <bdi>{t.lightbox.position(index + 1, slides.length)}</bdi>
          </p>
        )}
      </figure>
    </div>
  );
};
