import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Edit2, Eye, EyeOff, HeartHandshake, Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api/axios';
import { useAdminMutation } from '../../lib/queries/adminHooks';
import { PageHeader } from '../../components/admin/ui/PageHeader';
import { PreviewButton } from '../../components/admin/ui/PreviewButton';
import { DataTable, IconButton, type Column } from '../../components/admin/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { Checkbox, Field, Input, Select, Textarea } from '../../components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { t, type DonationMethod } from '../../lib/types';

interface FormValues {
  title: string;
  description: string;
  actionType: DonationMethod['actionType'];
  actionData: string;
  actionLabel: string;
  iconColor: DonationMethod['iconColor'];
  isPublished: boolean;
}

const ACTION_TYPES = [
  { value: 'phone', label: 'Numéro à copier (Orange Money, Wave…)', hint: '+221 77 000 00 00' },
  { value: 'link', label: 'Lien interne du site', hint: '/contact' },
  { value: 'email', label: 'Adresse email', hint: 'contact@exemple.org' },
  { value: 'contact', label: 'Renvoi vers le formulaire de contact', hint: '/contact' },
] as const;

const COLORS = [
  { value: 'orange', label: 'Orange' },
  { value: 'blue', label: 'Bleu' },
  { value: 'green', label: 'Vert' },
  { value: 'navy', label: 'Bleu nuit' },
] as const;

const EMPTY_FORM: FormValues = {
  title: '',
  description: '',
  actionType: 'phone',
  actionData: '',
  actionLabel: '',
  iconColor: 'orange',
  isPublished: true,
};

export const DonationsAdmin = () => {
  const [editing, setEditing] = useState<DonationMethod | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DonationMethod | null>(null);

  const listQuery = useQuery({
    queryKey: ['admin', 'donations'],
    queryFn: async () => (await api.get<DonationMethod[]>('/donations')).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: EMPTY_FORM });

  const actionType = watch('actionType');
  const actionHint = ACTION_TYPES.find((type) => type.value === actionType)?.hint;

  const openCreate = () => {
    setEditing(null);
    reset(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEdit = (method: DonationMethod) => {
    setEditing(method);
    reset({
      title: t(method.title),
      description: t(method.description),
      actionType: method.actionType,
      actionData: method.actionData,
      actionLabel: t(method.actionLabel),
      iconColor: method.iconColor,
      isPublished: method.isPublished,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    reset(EMPTY_FORM);
  };

  const saveMutation = useAdminMutation<FormValues>({
    mutationFn: async (values) => {
      const payload = {
        title: { fr: values.title },
        description: { fr: values.description },
        actionType: values.actionType,
        actionData: values.actionData,
        actionLabel: { fr: values.actionLabel },
        iconColor: values.iconColor,
        isPublished: values.isPublished,
      };

      return editing
        ? (await api.patch(`/donations/${editing.id}`, payload)).data
        : (await api.post('/donations', payload)).data;
    },
    successMessage: editing ? 'Moyen de soutien mis à jour.' : 'Moyen de soutien ajouté.',
    invalidate: [['admin', 'donations']],
    onSuccess: closeForm,
  });

  const togglePublish = useAdminMutation<DonationMethod>({
    mutationFn: async (method) =>
      (await api.patch(`/donations/${method.id}`, { isPublished: !method.isPublished })).data,
    successMessage: 'Statut mis à jour.',
    invalidate: [['admin', 'donations']],
  });

  const deleteMutation = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/donations/${id}`)).data,
    successMessage: 'Moyen de soutien supprimé.',
    invalidate: [['admin', 'donations']],
    onSuccess: () => setPendingDelete(null),
  });

  const columns: Array<Column<DonationMethod>> = [
    {
      key: 'title',
      header: 'Intitulé',
      render: (method) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy">{t(method.title)}</p>
          <p className="line-clamp-1 text-xs text-navy/50">{t(method.description)}</p>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (method) => (
        <span className="text-navy/70">
          {ACTION_TYPES.find((type) => type.value === method.actionType)?.value ?? method.actionType}
          {' · '}
          <span className="text-navy/50">{method.actionData}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (method) => (
        <Badge tone={method.isPublished ? 'green' : 'neutral'}>
          {method.isPublished ? 'Affiché' : 'Masqué'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Nous soutenir"
        description="Les différentes façons pour un visiteur de soutenir l'association."
        actions={
          <>
            <PreviewButton path="/nous-soutenir" />
            <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Ajouter un moyen
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
          icon={HeartHandshake}
          title="Aucun moyen de soutien"
          description="Expliquez comment les visiteurs peuvent aider : don, bénévolat, matériel…"
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Ajouter un moyen de soutien
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={listQuery.data}
          rowKey={(method) => method.id}
          mobileTitle={(method) => t(method.title)}
          actions={(method) => (
            <>
              <IconButton
                label={method.isPublished ? 'Masquer' : 'Afficher'}
                icon={method.isPublished ? EyeOff : Eye}
                onClick={() => togglePublish.mutate(method)}
                disabled={togglePublish.isPending}
              />
              <IconButton label="Modifier" icon={Edit2} onClick={() => openEdit(method)} />
              <IconButton
                label="Supprimer"
                icon={Trash2}
                tone="danger"
                onClick={() => setPendingDelete(method)}
              />
            </>
          )}
        />
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editing ? 'Modifier le moyen de soutien' : 'Nouveau moyen de soutien'}
        footer={
          <>
            <Button variant="outline" onClick={closeForm} disabled={saveMutation.isPending}>
              Annuler
            </Button>
            <Button form="donation-form" type="submit" isLoading={saveMutation.isPending}>
              {editing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </>
        }
      >
        <form
          id="donation-form"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          className="space-y-5"
        >
          <Field label="Intitulé" htmlFor="donation-title" required error={errors.title?.message}>
            <Input
              id="donation-title"
              placeholder="Faire un don financier"
              aria-invalid={Boolean(errors.title)}
              {...register('title', { required: "L'intitulé est obligatoire" })}
            />
          </Field>

          <Field
            label="Description"
            htmlFor="donation-description"
            required
            error={errors.description?.message}
          >
            <Textarea
              id="donation-description"
              rows={3}
              aria-invalid={Boolean(errors.description)}
              {...register('description', { required: 'La description est obligatoire' })}
            />
          </Field>

          <Field label="Type d'action" htmlFor="donation-type">
            <Select id="donation-type" {...register('actionType')}>
              {ACTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Valeur de l'action"
            htmlFor="donation-data"
            required
            hint={actionHint ? `Exemple : ${actionHint}` : undefined}
            error={errors.actionData?.message}
          >
            <Input
              id="donation-data"
              aria-invalid={Boolean(errors.actionData)}
              {...register('actionData', { required: 'Cette valeur est obligatoire' })}
            />
          </Field>

          <Field
            label="Libellé du bouton"
            htmlFor="donation-label"
            required
            error={errors.actionLabel?.message}
          >
            <Input
              id="donation-label"
              placeholder="Copier le numéro"
              aria-invalid={Boolean(errors.actionLabel)}
              {...register('actionLabel', { required: 'Le libellé est obligatoire' })}
            />
          </Field>

          <Field label="Couleur" htmlFor="donation-color">
            <Select id="donation-color" {...register('iconColor')}>
              {COLORS.map((color) => (
                <option key={color.value} value={color.value}>
                  {color.label}
                </option>
              ))}
            </Select>
          </Field>

          <Checkbox
            id="donation-published"
            label="Afficher sur le site public"
            {...register('isPublished')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Supprimer ce moyen de soutien ?"
        message={`« ${t(pendingDelete?.title, '')} » ne sera plus proposé aux visiteurs.`}
        isLoading={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </div>
  );
};
