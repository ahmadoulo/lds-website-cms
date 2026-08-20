import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Save } from 'lucide-react';
import api from '../../lib/api/axios';
import { useAdminMutation } from '../../lib/queries/adminHooks';
import { PageHeader } from '../../components/admin/ui/PageHeader';
import { MediaPicker } from '../../components/admin/ui/MediaPicker';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea } from '../../components/ui/Field';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { cn } from '../../lib/cn';
import type { Media, SiteSettings } from '../../lib/types';

type TabKey = 'branding' | 'organization' | 'global_contact' | 'global_social' | 'homepage' | 'seo';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'branding', label: 'Identité visuelle' },
  { key: 'organization', label: 'Association' },
  { key: 'global_contact', label: 'Coordonnées' },
  { key: 'global_social', label: 'Réseaux sociaux' },
  { key: 'homepage', label: "Page d'accueil" },
  { key: 'seo', label: 'Référencement' },
];

export const SettingsAdmin = () => {
  const [tab, setTab] = useState<TabKey>('organization');

  const settingsQuery = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => (await api.get<SiteSettings>('/settings')).data,
  });

  if (settingsQuery.isLoading) return <LoadingState label="Chargement des paramètres…" />;
  if (settingsQuery.isError || !settingsQuery.data) {
    return <ErrorState onRetry={() => void settingsQuery.refetch()} />;
  }

  const settings = settingsQuery.data;

  return (
    <div>
      <PageHeader
        title="Informations du site"
        description="Les textes et coordonnées affichés sur le site public, modifiables sans toucher au code."
      />

      <div className="mb-6 flex flex-wrap gap-2 border-b border-navy/10 pb-px">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              'rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
              tab === item.key
                ? 'border-blue text-navy'
                : 'border-transparent text-navy/50 hover:text-navy',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'branding' && <BrandingForm settings={settings} />}
      {tab === 'organization' && <OrganizationForm settings={settings} />}
      {tab === 'global_contact' && <ContactForm settings={settings} />}
      {tab === 'global_social' && <SocialForm settings={settings} />}
      {tab === 'homepage' && <HomepageForm settings={settings} />}
      {tab === 'seo' && <SeoForm settings={settings} />}
    </div>
  );
};

/** Shared card + submit button used by every settings section. */
const SettingsCard = ({
  title,
  description,
  onSubmit,
  isSaving,
  children,
}: {
  title: string;
  description?: string;
  onSubmit: React.FormEventHandler;
  isSaving: boolean;
  children: React.ReactNode;
}) => (
  <form onSubmit={onSubmit} className="max-w-3xl rounded-xl border border-navy/8 bg-white p-5 sm:p-6">
    <div className="mb-6">
      <h2 className="text-base font-bold text-navy">{title}</h2>
      {description && <p className="mt-1 text-sm text-navy/60">{description}</p>}
    </div>

    <div className="space-y-5">{children}</div>

    <div className="mt-7 flex justify-end border-t border-navy/8 pt-5">
      <Button type="submit" isLoading={isSaving}>
        <Save className="h-4 w-4" /> Enregistrer
      </Button>
    </div>
  </form>
);

function useSettingsMutation(key: TabKey) {
  return useAdminMutation<Record<string, unknown>>({
    mutationFn: async (value) => (await api.patch(`/settings/${key}`, { value })).data,
    successMessage: 'Paramètres enregistrés.',
    invalidate: [['admin', 'settings']],
  });
}

const BrandingForm = ({ settings }: { settings: SiteSettings }) => {
  const mutation = useSettingsMutation('branding');
  const { register, handleSubmit } = useForm({ defaultValues: settings.branding });

  const stored = useMediaById([
    settings.branding.logoId,
    settings.branding.logoDarkId,
    settings.branding.faviconId,
  ]);

  const [logo, setLogo] = useState<Media | null>(null);
  const [logoDark, setLogoDark] = useState<Media | null>(null);
  const [favicon, setFavicon] = useState<Media | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (isHydrated || !Object.keys(stored).length) return;
    setLogo(stored[settings.branding.logoId ?? ''] ?? null);
    setLogoDark(stored[settings.branding.logoDarkId ?? ''] ?? null);
    setFavicon(stored[settings.branding.faviconId ?? ''] ?? null);
    setIsHydrated(true);
  }, [stored, isHydrated, settings.branding]);

  return (
    <SettingsCard
      title="Identité visuelle"
      description="Le logo et l'icône du site. Sans logo téléversé, le nom court ci-dessous est affiché à la place."
      isSaving={mutation.isPending}
      onSubmit={handleSubmit((values) =>
        mutation.mutate({
          ...values,
          logoHeight: Number(values.logoHeight) || 40,
          logoId: logo?.id ?? null,
          logoDarkId: logoDark?.id ?? null,
          faviconId: favicon?.id ?? null,
        }),
      )}
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <MediaPicker
            value={logo}
            onChange={setLogo}
            folder="branding"
            label="Logo principal"
            aspect="aspect-[3/1]"
          />
          <p className="mt-1 text-xs text-navy/50">
            Affiché sur fond clair : en-tête du site et page de connexion.
          </p>
        </div>

        <div>
          <MediaPicker
            value={logoDark}
            onChange={setLogoDark}
            folder="branding"
            label="Logo sur fond sombre"
            aspect="aspect-[3/1]"
          />
          <p className="mt-1 text-xs text-navy/50">
            Facultatif. Utilisé dans le pied de page et l'administration, où le fond est
            bleu nuit. Sans lui, le logo principal est repris.
          </p>
        </div>
      </div>

      <Field
        label="Hauteur d'affichage du logo"
        htmlFor="branding-height"
        hint="En pixels. 40 convient à la plupart des logos ; augmentez pour un logo très large."
      >
        <Input
          id="branding-height"
          type="number"
          min={16}
          max={120}
          {...register('logoHeight')}
        />
      </Field>

      <div>
        <MediaPicker
          value={favicon}
          onChange={setFavicon}
          folder="branding"
          label="Icône du site (favicon)"
          aspect="aspect-square"
        />
        <p className="mt-1 text-xs text-navy/50">
          Icône de l'onglet du navigateur. Utilisez une image carrée, idéalement 512×512,
          au format PNG ou WebP.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Nom court"
          htmlFor="branding-wordmark"
          hint="Affiché si aucun logo n'est téléversé."
        >
          <Input id="branding-wordmark" placeholder="LDS" {...register('wordmark')} />
        </Field>
        <Field label="Complément en couleur" htmlFor="branding-accent">
          <Input id="branding-accent" placeholder="Louga" {...register('wordmarkAccent')} />
        </Field>
      </div>
    </SettingsCard>
  );
};

const OrganizationForm = ({ settings }: { settings: SiteSettings }) => {
  const mutation = useSettingsMutation('organization');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: settings.organization });

  return (
    <SettingsCard
      title="L'association"
      description="Ces textes alimentent la page « À propos » et la section de présentation de l'accueil."
      isSaving={mutation.isPending}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nom complet" htmlFor="org-name" required error={errors.name?.message}>
          <Input id="org-name" {...register('name', { required: 'Le nom est obligatoire' })} />
        </Field>
        <Field label="Sigle" htmlFor="org-short">
          <Input id="org-short" placeholder="LDS" {...register('shortName')} />
        </Field>
      </div>

      <Field label="Accroche" htmlFor="org-tagline" hint="Une phrase courte qui résume votre engagement.">
        <Input id="org-tagline" {...register('tagline')} />
      </Field>

      <Field label="Présentation" htmlFor="org-about" hint="Affichée sur la page « À propos ».">
        <Textarea id="org-about" rows={5} {...register('about')} />
      </Field>

      <Field label="Notre mission" htmlFor="org-mission">
        <Textarea id="org-mission" rows={4} {...register('mission')} />
      </Field>

      <Field label="Citation" htmlFor="org-quote" hint="Mise en avant en italique sur le site.">
        <Textarea id="org-quote" rows={2} {...register('quote')} />
      </Field>

      <Field label="Année de création" htmlFor="org-year">
        <Input id="org-year" placeholder="2019" {...register('foundedYear')} />
      </Field>
    </SettingsCard>
  );
};

const ContactForm = ({ settings }: { settings: SiteSettings }) => {
  const mutation = useSettingsMutation('global_contact');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: settings.global_contact });

  return (
    <SettingsCard
      title="Coordonnées"
      description="Affichées dans la barre supérieure, le pied de page et la page Contact."
      isSaving={mutation.isPending}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
    >
      <Field label="Adresse email" htmlFor="contact-email" required error={errors.email?.message}>
        <Input
          id="contact-email"
          type="email"
          aria-invalid={Boolean(errors.email)}
          {...register('email', {
            required: "L'adresse email est obligatoire",
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Adresse email invalide' },
          })}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Téléphone principal" htmlFor="contact-phone" required error={errors.phone?.message}>
          <Input
            id="contact-phone"
            aria-invalid={Boolean(errors.phone)}
            {...register('phone', { required: 'Le téléphone est obligatoire' })}
          />
        </Field>
        <Field label="Téléphone secondaire" htmlFor="contact-phone2">
          <Input id="contact-phone2" {...register('phoneSecondary')} />
        </Field>
      </div>

      <Field label="Adresse postale" htmlFor="contact-address">
        <Textarea id="contact-address" rows={2} {...register('address')} />
      </Field>
    </SettingsCard>
  );
};

const SocialForm = ({ settings }: { settings: SiteSettings }) => {
  const mutation = useSettingsMutation('global_social');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: settings.global_social });

  const urlRule = {
    pattern: { value: /^(https?:\/\/\S+)?$/, message: 'Doit commencer par https:// ou rester vide' },
  };

  return (
    <SettingsCard
      title="Réseaux sociaux"
      description="Laissez un champ vide pour masquer l'icône correspondante sur le site."
      isSaving={mutation.isPending}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
    >
      <Field label="Facebook" htmlFor="social-fb" error={errors.facebook?.message}>
        <Input id="social-fb" placeholder="https://facebook.com/…" {...register('facebook', urlRule)} />
      </Field>
      <Field label="Instagram" htmlFor="social-ig" error={errors.instagram?.message}>
        <Input id="social-ig" placeholder="https://instagram.com/…" {...register('instagram', urlRule)} />
      </Field>
      <Field label="LinkedIn" htmlFor="social-li" error={errors.linkedin?.message}>
        <Input id="social-li" placeholder="https://linkedin.com/…" {...register('linkedin', urlRule)} />
      </Field>
      <Field label="YouTube" htmlFor="social-yt" error={errors.youtube?.message}>
        <Input id="social-yt" placeholder="https://youtube.com/…" {...register('youtube', urlRule)} />
      </Field>
    </SettingsCard>
  );
};

/** Loads the Media objects behind the stored ids so the pickers show a preview. */
function useMediaById(ids: Array<string | null>) {
  const [media, setMedia] = useState<Record<string, Media | null>>({});

  useEffect(() => {
    const wanted = ids.filter((id): id is string => Boolean(id));
    if (!wanted.length) return;

    let cancelled = false;
    Promise.all(
      wanted.map((id) =>
        api
          .get<Media>(`/media/${id}`)
          .then(({ data }) => [id, data] as const)
          .catch(() => [id, null] as const),
      ),
    ).then((entries) => {
      if (!cancelled) setMedia(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join('|')]);

  return media;
}

const HomepageForm = ({ settings }: { settings: SiteSettings }) => {
  const mutation = useSettingsMutation('homepage');
  const { register, handleSubmit } = useForm({ defaultValues: settings.homepage });

  const stored = useMediaById([
    settings.homepage.heroImageId,
    settings.homepage.aboutImageId,
    settings.homepage.ctaImageId,
  ]);

  const [heroImage, setHeroImage] = useState<Media | null>(null);
  const [aboutImage, setAboutImage] = useState<Media | null>(null);
  const [ctaImage, setCtaImage] = useState<Media | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Seed the pickers once the stored media have been fetched, without clobbering
  // a selection the user has already made.
  useEffect(() => {
    if (isHydrated || !Object.keys(stored).length) return;
    setHeroImage(stored[settings.homepage.heroImageId ?? ''] ?? null);
    setAboutImage(stored[settings.homepage.aboutImageId ?? ''] ?? null);
    setCtaImage(stored[settings.homepage.ctaImageId ?? ''] ?? null);
    setIsHydrated(true);
  }, [stored, isHydrated, settings.homepage]);

  return (
    <SettingsCard
      title="Page d'accueil"
      description="Le bandeau principal, l'illustration de présentation et l'appel à l'action."
      isSaving={mutation.isPending}
      onSubmit={handleSubmit((values) =>
        mutation.mutate({
          ...values,
          heroImageId: heroImage?.id ?? null,
          aboutImageId: aboutImage?.id ?? null,
          ctaImageId: ctaImage?.id ?? null,
        }),
      )}
    >
      <Field label="Titre du bandeau" htmlFor="home-hero-title">
        <Textarea id="home-hero-title" rows={2} {...register('heroTitle')} />
      </Field>

      <Field label="Sous-titre du bandeau" htmlFor="home-hero-sub">
        <Textarea id="home-hero-sub" rows={3} {...register('heroSubtitle')} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Étiquette (titre)" htmlFor="home-badge-title" hint="Petit encart sur la photo du bandeau.">
          <Input id="home-badge-title" {...register('heroBadgeTitle')} />
        </Field>
        <Field label="Étiquette (sous-titre)" htmlFor="home-badge-sub">
          <Input id="home-badge-sub" {...register('heroBadgeSubtitle')} />
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <MediaPicker
          value={heroImage}
          onChange={setHeroImage}
          folder="homepage"
          label="Photo du bandeau"
          aspect="aspect-[3/4]"
        />
        <MediaPicker
          value={aboutImage}
          onChange={setAboutImage}
          folder="homepage"
          label="Photo de présentation"
        />
      </div>

      <Field label="Citation de l'appel à l'action" htmlFor="home-cta-quote">
        <Textarea id="home-cta-quote" rows={2} {...register('ctaQuote')} />
      </Field>

      <MediaPicker
        value={ctaImage}
        onChange={setCtaImage}
        folder="homepage"
        label="Image de fond de l'appel à l'action"
        aspect="aspect-[21/9]"
      />
    </SettingsCard>
  );
};

const SeoForm = ({ settings }: { settings: SiteSettings }) => {
  const mutation = useSettingsMutation('seo');
  const { register, handleSubmit, watch } = useForm({ defaultValues: settings.seo });

  const stored = useMediaById([settings.seo.ogImageId]);
  const [ogImage, setOgImage] = useState<Media | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (isHydrated || !Object.keys(stored).length) return;
    setOgImage(stored[settings.seo.ogImageId ?? ''] ?? null);
    setIsHydrated(true);
  }, [stored, isHydrated, settings.seo]);

  const description = watch('description') ?? '';

  return (
    <SettingsCard
      title="Référencement"
      description="Le titre et la description utilisés par Google et lors des partages sur les réseaux sociaux."
      isSaving={mutation.isPending}
      onSubmit={handleSubmit((values) => mutation.mutate({ ...values, ogImageId: ogImage?.id ?? null }))}
    >
      <Field label="Titre du site" htmlFor="seo-title" hint="Environ 60 caractères pour un affichage complet.">
        <Input id="seo-title" {...register('title')} />
      </Field>

      <Field
        label="Description"
        htmlFor="seo-description"
        hint={`${description.length} caractères — visez 150 à 160 pour un affichage optimal.`}
      >
        <Textarea id="seo-description" rows={3} {...register('description')} />
      </Field>

      <Field label="Mots-clés" htmlFor="seo-keywords" hint="Séparés par des virgules.">
        <Input id="seo-keywords" {...register('keywords')} />
      </Field>

      <MediaPicker
        value={ogImage}
        onChange={setOgImage}
        folder="seo"
        label="Image de partage"
        aspect="aspect-[1.91/1]"
      />
    </SettingsCard>
  );
};
