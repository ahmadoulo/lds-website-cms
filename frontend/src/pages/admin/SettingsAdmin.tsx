import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { CloudUpload, Eye, RotateCcw, Save } from 'lucide-react';
import api from '../../lib/api/axios';
import { useAdminMutation } from '../../lib/queries/adminHooks';
import { PageHeader } from '../../components/admin/ui/PageHeader';
import { MediaPicker } from '../../components/admin/ui/MediaPicker';
import { openPreview } from '../../components/admin/ui/PreviewButton';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, Input, Textarea } from '../../components/ui/Field';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { cn } from '../../lib/cn';
import { commitImage, type ImageSelection } from '../../lib/pendingImage';
import type { Media, SiteSettings } from '../../lib/types';

type TabKey = 'branding' | 'organization' | 'global_contact' | 'global_social' | 'homepage' | 'seo';

/** Which public page shows each section, so "Preview" opens the right one. */
const TABS: Array<{ key: TabKey; label: string; preview: string }> = [
  { key: 'branding', label: 'Identité visuelle', preview: '/' },
  { key: 'organization', label: 'Association', preview: '/a-propos' },
  { key: 'global_contact', label: 'Coordonnées', preview: '/contact' },
  { key: 'global_social', label: 'Réseaux sociaux', preview: '/' },
  { key: 'homepage', label: "Page d'accueil", preview: '/' },
  { key: 'seo', label: 'Référencement', preview: '/' },
];

interface DraftStatus {
  hasUnpublishedChanges: boolean;
  keys: string[];
  sections: Record<string, { hasDraft: boolean; draftUpdatedAt: string | null }>;
}

export const SettingsAdmin = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // The sidebar links straight to a section, e.g. /admin/parametres?section=organization.
  const requested = searchParams.get('section') as TabKey | null;
  const tab: TabKey = TABS.some((item) => item.key === requested) ? requested! : 'homepage';

  const setTab = (next: TabKey) => setSearchParams({ section: next }, { replace: true });

  // The administration edits the draft; the public site keeps serving what was
  // published until someone presses Publish.
  const settingsQuery = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => (await api.get<SiteSettings>('/settings/draft')).data,
  });

  const statusQuery = useQuery({
    queryKey: ['admin', 'settings', 'status'],
    queryFn: async () => (await api.get<DraftStatus>('/settings/draft/status')).data,
  });

  const publishAll = useAdminMutation<void>({
    mutationFn: async () => (await api.post('/settings/publish')).data,
    successMessage: 'Toutes les modifications sont maintenant en ligne.',
    invalidate: [['admin', 'settings']],
  });

  if (settingsQuery.isLoading) return <LoadingState label="Chargement des paramètres…" />;
  if (settingsQuery.isError || !settingsQuery.data) {
    return <ErrorState onRetry={() => void settingsQuery.refetch()} />;
  }

  const settings = settingsQuery.data;
  const status = statusQuery.data;
  const current = TABS.find((item) => item.key === tab)!;

  return (
    <div>
      <PageHeader
        title="Informations du site"
        description="Vos modifications sont enregistrées en brouillon. Elles n'apparaissent sur le site qu'une fois publiées."
        actions={
          <Button variant="outline" onClick={() => openPreview(current.preview)}>
            <Eye className="h-4 w-4" /> Prévisualiser
          </Button>
        }
      />

      {status?.hasUnpublishedChanges && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange/30 bg-orange/5 px-4 py-3">
          <p className="text-sm text-navy/80">
            <span className="font-semibold text-navy">
              {status.keys.length} section{status.keys.length > 1 ? 's' : ''} en attente
            </span>{' '}
            — ces modifications ne sont pas encore visibles par les visiteurs.
          </p>
          <Button
            variant="secondary"
            size="sm"
            isLoading={publishAll.isPending}
            onClick={() => publishAll.mutate()}
          >
            <CloudUpload className="h-4 w-4" /> Tout publier
          </Button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2 border-b border-navy/10 pb-px">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              'flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
              tab === item.key
                ? 'border-blue text-navy'
                : 'border-transparent text-navy/50 hover:text-navy',
            )}
          >
            {item.label}
            {status?.sections?.[item.key]?.hasDraft && (
              <span className="h-1.5 w-1.5 rounded-full bg-orange" aria-label="modifications non publiées" />
            )}
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

/**
 * Shared frame for every settings section. It carries the three-step workflow:
 * save as a draft, look at the result on the real site, then publish.
 */
const SettingsCard = ({
  settingKey,
  title,
  description,
  onSubmit,
  isSaving,
  children,
}: {
  settingKey: TabKey;
  title: string;
  description?: string;
  onSubmit: React.FormEventHandler;
  isSaving: boolean;
  children: React.ReactNode;
}) => {
  const [isDiscarding, setIsDiscarding] = useState(false);
  const tab = TABS.find((item) => item.key === settingKey)!;

  const { data: status } = useQuery({
    queryKey: ['admin', 'settings', 'status'],
    queryFn: async () => (await api.get<DraftStatus>('/settings/draft/status')).data,
  });

  const hasDraft = Boolean(status?.sections?.[settingKey]?.hasDraft);

  const publish = useAdminMutation<void>({
    mutationFn: async () => (await api.post(`/settings/${settingKey}/publish`)).data,
    successMessage: 'Section publiée. Elle est maintenant visible sur le site.',
    invalidate: [['admin', 'settings']],
  });

  const discard = useAdminMutation<void>({
    mutationFn: async () => (await api.delete(`/settings/${settingKey}/draft`)).data,
    successMessage: 'Modifications annulées. La version en ligne est restaurée.',
    invalidate: [['admin', 'settings']],
    onSuccess: () => setIsDiscarding(false),
  });

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-3xl rounded-xl border border-navy/8 bg-white p-5 sm:p-6"
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-navy">{title}</h2>
          {description && <p className="mt-1 text-sm text-navy/60">{description}</p>}
        </div>
        <Badge tone={hasDraft ? 'orange' : 'green'}>
          {hasDraft ? 'Brouillon non publié' : 'En ligne'}
        </Badge>
      </div>

      <div className="space-y-5">{children}</div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-navy/8 pt-5">
        <div className="flex flex-wrap gap-2">
          {hasDraft && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600 hover:bg-red-50"
              onClick={() => setIsDiscarding(true)}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Annuler les modifications
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={() => openPreview(tab.preview)}>
            <Eye className="h-4 w-4" /> Prévisualiser
          </Button>
          <Button type="submit" variant="outline" isLoading={isSaving}>
            <Save className="h-4 w-4" /> Enregistrer le brouillon
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!hasDraft}
            isLoading={publish.isPending}
            onClick={() => publish.mutate()}
            title={hasDraft ? undefined : 'Aucune modification à publier'}
          >
            <CloudUpload className="h-4 w-4" /> Publier
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isDiscarding}
        title="Annuler les modifications ?"
        message="Le brouillon sera supprimé et la version actuellement en ligne restaurée. Cette action est irréversible."
        confirmLabel="Annuler les modifications"
        isLoading={discard.isPending}
        onCancel={() => setIsDiscarding(false)}
        onConfirm={() => discard.mutate()}
      />
    </form>
  );
};

/** Saving writes a draft; the section reaches the site through Publish. */
function useSettingsMutation(key: TabKey) {
  return useAdminMutation<Record<string, unknown>>({
    mutationFn: async (value) => (await api.patch(`/settings/${key}`, { value })).data,
    successMessage: 'Brouillon enregistré. Prévisualisez, puis publiez pour mettre en ligne.',
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

  const [logo, setLogo] = useState<ImageSelection>(null);
  const [logoDark, setLogoDark] = useState<ImageSelection>(null);
  const [favicon, setFavicon] = useState<ImageSelection>(null);
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
      settingKey="branding"
      title="Identité visuelle"
      description="Le logo et l'icône du site. Sans logo téléversé, le nom court ci-dessous est affiché à la place."
      isSaving={mutation.isPending}
      onSubmit={handleSubmit(async (values) => {
        // Files picked in this form reach MinIO here, not when they were chosen.
        const [storedLogo, storedLogoDark, storedFavicon] = await Promise.all([
          commitImage(logo, 'branding'),
          commitImage(logoDark, 'branding'),
          commitImage(favicon, 'branding'),
        ]);

        setLogo(storedLogo);
        setLogoDark(storedLogoDark);
        setFavicon(storedFavicon);

        mutation.mutate({
          ...values,
          logoHeight: Number(values.logoHeight) || 40,
          logoId: storedLogo?.id ?? null,
          logoDarkId: storedLogoDark?.id ?? null,
          faviconId: storedFavicon?.id ?? null,
        });
      })}
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <MediaPicker
            value={logo}
            onChange={setLogo}
            label="Logo principal"
            slot="siteLogo"
          />
          <p className="mt-1 text-xs text-navy/50">
            Affiché sur fond clair : en-tête du site et page de connexion.
          </p>
        </div>

        <div>
          <MediaPicker
            value={logoDark}
            onChange={setLogoDark}
            label="Logo sur fond sombre"
            slot="siteLogo"
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
          label="Icône du site (favicon)"
            slot="favicon"
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
      settingKey="organization"
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
      settingKey="global_contact"
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
      settingKey="global_social"
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

  const [heroImage, setHeroImage] = useState<ImageSelection>(null);
  const [aboutImage, setAboutImage] = useState<ImageSelection>(null);
  const [ctaImage, setCtaImage] = useState<ImageSelection>(null);
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
      settingKey="homepage"
      title="Page d'accueil"
      description="Le bandeau principal, l'illustration de présentation et l'appel à l'action."
      isSaving={mutation.isPending}
      onSubmit={handleSubmit(async (values) => {
        const [storedHero, storedAbout, storedCta] = await Promise.all([
          commitImage(heroImage, 'homepage'),
          commitImage(aboutImage, 'homepage'),
          commitImage(ctaImage, 'homepage'),
        ]);

        setHeroImage(storedHero);
        setAboutImage(storedAbout);
        setCtaImage(storedCta);

        mutation.mutate({
          ...values,
          heroImageId: storedHero?.id ?? null,
          aboutImageId: storedAbout?.id ?? null,
          ctaImageId: storedCta?.id ?? null,
        });
      })}
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
          label="Photo du bandeau"
            slot="heroPortrait"
        />
        <MediaPicker
          value={aboutImage}
          onChange={setAboutImage}
          label="Photo de présentation"
            slot="aboutPhoto"
        />
      </div>

      <Field label="Citation de l'appel à l'action" htmlFor="home-cta-quote">
        <Textarea id="home-cta-quote" rows={2} {...register('ctaQuote')} />
      </Field>

      <MediaPicker
        value={ctaImage}
        onChange={setCtaImage}
        label="Image de fond de l'appel à l'action"
            slot="ctaBanner"
      />
    </SettingsCard>
  );
};

const SeoForm = ({ settings }: { settings: SiteSettings }) => {
  const mutation = useSettingsMutation('seo');
  const { register, handleSubmit, watch } = useForm({ defaultValues: settings.seo });

  const stored = useMediaById([settings.seo.ogImageId]);
  const [ogImage, setOgImage] = useState<ImageSelection>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (isHydrated || !Object.keys(stored).length) return;
    setOgImage(stored[settings.seo.ogImageId ?? ''] ?? null);
    setIsHydrated(true);
  }, [stored, isHydrated, settings.seo]);

  const description = watch('description') ?? '';

  return (
    <SettingsCard
      settingKey="seo"
      title="Référencement"
      description="Le titre et la description utilisés par Google et lors des partages sur les réseaux sociaux."
      isSaving={mutation.isPending}
      onSubmit={handleSubmit(async (values) => {
        const stored = await commitImage(ogImage, 'seo');
        setOgImage(stored);
        mutation.mutate({ ...values, ogImageId: stored?.id ?? null });
      })}
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
        label="Image de partage"
            slot="ogImage"
      />
    </SettingsCard>
  );
};
