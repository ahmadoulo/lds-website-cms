import React, { useState } from 'react';
import { useGallery } from '../../lib/queries/publicHooks';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

export const Gallery = () => {
  const { data: gallery, isLoading } = useGallery();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const images = gallery || [];
  const slides = images.map((img: any) => ({ src: img.image?.url || '', title: img.title?.fr }));

  return (
    <div className="py-[110px] px-6 bg-white min-h-screen">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-[60px]">
          <div className="text-[#00A4DE] font-bold tracking-wider uppercase text-[13px] mb-3.5">Galerie</div>
          <h1 className="text-[clamp(32px,4vw,44px)] font-extrabold mb-4 text-[#172642]">Nos actions en images</h1>
          <p className="text-[16.5px] text-[#172642]/65 max-w-[600px] mx-auto">
            Plongez au cœur de nos interventions sur le terrain à Louga à travers notre sélection de clichés.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-[#172642]/60">Chargement de la galerie...</div>
        ) : images.length === 0 ? (
          <div className="text-center py-20 bg-[#F5F2EC] rounded-2xl max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-[#172642] mb-2">Aucune photo pour le moment</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {images.map((img: any, idx: number) => (
              <div 
                key={img.id} 
                onClick={() => { setPhotoIndex(idx); setLightboxOpen(true); }}
                className="relative rounded-2xl overflow-hidden cursor-pointer aspect-[4/3] shadow-[0_8px_20px_-10px_rgba(23,38,66,0.18)] hover:shadow-[0_16px_32px_-10px_rgba(23,38,66,0.3)] transition-shadow duration-250 group"
              >
                {img.image && <img src={img.image.url} alt={img.title?.fr} className="w-full h-full object-cover" />}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#172642]/85 to-transparent pt-[30px] px-3.5 pb-3">
                  <span className="text-white font-semibold text-[13px]">{img.title?.fr}</span>
                </div>
                <div className="absolute top-2.5 right-2.5 w-[30px] h-[30px] rounded-full bg-white/90 flex items-center justify-center text-[#172642] opacity-0 group-hover:opacity-100 transition-opacity">
                  +
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={photoIndex}
        slides={slides}
      />
    </div>
  );
};
