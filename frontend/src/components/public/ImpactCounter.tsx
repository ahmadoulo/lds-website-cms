import React, { useEffect, useRef, useState } from 'react';

interface ImpactCounterProps {
  value: number;
  durationMs?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Counts up to `value` when the element scrolls into view. Written by hand rather
 * than pulled from a library so it respects prefers-reduced-motion and has no
 * CommonJS/ESM interop surprises in the production bundle.
 */
export const ImpactCounter = ({ value, durationMs = 1600, className, style }: ImpactCounterProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [displayed, setDisplayed] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Without IntersectionObserver (older browsers, jsdom) or when the visitor
    // asked for reduced motion, show the final figure straight away.
    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      setDisplayed(value);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || hasRun.current) return;
        hasRun.current = true;
        observer.disconnect();

        const start = performance.now();
        const step = (now: number) => {
          const progress = Math.min((now - start) / durationMs, 1);
          // Ease-out so the number decelerates instead of stopping abruptly.
          const eased = 1 - (1 - progress) ** 3;
          setDisplayed(Math.round(value * eased));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [value, durationMs]);

  return (
    <span ref={ref} className={className} style={style}>
      {displayed.toLocaleString('fr-FR')}
    </span>
  );
};
