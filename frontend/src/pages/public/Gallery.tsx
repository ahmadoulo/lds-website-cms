import React, { useMemo, useState } from 'react';
import { Images } from 'lucide-react';
import { useGalleryAlbums } from '../../lib/queries/publicHooks';
import { Seo } from '../../components/seo/Seo';
import { SectionHeading } from '../../components/public/SectionHeading';
import { Lightbox, type LightboxSlide } from '../../components/public/Lightbox';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States';
import { cn } from '../../lib/cn';
import { t } from '../../lib/types';

export const Gallery = () => {
  const { data: albums, isLoading, isError, refetch } = useGalleryAlbums();
  const [activeAlbum, setActiveAlbum] = useState<string>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Albums without photos would render as an empty tab, so they are filtered out.
  const visibleAlbums = useMemo(
    () => (albums ?? []).filter((album) => album.images.length > 0),
    [albums],
  );

  const images = useMemo(() => {
    if (activeAlbum === 'all') {
      return visibleAlbums.flatMap((album) =>
        album.images.map((image) => ({ ...image, albumTitle: t(album.title) })),
      );
    }
    const album = visibleAlbums.find((item) => item.id === activeAlbum);
    return (album?.images ?? []).map((image) => ({ ...image, albumTitle: t(album?.title) }));
  }, [visibleAlbums, activeAlbum]);

  const slides: LightboxSlide[] = images.map((image) => ({
    src: image.media.url,
    alt: image.media.altText?.fr || t(image.caption, image.albumTitle),
    caption: t(image.caption, image.albumTitle),
  }));

  return (
    <>
      <Seo
        title="Galerie"
        description="Les actions de Louga Développement Solidaire en images."
        image={images[0]?.media.url}
      />

      <div className="min-h-screen bg-white px-6 py-[90px]">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading
            eyebrow="Galerie"
            title="Nos actions en images"
            description="Plongez au cœur de nos interventions sur le terrain à Louga."
            as="h1"
          />

          {isLoading ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="aspect-[4/3]" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : visibleAlbums.length === 0 ? (
            <EmptyState
              icon={Images}
              title="Aucune photo pour le moment"
              description="Nos photos de terrain seront publiées ici prochainement."
            />
          ) : (
            <>
              {visibleAlbums.length > 1 && (
                <div className="mb-10 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveAlbum('all')}
                    className={cn(
                      'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                      activeAlbum === 'all'
                        ? 'bg-navy text-white'
                        : 'bg-warm-muted text-navy/65 hover:text-navy',
                    )}
                  >
                    Toutes les photos
                  </button>
                  {visibleAlbums.map((album) => (
                    <button
                      key={album.id}
                      type="button"
                      onClick={() => setActiveAlbum(album.id)}
                      className={cn(
                        'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                        activeAlbum === album.id
                          ? 'bg-navy text-white'
                          : 'bg-warm-muted text-navy/65 hover:text-navy',
                      )}
                    >
                      {t(album.title)}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    aria-label={`Agrandir : ${t(image.caption, image.albumTitle)}`}
                    className="group relative aspect-[4/3] overflow-hidden rounded-2xl shadow-[0_8px_20px_-10px_rgba(23,38,66,0.18)] transition-shadow hover:shadow-[0_16px_32px_-10px_rgba(23,38,66,0.3)]"
                  >
                    <img
                      src={image.media.url}
                      alt={image.media.altText?.fr || t(image.caption, image.albumTitle)}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/85 to-transparent px-3.5 pb-3 pt-8 text-left text-[13px] font-semibold text-white">
                      {t(image.caption, image.albumTitle)}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          slides={slides}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
};
