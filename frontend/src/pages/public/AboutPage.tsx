import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ImageIcon, Mail, MapPin, Phone } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useGalleryImages, useImpactStats } from '../../lib/queries/publicHooks';
import { Seo } from '../../components/seo/Seo';
import { SectionHeading } from '../../components/public/SectionHeading';
import { ImpactCounter } from '../../components/public/ImpactCounter';
import { Skeleton } from '../../components/ui/States';
import { t } from '../../lib/types';

export const AboutPage = () => {
  const { settings, isLoading } = useSettings();
  const { data: gallery } = useGalleryImages();
  const { data: impact } = useImpactStats();

  const organization = settings?.organization;
  const contact = settings?.global_contact;
  // The administrator can set a dedicated photo; the gallery is the fallback.
  const photo = settings?.homepage.aboutImage ?? gallery?.[0]?.media ?? null;

  return (
    <>
      <Seo
        title="À propos"
        description={organization?.about?.slice(0, 160)}
        image={settings?.seo.ogImage?.url ?? photo?.url}
      />

      <section className="bg-white px-6 py-[90px]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-16">
          <div className="min-w-[300px] flex-[1_1_440px]">
            <SectionHeading
              eyebrow="Qui sommes-nous"
              title="L'association au service des Lougatois"
              align="left"
              as="h1"
              className="mb-8"
            />

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <>
                <p className="mb-6 text-[17px] leading-[1.75] text-navy/75">{organization?.about}</p>
                {organization?.quote && (
                  <blockquote className="border-l-4 border-green bg-warm-muted/60 p-6">
                    <p className="font-lora text-[19px] italic leading-relaxed text-navy">
                      {organization.quote}
                    </p>
                  </blockquote>
                )}
              </>
            )}
          </div>

          <div className="min-w-[300px] flex-[1_1_380px]">
            {photo ? (
              <img
                src={photo.url}
                alt={photo.altText?.fr || "Action de l'association sur le terrain"}
                className="aspect-[4/3] w-full rounded-2xl object-cover shadow-[0_24px_50px_-18px_rgba(23,38,66,0.3)]"
              />
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-warm-muted">
                <ImageIcon className="h-10 w-10 text-navy/15" aria-hidden />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-warm-muted px-6 py-[90px]">
        <div className="mx-auto max-w-[840px]">
          <SectionHeading eyebrow="Notre mission" title="Ce que nous faisons" accent="orange" />
          <p className="text-center text-[17px] leading-[1.8] text-navy/75">
            {organization?.mission}
          </p>
          <div className="mt-10 text-center">
            <Link
              to="/nos-actions"
              className="group inline-flex items-center gap-2 rounded-full bg-navy px-7 py-3.5 text-[14.5px] font-bold text-white transition-colors hover:bg-blue"
            >
              Découvrir nos domaines d'action
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* Key figures */}
      {impact && impact.length > 0 && (
        <section className="bg-navy px-6 py-[80px]">
          <div className="mx-auto max-w-[1080px]">
            <h2 className="mb-12 text-center text-[clamp(24px,3vw,32px)] font-extrabold text-white">
              Notre impact en chiffres
            </h2>
            <dl className="grid grid-cols-2 gap-10 md:grid-cols-4">
              {impact.map((stat) => (
                <div key={stat.id} className="text-center">
                  <dd
                    className="mb-2 text-[clamp(32px,4vw,48px)] font-extrabold tabular-nums"
                    style={{ color: stat.color }}
                  >
                    <ImpactCounter value={stat.value} />
                  </dd>
                  <dt className="text-sm text-white/70">{t(stat.label)}</dt>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      {/* Contact details */}
      <section className="bg-white px-6 py-[90px]">
        <div className="mx-auto max-w-[900px]">
          <SectionHeading eyebrow="Nous joindre" title="Nos coordonnées" />

          <div className="grid gap-6 sm:grid-cols-3">
            {contact?.address && (
              <div className="rounded-2xl border border-navy/8 p-6 text-center">
                <MapPin className="mx-auto mb-4 h-6 w-6 text-green" aria-hidden />
                <p className="text-sm leading-relaxed text-navy/70">{contact.address}</p>
              </div>
            )}
            {contact?.phone && (
              <div className="rounded-2xl border border-navy/8 p-6 text-center">
                <Phone className="mx-auto mb-4 h-6 w-6 text-blue" aria-hidden />
                <a
                  href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                  className="block text-sm font-semibold text-navy hover:text-blue"
                >
                  {contact.phone}
                </a>
                {contact.phoneSecondary && (
                  <a
                    href={`tel:${contact.phoneSecondary.replace(/\s+/g, '')}`}
                    className="mt-1 block text-sm text-navy/60 hover:text-blue"
                  >
                    {contact.phoneSecondary}
                  </a>
                )}
              </div>
            )}
            {contact?.email && (
              <div className="rounded-2xl border border-navy/8 p-6 text-center">
                <Mail className="mx-auto mb-4 h-6 w-6 text-orange" aria-hidden />
                <a
                  href={`mailto:${contact.email}`}
                  className="break-all text-sm font-semibold text-navy hover:text-blue"
                >
                  {contact.email}
                </a>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};
