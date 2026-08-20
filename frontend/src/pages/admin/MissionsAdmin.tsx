import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Edit2, Eye, EyeOff, ImageIcon, Plus, Target, Trash2 } from 'lucide-react';
import api from '../../lib/api/axios';
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
import { t, type Mission } from '../../lib/types';

interface FormValues {
  title: string;
  description: string;
  icon: string;
  isPublished: boolean;
}

const EMPTY_FORM: FormValues = {
  title: '',
  description: '',
  icon: MISSION_ICON_OPTIONS[0].value,
  isPublished: true,
};

export const MissionsAdmin = () => {
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
      title: t(mission.title),
      description: t(mission.description),
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
        icon: values.icon,
        imageId: uploaded?.id ?? null,
        isPublished: values.isPublished,
      };

      return editing
        ? (await api.patch(`/missions/${editing.id}`, payload)).data
        : (await api.post('/missions', payload)).data;
    },
    successMessage: editing ? "Domaine d'action mis à jour." : "Domaine d'action créé.",
    invalidate: [['admin', 'missions']],
    onSuccess: closeForm,
  });

  const togglePublish = useAdminMutation<Mission>({
    mutationFn: async (mission) =>
      (await api.patch(`/missions/${mission.id}`, { isPublished: !mission.isPublished })).data,
    successMessage: 'Statut de publication mis à jour.',
    invalidate: [['admin', 'missions']],
  });

  const deleteMutation = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/missions/${id}`)).data,
    successMessage: "Domaine d'action supprimé.",
    invalidate: [['admin', 'missions']],
    onSuccess: () => setPendingDelete(null),
  });

  const columns: Array<Column<Mission>> = [
    {
      key: 'image',
      header: 'Visuel',
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
      header: 'Domaine',
      render: (mission) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy">{t(mission.title, 'Sans titre')}</p>
          <p className="line-clamp-1 text-xs text-navy/50">{t(mission.description)}</p>
        </div>
      ),
    },
    {
      key: 'icon',
      header: 'Icône',
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
      header: 'Statut',
      render: (mission) => (
        <Badge tone={mission.isPublished ? 'green' : 'neutral'}>
          {mission.isPublished ? 'Publié' : 'Brouillon'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Domaines d'action"
        description="Les piliers d'intervention présentés sur la page d'accueil et la page « Nos actions »."
        actions={
          <>
            <PreviewButton path="/nos-actions" />
            <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Ajouter un domaine
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
          title="Vous n'avez encore aucun domaine d'action"
          description="Décrivez les grands axes de votre association pour les présenter aux visiteurs."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Créer un domaine d'action
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={listQuery.data}
          rowKey={(mission) => mission.id}
          mobileTitle={(mission) => t(mission.title, 'Sans titre')}
          actions={(mission) => (
            <>
              <IconButton
                label={mission.isPublished ? 'Dépublier' : 'Publier'}
                icon={mission.isPublished ? EyeOff : Eye}
                onClick={() => togglePublish.mutate(mission)}
                disabled={togglePublish.isPending}
              />
              <IconButton label="Modifier" icon={Edit2} onClick={() => openEdit(mission)} />
              <IconButton
                label="Supprimer"
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
        title={editing ? "Modifier le domaine d'action" : "Nouveau domaine d'action"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeForm} disabled={saveMutation.isPending}>
              Annuler
            </Button>
            <Button form="mission-form" type="submit" isLoading={saveMutation.isPending}>
              {editing ? 'Enregistrer' : 'Créer'}
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
              <Field label="Intitulé" htmlFor="mission-title" required error={errors.title?.message}>
                <Input
                  id="mission-title"
                  placeholder="Éducation"
                  aria-invalid={Boolean(errors.title)}
                  {...register('title', {
                    required: "L'intitulé est obligatoire",
                    minLength: { value: 2, message: "L'intitulé est trop court" },
                  })}
                />
              </Field>

              <Field label="Icône" htmlFor="mission-icon">
                <Select id="mission-icon" {...register('icon')}>
                  {MISSION_ICON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <MediaPicker
              value={cover}
              onChange={setCover}
              slot="missionCover"
              label="Illustration"
            />
          </div>

          <Field
            label="Description"
            htmlFor="mission-description"
            required
            hint="Deux à trois phrases décrivant concrètement les actions menées."
            error={errors.description?.message}
          >
            <Textarea
              id="mission-description"
              rows={4}
              aria-invalid={Boolean(errors.description)}
              {...register('description', {
                required: 'La description est obligatoire',
                maxLength: { value: 1200, message: '1200 caractères maximum' },
              })}
            />
          </Field>

          <Checkbox
            id="mission-published"
            label="Afficher sur le site public"
            {...register('isPublished')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Supprimer ce domaine d'action ?"
        message={`« ${t(pendingDelete?.title, '')} » disparaîtra du site public. Cette action est irréversible.`}
        isLoading={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </div>
  );
};
