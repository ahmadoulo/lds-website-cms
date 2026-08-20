import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Building2, Edit2, Eye, EyeOff, ExternalLink, Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api/axios';
import { useAdminMutation } from '../../lib/queries/adminHooks';
import { PARTNER_ICON_OPTIONS, resolveIcon } from '../../lib/icons';
import { PageHeader } from '../../components/admin/ui/PageHeader';
import { DataTable, IconButton, type Column } from '../../components/admin/ui/DataTable';
import { MediaPicker } from '../../components/admin/ui/MediaPicker';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { Checkbox, Field, Input, Select } from '../../components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import type { Media, Partner } from '../../lib/types';

interface FormValues {
  name: string;
  url: string;
  icon: string;
  isPublished: boolean;
}

const EMPTY_FORM: FormValues = {
  name: '',
  url: '',
  icon: PARTNER_ICON_OPTIONS[0].value,
  isPublished: true,
};

export const PartnersAdmin = () => {
  const [editing, setEditing] = useState<Partner | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Partner | null>(null);
  const [logo, setLogo] = useState<Media | null>(null);

  const listQuery = useQuery({
    queryKey: ['admin', 'partners'],
    queryFn: async () => (await api.get<Partner[]>('/partners')).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: EMPTY_FORM });

  const openCreate = () => {
    setEditing(null);
    setLogo(null);
    reset(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEdit = (partner: Partner) => {
    setEditing(partner);
    setLogo(partner.logo);
    reset({
      name: partner.name,
      url: partner.url ?? '',
      icon: partner.icon ?? PARTNER_ICON_OPTIONS[0].value,
      isPublished: partner.isPublished,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    setLogo(null);
    reset(EMPTY_FORM);
  };

  const saveMutation = useAdminMutation<FormValues>({
    mutationFn: async (values) => {
      const payload = {
        name: values.name,
        // null (not undefined) so an existing link can actually be cleared;
        // undefined would be dropped from the JSON body and leave it unchanged.
        url: values.url.trim() || null,
        icon: values.icon,
        logoId: logo?.id ?? null,
        isPublished: values.isPublished,
      };

      return editing
        ? (await api.patch(`/partners/${editing.id}`, payload)).data
        : (await api.post('/partners', payload)).data;
    },
    successMessage: editing ? 'Partenaire mis à jour.' : 'Partenaire ajouté.',
    invalidate: [['admin', 'partners']],
    onSuccess: closeForm,
  });

  const togglePublish = useAdminMutation<Partner>({
    mutationFn: async (partner) =>
      (await api.patch(`/partners/${partner.id}`, { isPublished: !partner.isPublished })).data,
    successMessage: 'Statut mis à jour.',
    invalidate: [['admin', 'partners']],
  });

  const deleteMutation = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/partners/${id}`)).data,
    successMessage: 'Partenaire supprimé.',
    invalidate: [['admin', 'partners']],
    onSuccess: () => setPendingDelete(null),
  });

  const columns: Array<Column<Partner>> = [
    {
      key: 'logo',
      header: 'Logo',
      hideOnMobile: true,
      render: (partner) => {
        if (partner.logo) {
          return (
            <img
              src={partner.logo.url}
              alt=""
              loading="lazy"
              className="h-11 w-16 rounded-lg bg-white object-contain p-1 ring-1 ring-navy/8"
            />
          );
        }
        const Icon = resolveIcon(partner.icon);
        return (
          <div className="flex h-11 w-16 items-center justify-center rounded-lg bg-warm-muted">
            <Icon className="h-5 w-5 text-navy/40" />
          </div>
        );
      },
    },
    {
      key: 'name',
      header: 'Nom',
      render: (partner) => <span className="font-semibold text-navy">{partner.name}</span>,
    },
    {
      key: 'url',
      header: 'Site web',
      render: (partner) =>
        partner.url ? (
          <a
            href={partner.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-blue hover:underline"
          >
            Visiter <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-navy/40">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (partner) => (
        <Badge tone={partner.isPublished ? 'green' : 'neutral'}>
          {partner.isPublished ? 'Affiché' : 'Masqué'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Partenaires"
        description="Les organisations qui soutiennent et accompagnent l'association."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Ajouter un partenaire
          </Button>
        }
      />

      {listQuery.isLoading ? (
        <LoadingState />
      ) : listQuery.isError ? (
        <ErrorState onRetry={() => void listQuery.refetch()} />
      ) : !listQuery.data?.length ? (
        <EmptyState
          icon={Building2}
          title="Aucun partenaire"
          description="Ajoutez les organisations qui vous accompagnent pour renforcer la confiance des visiteurs."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Ajouter un partenaire
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={listQuery.data}
          rowKey={(partner) => partner.id}
          mobileTitle={(partner) => partner.name}
          actions={(partner) => (
            <>
              <IconButton
                label={partner.isPublished ? 'Masquer' : 'Afficher'}
                icon={partner.isPublished ? EyeOff : Eye}
                onClick={() => togglePublish.mutate(partner)}
                disabled={togglePublish.isPending}
              />
              <IconButton label="Modifier" icon={Edit2} onClick={() => openEdit(partner)} />
              <IconButton
                label="Supprimer"
                icon={Trash2}
                tone="danger"
                onClick={() => setPendingDelete(partner)}
              />
            </>
          )}
        />
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editing ? 'Modifier le partenaire' : 'Nouveau partenaire'}
        footer={
          <>
            <Button variant="outline" onClick={closeForm} disabled={saveMutation.isPending}>
              Annuler
            </Button>
            <Button form="partner-form" type="submit" isLoading={saveMutation.isPending}>
              {editing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </>
        }
      >
        <form
          id="partner-form"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          className="space-y-5"
        >
          <Field label="Nom" htmlFor="partner-name" required error={errors.name?.message}>
            <Input
              id="partner-name"
              aria-invalid={Boolean(errors.name)}
              {...register('name', {
                required: 'Le nom est obligatoire',
                minLength: { value: 2, message: 'Le nom est trop court' },
              })}
            />
          </Field>

          <Field
            label="Site web"
            htmlFor="partner-url"
            hint="Facultatif. Doit commencer par https://"
            error={errors.url?.message}
          >
            <Input
              id="partner-url"
              type="url"
              placeholder="https://exemple.org"
              aria-invalid={Boolean(errors.url)}
              {...register('url', {
                pattern: {
                  value: /^https?:\/\/\S+$/,
                  message: 'Le lien doit commencer par http:// ou https://',
                },
              })}
            />
          </Field>

          <Field
            label="Icône de repli"
            htmlFor="partner-icon"
            hint="Utilisée lorsque aucun logo n'est téléversé."
          >
            <Select id="partner-icon" {...register('icon')}>
              {PARTNER_ICON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <MediaPicker
            value={logo}
            onChange={setLogo}
            folder="partners"
            label="Logo"
            aspect="aspect-[3/2]"
          />

          <Checkbox
            id="partner-published"
            label="Afficher sur le site public"
            {...register('isPublished')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Supprimer ce partenaire ?"
        message={`« ${pendingDelete?.name ?? ''} » sera retiré du site. Cette action est irréversible.`}
        isLoading={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </div>
  );
};
