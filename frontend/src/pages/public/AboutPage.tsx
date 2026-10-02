import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ImageIcon, Mail, MapPin, Phone } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useImpactStats } from '../../lib/queries/publicHooks';
import { Seo } from '../../components/seo/Seo';
import { ImpactFigures } from '../../components/public/ImpactFigures';
import { SectionHeading } from '../../components/public/SectionHeading';
import { Skeleton } from '../../components/ui/States';
import { cn } from '../../lib/cn';
import { useLocale } from '../../context/LocaleContext';
import { localized, localizedOrSource } from '../../lib/i18n/resolve';
import { usePagesT } from '../../lib/i18n/dictionaries/pages';

export const AboutPage = () => {
  const { settings, isLoading } = useSettings();
  const { data: impact } = useImpactStats();
  const { locale, isRtl } = useLocale();
  const p = usePagesT();

  const organization = settings?.organization;
  const contact = settings?.global_contact;
  // Only the photo configured for this page. Falling back to the gallery made an
  // unrelated image appear here, with no way for the administrator to trace it.
  const photo = settings?.homepage.aboutImage ?? null;

  /*
    Nothing is filtered by language: a record with no Arabic is shown in the
    original and marked as such, rather than hidden. Hiding emptied whole
    sections of the Arabic site while the headings above them stayed, which
    read as broken rather than as untranslated.
  */
  const visibleImpact = impact ?? [];

  return (
    <>
      <Seo
        title={p.about.seoTitle}
        description={localizedOrSource(organization?.about, locale).text.slice(0, 160)}
        image={settings?.seo.ogImage?.url ?? photo?.url}
      />

      <section className="bg-white section-y">
        <div className="container-page flex flex-wrap items-center gap-10 lg:gap-16">
          <div className="min-w-[min(100%,300px)] flex-[1_1_440px]">
            {/* `align="left"` means "aligned to the reading edge": the shared
                heading resolves that to `text-start`, so it follows the script. */}
            <SectionHeading
              eyebrow={p.shared.whoWeAreEyebrow}
              title={p.shared.whoWeAreTitle}
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
                <p className="mb-6 text-body-lg leading-[1.75] text-navy/75">{localizedOrSource(organization?.about, locale).text}</p>
                {organization?.quote && (
                  // The rule hangs where the text begins, in either script.
                  <blockquote className="border-s-4 border-green bg-warm-muted/60 p-6">
                    <p className="font-lora text-lead italic leading-relaxed text-navy">
                      {localizedOrSource(organization.quote, locale).text}
                    </p>
                  </blockquote>
                )}
              </>
            )}
          </div>

          <div className="min-w-[min(100%,300px)] flex-[1_1_380px]">
            {photo ? (
              <img
                src={photo.url}
                alt={localized(photo.altText, locale) || p.alt.fieldAction}
                loading="lazy"
                decoding="async"
                width={1200}
                height={900}
                className="aspect-[4/3] w-full rounded-2xl object-cover shadow-e4"
              />
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-warm-muted">
                {/* A picture frame has no reading direction. */}
                <ImageIcon className="h-10 w-10 text-navy/15" aria-hidden />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-warm-muted section-y">
        <div className="mx-auto max-w-[840px] gutter-x">
          <SectionHeading
            eyebrow={p.about.missionEyebrow}
            title={p.about.missionTitle}
            accent="blue"
          />
          <p className="text-center text-body-lg leading-[1.8] text-navy/75">
            {localizedOrSource(organization?.mission, locale).text}
          </p>
          <div className="mt-8 text-center sm:mt-10">
            <Link
              to="/nos-actions"
              className="group inline-flex items-center gap-2 rounded-full bg-navy px-7 py-3.5 text-body font-bold text-white transition-colors hover:bg-blue"
            >
              {p.cta.discoverDomains}
              {/*
                "Onwards" is the direction of reading: the arrow turns with the
                script, and so does the nudge it makes on hover.
              */}
              <ArrowRight
                className={cn(
                  'h-4 w-4 transition-transform',
                  isRtl ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1',
                )}
                aria-hidden
              />
            </Link>
          </div>
        </div>
      </section>

      {/* Key figures */}
      {visibleImpact.length > 0 && (
        <section className="bg-navy section-y-sm">
          <div className="mx-auto max-w-[1080px] gutter-x">
            <h2 className="mb-8 text-center text-h2 font-extrabold text-white sm:mb-12">
              {p.shared.impactFiguresTitle}
            </h2>
            <ImpactFigures stats={visibleImpact} />
          </div>
        </section>
      )}

      {/* Contact details */}
      <section className="bg-white section-y">
        <div className="mx-auto max-w-[900px] gutter-x">
          <SectionHeading eyebrow={p.about.contactEyebrow} title={p.about.contactTitle} />

          <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
            {contact?.address && (
              <div className="rounded-2xl border border-navy/8 p-6 text-center">
                <MapPin className="mx-auto mb-4 h-6 w-6 text-green" aria-hidden />
                <p className="text-sm leading-relaxed text-navy/70">{localizedOrSource(contact.address, locale).text}</p>
              </div>
            )}
            {contact?.phone && (
              <div className="rounded-2xl border border-navy/8 p-6 text-center">
                <Phone className="mx-auto mb-4 h-6 w-6 text-blue" aria-hidden />
                {/* A phone number reads left to right in both languages. */}
                <a
                  href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                  dir="ltr"
                  className="block text-sm font-semibold text-navy hover:text-blue"
                >
                  {contact.phone}
                </a>
                {contact.phoneSecondary && (
                  <a
                    href={`tel:${contact.phoneSecondary.replace(/\s+/g, '')}`}
                    dir="ltr"
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
                  dir="ltr"
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
