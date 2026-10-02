import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Edit2, Eye, EyeOff, ImageIcon, Plus, Target, Trash2 } from 'lucide-react';
import api from '../../lib/api/axios';
import { useLocale } from '../../context/LocaleContext';
import { useT } from '../../lib/i18n/useT';
import { localized, localizedOrSource } from '../../lib/i18n/resolve';
import { useAdminMutation } from '../../lib/queries/adminHooks';
import { MISSION_ICON_OPTIONS, resolveIcon } from '../../lib/icons';
import { commitImage, type ImageSelection } from '../../lib/pendingImage';
import { PageHeader } from '../../components/admin/ui/PageHeader';
import { PreviewButton } from '../../components/admin/ui/PreviewButton';
import { DataTable, IconButton, type Column } from '../../components/admin/ui/DataTable';
import { MediaPicker } from '../../components/admin/ui/MediaPicker';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { Checkbox, Field, Input, Select, Textarea } from '../../components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import type { Mission } from '../../lib/types';

interface FormValues {
  title: string;
  description: string;
  content: string;
  icon: string;
  isPublished: boolean;
}

const EMPTY_FORM: FormValues = {
  title: '',
  description: '',
  content: '',
  icon: MISSION_ICON_OPTIONS[0].value,
  isPublished: true,
};

export const MissionsAdmin = () => {
  const t = useT();
  const { locale } = useLocale();
  const [editing, setEditing] = useState<Mission | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Mission | null>(null);
  const [cover, setCover] = useState<ImageSelection>(null);

  const listQuery = useQuery({
    queryKey: ['admin', 'missions'],
    queryFn: async () => (await api.get<Mission[]>('/missions')).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: EMPTY_FORM });

  const text = (value: Parameters<typeof localizedOrSource>[0]) =>
    localizedOrSource(value, locale).text;

  const openCreate = () => {
    setEditing(null);
    setCover(null);
    reset(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEdit = (mission: Mission) => {
    setEditing(mission);
    setCover(mission.image);
    reset({
      // The form writes the French source, whatever language the screen is in.
      title: localized(mission.title, 'fr'),
      description: localized(mission.description, 'fr'),
      content: localized(mission.content, 'fr'),
      icon: mission.icon ?? MISSION_ICON_OPTIONS[0].value,
      isPublished: mission.isPublished,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    setCover(null);
    reset(EMPTY_FORM);
  };

  const saveMutation = useAdminMutation<FormValues>({
    mutationFn: async (values) => {
      // The picked file reaches MinIO here, when the administrator commits.
      const uploaded = await commitImage(cover, 'missions');

      const payload = {
        title: { fr: values.title },
        description: { fr: values.description },
        // null clears the long form server-side; omitting the key would leave
        // whatever was there.
        content: values.content.trim() ? { fr: values.content } : null,
        icon: values.icon,
        imageId: uploaded?.id ?? null,
        isPublished: values.isPublished,
      };

      return editing
        ? (await api.patch(`/missions/${editing.id}`, payload)).data
        : (await api.post('/missions', payload)).data;
    },
    successMessage: editing ? t.admin.missions.updated : t.admin.missions.created,
    invalidate: [['admin', 'missions']],
    onSuccess: closeForm,
  });

  const togglePublish = useAdminMutation<Mission>({
    mutationFn: async (mission) =>
      (await api.patch(`/missions/${mission.id}`, { isPublished: !mission.isPublished })).data,
    successMessage: t.admin.missions.statusUpdated,
    invalidate: [['admin', 'missions']],
  });

  const deleteMutation = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/missions/${id}`)).data,
    successMessage: t.admin.missions.deleted,
    invalidate: [['admin', 'missions']],
    onSuccess: () => setPendingDelete(null),
  });

  const columns: Array<Column<Mission>> = [
    {
      key: 'image',
      header: t.admin.common.visual,
      hideOnMobile: true,
      render: (mission) =>
        mission.image ? (
          <img src={mission.image.url} alt="" className="h-11 w-16 rounded-lg object-cover" loading="lazy" />
        ) : (
          <div className="flex h-11 w-16 items-center justify-center rounded-lg bg-warm-muted">
            <ImageIcon className="h-4 w-4 text-navy/30" />
          </div>
        ),
    },
    {
      key: 'title',
      header: t.admin.missions.columnDomain,
      render: (mission) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy">
            {text(mission.title) || t.admin.dashboard.untitled}
          </p>
          <p className="line-clamp-1 text-xs text-navy/50">{text(mission.description)}</p>
        </div>
      ),
    },
    {
      key: 'icon',
      header: t.admin.missions.columnIcon,
      render: (mission) => {
        const Icon = resolveIcon(mission.icon);
        return (
          <span className="inline-flex items-center gap-2 text-navy/70">
            <Icon className="h-4 w-4" />
            <span className="text-xs">{mission.icon ?? '—'}</span>
          </span>
        );
      },
    },
    {
      key: 'status',
      header: t.admin.common.status,
      render: (mission) => (
        <Badge tone={mission.isPublished ? 'green' : 'neutral'}>
          {mission.isPublished ? t.admin.common.published : t.admin.common.draft}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t.admin.missions.title}
        description={t.admin.missions.description}
        actions={
          <>
            <PreviewButton path="/nos-actions" label={t.admin.common.preview} />
            <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> {t.admin.missions.addButton}
            </Button>
          </>
        }
      />

      {listQuery.isLoading ? (
        <LoadingState />
      ) : listQuery.isError ? (
        <ErrorState onRetry={() => void listQuery.refetch()} />
      ) : !listQuery.data?.length ? (
        <EmptyState
          icon={Target}
          title={t.admin.missions.emptyTitle}
          description={t.admin.missions.emptyDescription}
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t.admin.missions.emptyAction}
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={listQuery.data}
          rowKey={(mission) => mission.id}
          mobileTitle={(mission) => text(mission.title) || t.admin.dashboard.untitled}
          actions={(mission) => (
            <>
              <IconButton
                label={mission.isPublished ? t.admin.common.unpublish : t.admin.common.publish}
                icon={mission.isPublished ? EyeOff : Eye}
                onClick={() => togglePublish.mutate(mission)}
                disabled={togglePublish.isPending}
              />
              <IconButton label={t.common.edit} icon={Edit2} onClick={() => openEdit(mission)} />
              <IconButton
                label={t.common.delete}
                icon={Trash2}
                tone="danger"
                onClick={() => setPendingDelete(mission)}
              />
            </>
          )}
        />
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editing ? t.admin.missions.editTitle : t.admin.missions.createTitle}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeForm} disabled={saveMutation.isPending}>
              {t.common.cancel}
            </Button>
            <Button form="mission-form" type="submit" isLoading={saveMutation.isPending}>
              {editing ? t.common.save : t.admin.common.create}
            </Button>
          </>
        }
      >
        <form
          id="mission-form"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          className="space-y-5"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-5">
              <Field
                label={t.admin.missions.labelLabel}
                htmlFor="mission-title"
                required
                error={errors.title?.message}
              >
                <Input
                  id="mission-title"
                  placeholder={t.admin.missions.labelPlaceholder}
                  aria-invalid={Boolean(errors.title)}
                  {...register('title', {
                    required: t.admin.missions.labelRequired,
                    minLength: { value: 2, message: t.admin.missions.labelTooShort },
                  })}
                />
              </Field>

              <Field label={t.admin.missions.iconLabel} htmlFor="mission-icon">
                <Select id="mission-icon" {...register('icon')}>
                  {MISSION_ICON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {/* The pictogram is the same in both languages; only its name is
                          translated. The French label is the fallback so a newly added
                          icon is never a blank line. */}
                      {t.iconLabels.mission[option.value] ?? option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <MediaPicker
              value={cover}
              onChange={setCover}
              slot="missionCover"
              label={t.admin.missions.illustration}
            />
          </div>

          <Field
            label={t.admin.missions.descriptionLabel}
            htmlFor="mission-description"
            required
            hint={t.admin.missions.descriptionHint}
            error={errors.description?.message}
          >
            <Textarea
              id="mission-description"
              rows={4}
              aria-invalid={Boolean(errors.description)}
              {...register('description', {
                required: t.admin.missions.descriptionRequired,
                maxLength: { value: 1200, message: t.admin.missions.descriptionMax },
              })}
            />
          </Field>

          <Field
            label={t.admin.missions.contentLabel}
            htmlFor="mission-content"
            hint={t.admin.missions.contentHint}
            error={errors.content?.message}
          >
            <Textarea
              id="mission-content"
              rows={8}
              aria-invalid={Boolean(errors.content)}
              {...register('content', {
                maxLength: { value: 20000, message: t.admin.missions.contentMax },
              })}
            />
          </Field>

          <Checkbox
            id="mission-published"
            label={t.admin.common.showOnSite}
            {...register('isPublished')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title={t.admin.missions.deleteTitle}
        message={t.admin.missions.deleteMessage(text(pendingDelete?.title))}
        isLoading={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </div>
  );
};
