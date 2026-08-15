import React, { useEffect, useState, useRef } from 'react';

interface ImpactStatProps {
  value: number;
  label: string;
  color: string;
  animated?: boolean;
}

export function ImpactStat({ value, label, color, animated = true }: ImpactStatProps) {
  const [displayValue, setDisplayValue] = useState(animated ? 0 : value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animated) return;
    
    // Check for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        let start = 0;
        const duration = 1500;
        const startTime = performance.now();

        const step = (currentTime: number) => {
          const progress = Math.min((currentTime - startTime) / duration, 1);
          // easeOutQuart
          const easeProgress = 1 - Math.pow(1 - progress, 4);
          setDisplayValue(Math.floor(easeProgress * value));
          
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            setDisplayValue(value);
          }
        };

        requestAnimationFrame(step);
        observer.disconnect();
      }
    }, { threshold: 0.5 });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [value, animated]);

  return (
    <div ref={ref} className="text-center px-2">
      <div 
        className="text-[38px] font-extrabold tabular-nums tracking-tight leading-none"
        style={{ color }}
      >
        {displayValue.toLocaleString('fr-FR')}
      </div>
      <div className="text-[13px] font-semibold mt-2 leading-snug text-white/70">
        {label}
      </div>
    </div>
  );
}
