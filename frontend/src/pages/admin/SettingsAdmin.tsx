import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { CloudUpload, Eye, RotateCcw, Save } from 'lucide-react';
import api from '../../lib/api/axios';
import { useT } from '../../lib/i18n/useT';
import { useAdminMutation } from '../../lib/queries/adminHooks';
import { PageHeader } from '../../components/admin/ui/PageHeader';
import { LocalizedFormField } from '../../components/i18n/LocalizedFormField';
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

type GroupKey = 'accueil' | 'a-propos' | 'site';

/**
 * The sidebar has three entries pointing here. Without a grouping they all
 * opened the same six tabs, so "Accueil" and "Paramètres du site" looked like
 * the same screen. Each group is now its own page, and every tab belongs to
 * exactly one of them, so nothing becomes unreachable.
 */
const TABS: Array<{ key: TabKey; preview: string; group: GroupKey }> = [
  { key: 'homepage', preview: '/', group: 'accueil' },
  { key: 'organization', preview: '/a-propos', group: 'a-propos' },
  { key: 'branding', preview: '/', group: 'site' },
  { key: 'global_contact', preview: '/contact', group: 'site' },
  { key: 'global_social', preview: '/', group: 'site' },
  { key: 'seo', preview: '/', group: 'site' },
];

/** The tab strip and the page title, in the language on screen. */
function useSettingsLabels() {
  const t = useT();

  const tabs: Record<TabKey, string> = {
    homepage: t.admin.settings.tabHomepage,
    organization: t.admin.settings.tabOrganization,
    branding: t.admin.settings.tabBranding,
    global_contact: t.admin.settings.tabContact,
    global_social: t.admin.settings.tabSocial,
    seo: t.admin.settings.tabSeo,
  };

  const groups: Record<GroupKey, { title: string; description: string }> = {
    accueil: {
      title: t.admin.settings.groupHomeTitle,
      description: t.admin.settings.groupHomeDescription,
    },
    'a-propos': {
      title: t.admin.settings.groupAboutTitle,
      description: t.admin.settings.groupAboutDescription,
    },
    site: {
      title: t.admin.settings.groupSiteTitle,
      description: t.admin.settings.groupSiteDescription,
    },
  };

  return { tabs, groups };
}

interface DraftStatus {
  hasUnpublishedChanges: boolean;
  keys: string[];
  sections: Record<string, { hasDraft: boolean; draftUpdatedAt: string | null }>;
}

export const SettingsAdmin = () => {
  const t = useT();
  const { tabs: tabLabels, groups } = useSettingsLabels();
  const [searchParams, setSearchParams] = useSearchParams();

  // The sidebar links straight to a section, e.g. /admin/parametres?section=organization.
  const requested = searchParams.get('section') as TabKey | null;
  const tab: TabKey = TABS.some((item) => item.key === requested) ? requested! : 'branding';

  const group = TABS.find((item) => item.key === tab)!.group;
  const groupMeta = groups[group];
  const groupTabs = TABS.filter((item) => item.group === group);

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
    successMessage: t.admin.settings.publishedAll,
    invalidate: [['admin', 'settings']],
  });

  if (settingsQuery.isLoading) return <LoadingState label={t.admin.settings.loading} />;
  if (settingsQuery.isError || !settingsQuery.data) {
    return <ErrorState onRetry={() => void settingsQuery.refetch()} />;
  }

  const settings = settingsQuery.data;
  const status = statusQuery.data;
  const current = TABS.find((item) => item.key === tab)!;

  return (
    <div>
      <PageHeader
        title={groupMeta.title}
        description={`${groupMeta.description} ${t.admin.settings.draftNotice}`}
        actions={
          <Button variant="outline" onClick={() => openPreview(current.preview)}>
            <Eye className="h-4 w-4" /> {t.admin.common.preview}
          </Button>
        }
      />

      {status?.hasUnpublishedChanges && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange/30 bg-orange/5 px-4 py-3">
          <p className="text-sm text-navy/80">
            <span className="font-semibold text-navy">
              {t.admin.settings.pendingSections(status.keys.length)}
            </span>{' '}
            {t.admin.settings.pendingNotice}
          </p>
          <Button
            variant="secondary"
            size="sm"
            isLoading={publishAll.isPending}
            onClick={() => publishAll.mutate()}
          >
            <CloudUpload className="h-4 w-4" /> {t.admin.settings.publishAll}
          </Button>
        </div>
      )}

      {/* A single-section group needs no tab strip. */}
      {groupTabs.length > 1 && (
      <div className="mb-6 flex flex-wrap gap-2 border-b border-navy/10 pb-px">
        {groupTabs.map((item) => (
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
            {tabLabels[item.key]}
            {status?.sections?.[item.key]?.hasDraft && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-orange"
                aria-label={t.admin.settings.unpublishedDot}
              />
            )}
          </button>
        ))}
      </div>
      )}

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
  const t = useT();
  const [isDiscarding, setIsDiscarding] = useState(false);
  const tab = TABS.find((item) => item.key === settingKey)!;

  const { data: status } = useQuery({
    queryKey: ['admin', 'settings', 'status'],
    queryFn: async () => (await api.get<DraftStatus>('/settings/draft/status')).data,
  });

  const hasDraft = Boolean(status?.sections?.[settingKey]?.hasDraft);

  const publish = useAdminMutation<void>({
    mutationFn: async () => (await api.post(`/settings/${settingKey}/publish`)).data,
    successMessage: t.admin.settings.sectionPublished,
    invalidate: [['admin', 'settings']],
  });

  const discard = useAdminMutation<void>({
    mutationFn: async () => (await api.delete(`/settings/${settingKey}/draft`)).data,
    successMessage: t.admin.settings.discarded,
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
          {hasDraft ? t.admin.settings.badgeDraft : t.admin.settings.badgeLive}
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
              <RotateCcw className="h-3.5 w-3.5" /> {t.admin.settings.discard}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={() => openPreview(tab.preview)}>
            <Eye className="h-4 w-4" /> {t.admin.common.preview}
          </Button>
          <Button type="submit" variant="outline" isLoading={isSaving}>
            <Save className="h-4 w-4" /> {t.admin.settings.saveDraft}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!hasDraft}
            isLoading={publish.isPending}
            onClick={() => publish.mutate()}
            title={hasDraft ? undefined : t.admin.settings.nothingToPublish}
          >
            <CloudUpload className="h-4 w-4" /> {t.admin.settings.publish}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isDiscarding}
        title={t.admin.settings.discardTitle}
        message={t.admin.settings.discardMessage}
        confirmLabel={t.admin.settings.discard}
        isLoading={discard.isPending}
        onCancel={() => setIsDiscarding(false)}
        onConfirm={() => discard.mutate()}
      />
    </form>
  );
};

/** Saving writes a draft; the section reaches the site through Publish. */
function useSettingsMutation(key: TabKey) {
  const t = useT();

  return useAdminMutation<Record<string, unknown>>({
    mutationFn: async (value) => (await api.patch(`/settings/${key}`, { value })).data,
    successMessage: t.admin.settings.draftSaved,
    invalidate: [['admin', 'settings']],
  });
}
const BrandingForm = ({ settings }: { settings: SiteSettings }) => {
  const t = useT();
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
      title={t.admin.settings.brandingTitle}
      description={t.admin.settings.brandingDescription}
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
            label={t.admin.settings.logoMain}
            slot="siteLogo"
          />
          <p className="mt-1 text-xs text-navy/50">{t.admin.settings.logoMainNote}</p>
        </div>

        <div>
          <MediaPicker
            value={logoDark}
            onChange={setLogoDark}
            label={t.admin.settings.logoDark}
            slot="siteLogo"
          />
          <p className="mt-1 text-xs text-navy/50">{t.admin.settings.logoDarkNote}</p>
        </div>
      </div>

      <Field
        label={t.admin.settings.logoHeight}
        htmlFor="branding-height"
        hint={t.admin.settings.logoHeightHint}
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
          label={t.admin.settings.favicon}
          slot="favicon"
        />
        <p className="mt-1 text-xs text-navy/50">
          {t.admin.settings.faviconNoteStart}
          <strong>{t.admin.settings.faviconNoteEmphasis}</strong>
          {t.admin.settings.faviconNoteEnd}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={t.admin.settings.wordmark}
          htmlFor="branding-wordmark"
          hint={t.admin.settings.wordmarkHint}
        >
          <Input id="branding-wordmark" placeholder="LDS" {...register('wordmark')} />
        </Field>
        <Field label={t.admin.settings.wordmarkAccent} htmlFor="branding-accent">
          <Input id="branding-accent" placeholder="Louga" {...register('wordmarkAccent')} />
        </Field>
      </div>
    </SettingsCard>
  );
};

const OrganizationForm = ({ settings }: { settings: SiteSettings }) => {
  const t = useT();
  const mutation = useSettingsMutation('organization');
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({ defaultValues: settings.organization });

  return (
    <SettingsCard
      settingKey="organization"
      title={t.admin.settings.organizationTitle}
      description={t.admin.settings.organizationDescription}
      isSaving={mutation.isPending}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={t.admin.settings.fullName}
          htmlFor="org-name"
          required
          error={errors.name?.message}
        >
          <Input
            id="org-name"
            {...register('name', { required: t.admin.settings.nameRequired })}
          />
        </Field>
        <Field label={t.admin.settings.acronym} htmlFor="org-short">
          <Input id="org-short" placeholder="LDS" {...register('shortName')} />
        </Field>
      </div>

      {/* The registered name and the acronym above stay single-valued: they
          are the same in both languages. Everything from here down is the
          association's own voice and exists in each. */}
      <LocalizedFormField
        control={control}
        name="tagline"
        id="org-tagline"
        label={t.admin.settings.tagline}
        hint={t.admin.settings.taglineHint}
      />

      <LocalizedFormField
        control={control}
        name="about"
        id="org-about"
        label={t.admin.settings.about}
        hint={t.admin.settings.aboutHint}
        multiline
        rows={5}
      />

      <LocalizedFormField
        control={control}
        name="mission"
        id="org-mission"
        label={t.admin.settings.mission}
        multiline
        rows={4}
      />

      <LocalizedFormField
        control={control}
        name="quote"
        id="org-quote"
        label={t.admin.settings.quote}
        hint={t.admin.settings.quoteHint}
        multiline
        rows={2}
      />

      <Field label={t.admin.settings.foundedYear} htmlFor="org-year">
        <Input id="org-year" placeholder="2019" {...register('foundedYear')} />
      </Field>
    </SettingsCard>
  );
};

const ContactForm = ({ settings }: { settings: SiteSettings }) => {
  const t = useT();
  const mutation = useSettingsMutation('global_contact');
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({ defaultValues: settings.global_contact });

  return (
    <SettingsCard
      settingKey="global_contact"
      title={t.admin.settings.contactTitle}
      description={t.admin.settings.contactDescription}
      isSaving={mutation.isPending}
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
    >
      <Field
        label={t.admin.common.emailLabel}
        htmlFor="contact-email"
        required
        error={errors.email?.message}
      >
        <Input
          id="contact-email"
          type="email"
          aria-invalid={Boolean(errors.email)}
          {...register('email', {
            required: t.admin.common.emailRequired,
            pattern: { value: /^\S+@\S+\.\S+$/, message: t.admin.common.emailInvalid },
          })}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={t.admin.settings.phone}
          htmlFor="contact-phone"
          required
          error={errors.phone?.message}
        >
          <Input
            id="contact-phone"
            aria-invalid={Boolean(errors.phone)}
            {...register('phone', { required: t.admin.settings.phoneRequired })}
          />
        </Field>
        <Field label={t.admin.settings.phoneSecondary} htmlFor="contact-phone2">
          <Input id="contact-phone2" {...register('phoneSecondary')} />
        </Field>
      </div>

      {/* Read, not dialled: the postal address is editorial. The email and
          the phone numbers above are not, and stay single-valued. */}
      <LocalizedFormField
        control={control}
        name="address"
        id="contact-address"
        label={t.admin.settings.address}
        multiline
        rows={2}
      />
    </SettingsCard>
  );
};

const SocialForm = ({ settings }: { settings: SiteSettings }) => {
  const t = useT();
  const mutation = useSettingsMutation('global_social');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: settings.global_social });

  const urlRule = {
    pattern: { value: /^(https?:\/\/\S+)?$/, message: t.admin.settings.socialUrlPattern },
  };

  return (
    <SettingsCard
      settingKey="global_social"
      title={t.admin.settings.socialTitle}
      description={t.admin.settings.socialDescription}
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
  const t = useT();
  const mutation = useSettingsMutation('homepage');
  const { register, handleSubmit, control } = useForm({ defaultValues: settings.homepage });

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
      title={t.admin.settings.homepageTitle}
      description={t.admin.settings.homepageDescription}
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
      {/* The H1 of the homepage: the first thing anyone reads on the site. */}
      <LocalizedFormField
        control={control}
        name="heroTitle"
        id="home-hero-title"
        label={t.admin.settings.heroTitle}
        multiline
        rows={2}
      />

      <LocalizedFormField
        control={control}
        name="heroSubtitle"
        id="home-hero-sub"
        label={t.admin.settings.heroSubtitle}
        multiline
        rows={3}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={t.admin.settings.badgeTitle}
          htmlFor="home-badge-title"
          hint={t.admin.settings.badgeTitleHint}
        >
          <LocalizedFormField
            control={control}
            name="heroBadgeTitle"
            id="home-badge-title"
            label={t.admin.settings.badgeTitle}
          />
        </Field>
        <Field label={t.admin.settings.badgeSubtitle} htmlFor="home-badge-sub">
          <LocalizedFormField
            control={control}
            name="heroBadgeSubtitle"
            id="home-badge-sub"
            label={t.admin.settings.badgeSubtitle}
          />
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <MediaPicker
          value={heroImage}
          onChange={setHeroImage}
          label={t.admin.settings.heroPhoto}
            slot="heroPortrait"
        />
        <MediaPicker
          value={aboutImage}
          onChange={setAboutImage}
          label={t.admin.settings.aboutPhoto}
            slot="aboutPhoto"
        />
      </div>

      <LocalizedFormField
        control={control}
        name="ctaQuote"
        id="home-cta-quote"
        label={t.admin.settings.ctaQuote}
        multiline
        rows={2}
      />
      <MediaPicker
        value={ctaImage}
        onChange={setCtaImage}
        label={t.admin.settings.ctaImage}
            slot="ctaBanner"
      />
    </SettingsCard>
  );
};

const SeoForm = ({ settings }: { settings: SiteSettings }) => {
  const t = useT();
  const mutation = useSettingsMutation('seo');
  const { register, handleSubmit, watch, control } = useForm({ defaultValues: settings.seo });

  const stored = useMediaById([settings.seo.ogImageId]);
  const [ogImage, setOgImage] = useState<ImageSelection>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (isHydrated || !Object.keys(stored).length) return;
    setOgImage(stored[settings.seo.ogImageId ?? ''] ?? null);
    setIsHydrated(true);
  }, [stored, isHydrated, settings.seo]);

  // The meta description has a length budget in each language, so the counter
  // follows the French one - the Arabic is counted on its own tab.
  const description = watch('description') ?? {};
  const descriptionLength = (description as Record<string, string>).fr?.length ?? 0;

  return (
    <SettingsCard
      settingKey="seo"
      title={t.admin.settings.seoTitle}
      description={t.admin.settings.seoDescription}
      isSaving={mutation.isPending}
      onSubmit={handleSubmit(async (values) => {
        const stored = await commitImage(ogImage, 'seo');
        setOgImage(stored);
        mutation.mutate({ ...values, ogImageId: stored?.id ?? null });
      })}
    >
      {/* An Arabic page indexed under a French title is a page nobody finds. */}
      <LocalizedFormField
        control={control}
        name="title"
        id="seo-title"
        label={t.admin.settings.siteTitle}
        hint={t.admin.settings.siteTitleHint}
      />

      <LocalizedFormField
        control={control}
        name="description"
        id="seo-description"
        label={t.admin.settings.seoDescriptionLabel}
        hint={t.admin.settings.seoDescriptionHint(descriptionLength)}
        multiline
        rows={3}
      />

      <LocalizedFormField
        control={control}
        name="keywords"
        id="seo-keywords"
        label={t.admin.settings.keywords}
        hint={t.admin.settings.keywordsHint}
      />

      <MediaPicker
        value={ogImage}
        onChange={setOgImage}
        label={t.admin.settings.shareImage}
            slot="ogImage"
      />
    </SettingsCard>
  );
};
