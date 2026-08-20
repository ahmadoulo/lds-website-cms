import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ArrowDown, ArrowUp, Edit2, Menu, Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api/axios';
import { useAdminMutation } from '../../lib/queries/adminHooks';
import { PageHeader } from '../../components/admin/ui/PageHeader';
import { IconButton } from '../../components/admin/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field, Input } from '../../components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { t, type NavigationItem } from '../../lib/types';

interface FormValues {
  label: string;
  href: string;
}

const EMPTY_FORM: FormValues = { label: '', href: '' };

export const NavigationAdmin = () => {
  const [editing, setEditing] = useState<NavigationItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<NavigationItem | null>(null);

  const listQuery = useQuery({
    queryKey: ['admin', 'navigation'],
    queryFn: async () => (await api.get<NavigationItem[]>('/navigation')).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: EMPTY_FORM });

  const openCreate = () => {
    setEditing(null);
    reset(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEdit = (item: NavigationItem) => {
    setEditing(item);
    reset({ label: t(item.label), href: item.href });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    reset(EMPTY_FORM);
  };

  const saveMutation = useAdminMutation<FormValues>({
    mutationFn: async (values) => {
      const payload = { label: { fr: values.label }, href: values.href };
      return editing
        ? (await api.patch(`/navigation/${editing.id}`, payload)).data
        : (await api.post('/navigation', payload)).data;
    },
    successMessage: editing ? 'Lien mis à jour.' : 'Lien ajouté.',
    invalidate: [['admin', 'navigation']],
    onSuccess: closeForm,
  });

  const reorderMutation = useAdminMutation<string[]>({
    mutationFn: async (ids) => (await api.patch('/navigation/reorder', { ids })).data,
    successMessage: 'Ordre du menu mis à jour.',
    invalidate: [['admin', 'navigation']],
  });

  const deleteMutation = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/navigation/${id}`)).data,
    successMessage: 'Lien supprimé.',
    invalidate: [['admin', 'navigation']],
    onSuccess: () => setPendingDelete(null),
  });

  /** Swaps an item with its neighbour and persists the whole order. */
  const move = (index: number, direction: -1 | 1) => {
    const items = listQuery.data;
    if (!items) return;

    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    const ids = items.map((item) => item.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderMutation.mutate(ids);
  };

  return (
    <div>
      <PageHeader
        title="Navigation"
        description="Les liens du menu principal affiché en haut du site public."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Ajouter un lien
          </Button>
        }
      />

      {listQuery.isLoading ? (
        <LoadingState />
      ) : listQuery.isError ? (
        <ErrorState onRetry={() => void listQuery.refetch()} />
      ) : !listQuery.data?.length ? (
        <EmptyState
          icon={Menu}
          title="Aucun lien de navigation"
          description="Ajoutez les entrées du menu principal du site."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Ajouter un lien
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-navy/8 overflow-hidden rounded-xl border border-navy/8 bg-white">
          {listQuery.data.map((item, index) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <span className="w-6 text-center text-xs font-bold text-navy/30">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-navy">{t(item.label)}</p>
                <p className="truncate text-xs text-navy/50">{item.href}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  label="Monter"
                  icon={ArrowUp}
                  disabled={index === 0 || reorderMutation.isPending}
                  onClick={() => move(index, -1)}
                />
                <IconButton
                  label="Descendre"
                  icon={ArrowDown}
                  disabled={index === listQuery.data.length - 1 || reorderMutation.isPending}
                  onClick={() => move(index, 1)}
                />
                <IconButton label="Modifier" icon={Edit2} onClick={() => openEdit(item)} />
                <IconButton
                  label="Supprimer"
                  icon={Trash2}
                  tone="danger"
                  onClick={() => setPendingDelete(item)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editing ? 'Modifier le lien' : 'Nouveau lien'}
        footer={
          <>
            <Button variant="outline" onClick={closeForm} disabled={saveMutation.isPending}>
              Annuler
            </Button>
            <Button form="nav-form" type="submit" isLoading={saveMutation.isPending}>
              {editing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </>
        }
      >
        <form
          id="nav-form"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          className="space-y-5"
        >
          <Field label="Libellé" htmlFor="nav-label" required error={errors.label?.message}>
            <Input
              id="nav-label"
              placeholder="Nos actions"
              aria-invalid={Boolean(errors.label)}
              {...register('label', { required: 'Le libellé est obligatoire' })}
            />
          </Field>

          <Field
            label="Adresse"
            htmlFor="nav-href"
            required
            hint="Un chemin interne (/nos-actions) ou une URL complète (https://…)."
            error={errors.href?.message}
          >
            <Input
              id="nav-href"
              placeholder="/nos-actions"
              aria-invalid={Boolean(errors.href)}
              {...register('href', {
                required: "L'adresse est obligatoire",
                pattern: {
                  value: /^(\/[A-Za-z0-9\-._~/]*|https?:\/\/\S+)$/,
                  message: 'Chemin interne (/page) ou URL http(s) uniquement',
                },
              })}
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Supprimer ce lien ?"
        message={`« ${t(pendingDelete?.label, '')} » sera retiré du menu du site.`}
        isLoading={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </div>
  );
};
