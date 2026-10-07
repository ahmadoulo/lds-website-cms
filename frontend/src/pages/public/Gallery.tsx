import React, { useMemo, useState } from 'react';
import { Images } from 'lucide-react';
import { useGalleryAlbums } from '../../lib/queries/publicHooks';
import { Seo } from '../../components/seo/Seo';
import { SectionHeading } from '../../components/public/SectionHeading';
import { Lightbox, type LightboxSlide } from '../../components/public/Lightbox';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States';
import { cn } from '../../lib/cn';
import { useLocale } from '../../context/LocaleContext';
import { localized, localizedOrSource } from '../../lib/i18n/resolve';
import { usePagesT } from '../../lib/i18n/dictionaries/pages';
import { responsiveImage, variantUrl } from '../../lib/imageSrc';

export const Gallery = () => {
  const { data: albums, isLoading, isError, refetch } = useGalleryAlbums();
  const [activeAlbum, setActiveAlbum] = useState<string>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { locale } = useLocale();
  const p = usePagesT();

  // Albums without photos would render as an empty tab, so they are filtered out.
  const visibleAlbums = useMemo(
    () => (albums ?? []).filter((album) => album.images.length > 0),
    [albums],
  );

  /*
    Albums are not filtered by language, and captions are not required.

    A photograph carries its meaning in both languages: hiding an album because
    its title has no Arabic would hide the photographs with it, for nothing. The
    tab label is therefore the one documented use of `localizedOrSource` on this
    page - a chip is worth showing in French rather than not at all - while a
    caption is read strictly and simply omitted when it has no Arabic, the same
    way an untitled photo already behaves in French.
  */
  const images = useMemo(() => {
    const shown =
      activeAlbum === 'all'
        ? visibleAlbums
        : visibleAlbums.filter((album) => album.id === activeAlbum);

    return shown.flatMap((album) => {
      const albumTitle = localizedOrSource(album.title, locale).text;
      return album.images.map((image) => ({ ...image, albumTitle }));
    });
  }, [visibleAlbums, activeAlbum, locale]);

  const captionOf = (image: (typeof images)[number]) =>
    localized(image.caption, locale) || image.albumTitle;

  const slides: LightboxSlide[] = images.map((image) => ({
    /* The lightbox draws the photo as large as the screen allows, so it takes
       the widest render - but still a render, not the 3072px upload. */
    src: variantUrl(image.media.url, 1920),
    alt: localized(image.media.altText, locale) || captionOf(image) || p.alt.ldsAction,
    caption: captionOf(image),
  }));

  return (
    <>
      <Seo
        title={p.gallery.seoTitle}
        description={p.gallery.seoDescription}
        image={images[0]?.media.url}
      />

      <div className="min-h-screen bg-white section-y">
        <div className="container-page">
          <SectionHeading
            eyebrow={p.shared.galleryEyebrow}
            title={p.shared.galleryTitle}
            description={p.gallery.description}
            as="h1"
          />

          {isLoading ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="aspect-[4/3]" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : visibleAlbums.length === 0 ? (
            <EmptyState
              icon={Images}
              title={p.gallery.emptyTitle}
              description={p.gallery.emptyDescription}
            />
          ) : (
            <>
              {visibleAlbums.length > 1 && (
                <div className="mb-6 flex flex-wrap justify-center gap-2 sm:mb-10">
                  <button
                    type="button"
                    onClick={() => setActiveAlbum('all')}
                    className={cn(
                      'rounded-full px-4 py-3 text-sm font-semibold transition-colors sm:py-2',
                      activeAlbum === 'all'
                        ? 'bg-navy text-white'
                        : 'bg-warm-muted text-navy/65 hover:text-navy',
                    )}
                  >
                    {p.gallery.allPhotos}
                  </button>
                  {visibleAlbums.map((album) => (
                    <button
                      key={album.id}
                      type="button"
                      onClick={() => setActiveAlbum(album.id)}
                      className={cn(
                        'rounded-full px-4 py-3 text-sm font-semibold transition-colors sm:py-2',
                        activeAlbum === album.id
                          ? 'bg-navy text-white'
                          : 'bg-warm-muted text-navy/65 hover:text-navy',
                      )}
                    >
                      {localizedOrSource(album.title, locale).text}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
                {images.map((image, index) => {
                  const caption = captionOf(image);

                  return (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setLightboxIndex(index)}
                      aria-label={p.gallery.enlarge(caption || p.alt.photo)}
                      className={cn(
                        'group relative aspect-[4/3] overflow-hidden rounded-2xl shadow-e1 transition-shadow hover:shadow-e3',
                        index === 0 && 'col-span-2 aspect-[16/10] sm:col-span-1 sm:aspect-[4/3]',
                      )}
                    >
                      <img
                        {...responsiveImage(
                          image.media.url,
                          '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw',
                          640,
                        )}
                        alt={localized(image.media.altText, locale) || caption || p.alt.ldsAction}
                        loading="lazy"
                        decoding="async"
                        width={800}
                        height={600}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {caption && (
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/85 to-transparent px-2.5 pb-2 pt-6 text-start text-caption font-semibold text-white sm:px-3.5 sm:pb-3 sm:pt-8">
                          {caption}
                        </span>
                      )}
                    </button>
                  );
                })}
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
