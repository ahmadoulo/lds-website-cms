import React from 'react';
import { Search } from 'lucide-react';

interface GalleryCardProps {
  imageUrl: string;
  caption: string;
  onClick: () => void;
}

export function GalleryCard({ imageUrl, caption, onClick }: GalleryCardProps) {
  return (
    <div 
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden cursor-pointer aspect-[4/3] shadow-[0_8px_20px_-10px_rgba(23,38,66,0.18)] hover:shadow-[0_16px_32px_-10px_rgba(23,38,66,0.3)] transition-all duration-300 group"
    >
      <img 
        src={imageUrl} 
        alt={caption} 
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/90 to-transparent p-4 pt-8">
        <span className="text-white font-semibold text-[13px]">{caption}</span>
      </div>
      <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 text-navy flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Search className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}
