import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, ImageIcon, Users } from 'lucide-react';
import { useHomepage } from '../../lib/queries/publicHooks';
import { Seo } from '../../components/seo/Seo';
import { CtaLink } from '../../components/public/CtaLink';
import { SectionHeading } from '../../components/public/SectionHeading';
import { MissionCard } from '../../components/public/MissionCard';
import { NewsCard } from '../../components/public/NewsCard';
import { ImpactCounter } from '../../components/public/ImpactCounter';
import { Lightbox } from '../../components/public/Lightbox';
import { DonationCard } from '../../components/public/DonationCard';
import { PaymentMethodCard } from '../../components/public/PaymentMethodCard';
import { ErrorState, SkeletonCards, Skeleton } from '../../components/ui/States';
import { resolveIcon } from '../../lib/icons';
import { BRAND, WARM_SURFACE, readableOn } from '../../lib/brand';
import { t } from '../../lib/types';
import type { GalleryImage } from '../../lib/types';

const Home = () => {
  const { data, isLoading, isError, refetch } = useHomepage();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24">
        <ErrorState
          title="Le site est momentanément indisponible"
          message="Impossible de charger le contenu. Merci de réessayer dans quelques instants."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const settings = data?.settings;
  const homepage = settings?.homepage;
  const organization = settings?.organization;
  const missions = data?.missions ?? [];
  const impact = data?.impact ?? [];
  const news = data?.news ?? [];
  const gallery = data?.gallery ?? [];
  const partners = data?.partners ?? [];
  const donations = data?.donations ?? [];

  // Each slot shows only the image chosen for it. Borrowing one from another
  // section used to fill the gap, which made a gallery photo appear in the
  // presentation block and left the administrator unable to tell where an image
  // came from. An empty slot now stays visibly empty.
  const heroImage = homepage?.heroImage ?? null;
  const aboutImage = homepage?.aboutImage ?? null;
  const ctaImage = homepage?.ctaImage ?? null;

  const slides = gallery.map((image: GalleryImage) => ({
    src: image.media.url,
    alt: image.media.altText?.fr || t(image.caption, 'Photo des actions de LDS'),
    caption: t(image.caption),
  }));

  return (
    <>
      <Seo
        description={settings?.seo.description}
        image={settings?.seo.ogImage?.url ?? heroImage?.url}
      />

      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden section-y">
        {/*
          One warm wash instead of two floating colour blobs. The brand's three
          accents belong to content, not to decoration.
        */}
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_78%_0%,rgba(0,164,222,0.10),transparent_62%)]"
          aria-hidden
        />

        <div className="relative z-10 container-page flex flex-wrap items-center gap-16">
          <div className="min-w-[min(100%,320px)] flex-[1_1_460px]">
            <span className="mb-6 inline-flex items-center rounded-full bg-green/15 px-4 py-2 text-eyebrow uppercase"
              style={{ color: readableOn(BRAND.green, WARM_SURFACE) }}>
              {organization?.name ?? 'Louga Développement Solidaire'}
            </span>

            {isLoading ? (
              <>
                <Skeleton className="mb-4 h-12 w-full" />
                <Skeleton className="mb-6 h-12 w-4/5" />
                <Skeleton className="h-20 w-full" />
              </>
            ) : (
              <>
                <h1 className="mb-[22px] text-h1 font-extrabold leading-[1.14] text-navy">
                  {homepage?.heroTitle}
                </h1>
                <p className="mb-9 max-w-[520px] text-lead leading-relaxed text-navy/70">
                  {homepage?.heroSubtitle}
                </p>
              </>
            )}

            <div className="flex flex-wrap gap-4">
              <CtaLink to="/nous-soutenir" size="lg">
                <Heart className="h-4 w-4" aria-hidden /> Faire un don
              </CtaLink>
              <CtaLink to="/nos-actions" variant="secondary" size="lg">
                Découvrir nos actions
              </CtaLink>
            </div>
          </div>

          <div className="relative min-w-[min(100%,280px)] max-w-[400px] flex-[1_1_320px]">
            {/* Offset frame: one accent colour, squared off behind the photo. */}
            <div
              className="absolute -bottom-4 -right-4 top-8 left-8 rounded-panel bg-green/20"
              aria-hidden
            />
            {heroImage ? (
              <img
                src={heroImage.url}
                alt={heroImage.altText?.fr || "Bénévoles de l'association en action"}
                width={900}
                height={1200}
                fetchPriority="high"
                decoding="async"
                className="relative aspect-[3/4] w-full rounded-panel object-cover shadow-e4"
              />
            ) : (
              <div className="relative flex aspect-[3/4] w-full items-center justify-center rounded-panel bg-warm-muted shadow-e4">
                <ImageIcon className="h-10 w-10 text-navy/15" aria-hidden />
              </div>
            )}

            {homepage?.heroBadgeTitle && (
              <div className="absolute -bottom-5 -left-5 flex items-center gap-3 rounded-2xl bg-white px-5 py-3.5 shadow-e3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green text-white">
                  <Users className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-body font-extrabold leading-tight text-navy">
                    {homepage.heroBadgeTitle}
                  </span>
                  <span className="block text-xs text-navy/60">
                    {homepage.heroBadgeSubtitle}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- Association */}
      <section className="bg-white section-y">
        <div className="container-page flex flex-wrap items-center gap-16">
          <div className="min-w-[min(100%,300px)] flex-[1_1_440px]">
            <SectionHeading
              eyebrow="Qui sommes-nous"
              title="L'association au service des Lougatois"
              align="left"
              className="mb-6"
            />
            {isLoading ? (
              <>
                <Skeleton className="mb-3 h-4 w-full" />
                <Skeleton className="mb-3 h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </>
            ) : (
              <>
                <p className="mb-5 text-body-lg leading-[1.75] text-navy/75">{organization?.about}</p>
                <p className="mb-9 text-body-lg leading-[1.75] text-navy/75">{organization?.mission}</p>
                {organization?.quote && (
                  <blockquote className="flex items-start gap-4 border-l-4 border-green bg-warm-muted/60 p-6">
                    <p className="font-lora text-lead italic leading-relaxed text-navy">
                      {organization.quote}
                    </p>
                  </blockquote>
                )}
              </>
            )}
            <Link
              to="/a-propos"
              className="group mt-8 inline-flex items-center gap-2 text-body font-bold text-blue"
            >
              En savoir plus sur l'association
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>

          <div className="min-w-[min(100%,300px)] flex-[1_1_380px]">
            {aboutImage ? (
              <img
                src={aboutImage.url}
                alt={aboutImage.altText?.fr || "Action de l'association sur le terrain"}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-2xl object-cover shadow-e4"
              />
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-warm-muted">
                <ImageIcon className="h-10 w-10 text-navy/15" aria-hidden />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Missions */}
      <section className="bg-warm-muted section-y">
        <div className="container-page">
          <SectionHeading
            eyebrow="Nos domaines d'action"
            title="Nos piliers d'intervention à Louga"
            description="Nous améliorons les conditions de vie à Louga à travers des domaines d'intervention complémentaires."
            accent="green"
          />

          {isLoading ? (
            <SkeletonCards count={3} />
          ) : missions.length === 0 ? (
            <p className="text-center text-navy/50">
              Les domaines d'action seront publiés prochainement.
            </p>
          ) : (
            <div className="flex flex-wrap justify-center gap-8">
              {missions.map((mission, index) => (
                <div
                  key={mission.id}
                  className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.334rem)]"
                >
                  <MissionCard mission={mission} index={index} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* -------------------------------------------------------------- Impact */}
      {impact.length > 0 && (
        <section className="relative overflow-hidden bg-navy section-y">
          <div
            className="absolute right-0 top-0 h-[600px] w-[600px] bg-[radial-gradient(circle,rgba(135,206,24,0.08),transparent_70%)]"
            aria-hidden
          />
          <div className="relative z-10 container-page">
            <div className="mb-14 text-center">
              <p className="mb-3.5 text-eyebrow uppercase text-green">
                Notre impact
              </p>
              <h2 className="text-h2 font-extrabold text-white">
                Des résultats concrets sur le terrain
              </h2>
            </div>

            <dl className="grid grid-cols-2 gap-10 md:grid-cols-4">
              {impact.map((stat) => {
                const Icon = stat.icon ? resolveIcon(stat.icon) : null;
                // The band is navy: a statistic stored as navy would vanish.
                const color = readableOn(stat.color, BRAND.navy);

                return (
                  <div key={stat.id} className="flex flex-col items-center text-center">
                    {Icon && (
                      <span
                        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${color}1f`, color }}
                        aria-hidden
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                    )}
                    <dd
                      className="mb-3 text-stat tabular-nums"
                      style={{ color }}
                    >
                      <ImpactCounter value={stat.value} />
                    </dd>
                    <dt className="text-sm font-medium uppercase tracking-wide text-white/75">
                      {t(stat.label)}
                    </dt>
                  </div>
                );
              })}
            </dl>

            <div className="mt-12 text-center">
              <Link
                to="/impact"
                className="group inline-flex items-center gap-2 text-body font-bold text-green"
              >
                Voir tout notre impact
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------- Actualités */}
      {news.length > 0 && (
        <section className="bg-white section-y">
          <div className="container-page">
            <SectionHeading
              eyebrow="Actualités"
              title="Nos dernières actions"
              description="Retour sur nos événements et bilans les plus récents."
              accent="green"
            />

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {news.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link
                to="/actualites"
                className="rounded-full border-[1.5px] border-navy/15 px-7 py-3 text-body font-bold text-navy transition-colors hover:border-navy"
              >
                Toutes les actualités
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------- Galerie */}
      {gallery.length > 0 && (
        <section className="bg-warm-muted section-y">
          <div className="container-page">
            <SectionHeading
              eyebrow="Galerie"
              title="Nos actions en images"
              description="Des moments forts de nos interventions sur le terrain, à Louga."
            />

            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              {gallery.slice(0, 6).map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  aria-label={`Agrandir : ${t(image.caption, 'photo')}`}
                  className="group relative aspect-[4/3] overflow-hidden rounded-2xl shadow-e1 transition-shadow hover:shadow-e3"
                >
                  <img
                    src={image.media.url}
                    alt={image.media.altText?.fr || t(image.caption, 'Action de LDS')}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {image.caption && (
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/85 to-transparent px-3.5 pb-3 pt-8 text-left text-caption font-semibold text-white">
                      {t(image.caption)}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link
                to="/galerie"
                className="rounded-full border-[1.5px] border-navy/15 bg-white px-7 py-3 text-body font-bold text-navy transition-colors hover:border-navy"
              >
                Voir toute la galerie
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------ Appel à l'action */}
      <section className="relative overflow-hidden section-y text-center">
        {ctaImage ? (
          <img
            src={ctaImage.url}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover brightness-[0.45]"
          />
        ) : (
          <div className="absolute inset-0 bg-navy" aria-hidden />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-navy/70 to-navy/95" aria-hidden />

        <div className="relative z-10 mx-auto max-w-[1040px] gutter-x">
          <p className="mb-9 font-lora text-h2 font-medium italic leading-[1.35] text-white">
            « {homepage?.ctaQuote ?? 'Ensemble, pour le développement de Louga.'} »
          </p>
          <CtaLink to="/nous-soutenir" size="lg">
            Rejoindre le mouvement
          </CtaLink>
        </div>
      </section>

      {/* --------------------------------------------------------- Nous soutenir */}
      {donations.length > 0 && (
        <section className="bg-white section-y">
          <div className="mx-auto max-w-[1120px] gutter-x">
            <SectionHeading
              eyebrow="Nous soutenir"
              title="Comment nous soutenir ?"
              description="Chaque contribution, financière, matérielle ou humaine, étend notre impact."
              accent="orange"
            />

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {donations.slice(0, 3).map((method) =>
                method.provider ? (
                  <PaymentMethodCard key={method.id} method={method} />
                ) : (
                  <DonationCard key={method.id} method={method} />
                ),
              )}
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- Partenaires */}
      {partners.length > 0 && (
        <section className="border-y border-navy/5 bg-warm-muted section-y-sm">
          <div className="container-page text-center">
            <p className="mb-3.5 text-eyebrow uppercase text-green">
              Partenaires
            </p>
            <h2 className="mb-10 text-h2 font-extrabold text-navy">
              Ils nous accompagnent
            </h2>

            <ul className="flex flex-wrap justify-center gap-4">
              {partners.map((partner) => {
                const Icon = resolveIcon(partner.icon);
                const content = (
                  <>
                    {partner.logo ? (
                      <img
                        src={partner.logo.url}
                        alt=""
                        loading="lazy"
                        className="h-8 w-auto max-w-[120px] object-contain"
                      />
                    ) : (
                      <Icon className="h-5 w-5 text-navy/50" aria-hidden />
                    )}
                    <span className="text-body font-bold text-navy">{partner.name}</span>
                  </>
                );

                return (
                  <li key={partner.id}>
                    {partner.url ? (
                      <a
                        href={partner.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex items-center gap-3 rounded-full bg-white px-6 py-3.5 shadow-sm transition-shadow hover:shadow-md"
                      >
                        {content}
                      </a>
                    ) : (
                      <span className="flex items-center gap-3 rounded-full bg-white px-6 py-3.5 shadow-sm">
                        {content}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

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

export default Home;
