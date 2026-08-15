import React, { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface LightboxProps {
  images: { src: string; caption: string }[];
  initialIndex: number;
  onClose: () => void;
}

export function Lightbox({ images, initialIndex, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose, handlePrevious, handleNext]);

  return (
    <div className="fixed inset-0 z-[300] bg-[#0f141e]/90 flex items-center justify-center p-10" onClick={onClose}>
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(); }} 
        className="absolute top-7 right-7 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <X />
      </button>
      
      <button 
        onClick={(e) => { e.stopPropagation(); handlePrevious(); }} 
        className="absolute left-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <ChevronLeft />
      </button>

      <button 
        onClick={(e) => { e.stopPropagation(); handleNext(); }} 
        className="absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
      >
        <ChevronRight />
      </button>

      <div onClick={(e) => e.stopPropagation()} className="max-w-[min(880px,90%)] text-center">
        <img 
          src={images[currentIndex].src} 
          alt={images[currentIndex].caption} 
          className="max-w-full max-h-[74vh] object-contain rounded-[14px] shadow-[0_24px_60px_rgba(0,0,0,0.5)] mx-auto mb-4 block"
        />
        <span className="text-white font-semibold text-[15px]">{images[currentIndex].caption}</span>
      </div>
    </div>
  );
}
