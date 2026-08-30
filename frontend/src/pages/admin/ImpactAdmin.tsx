import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { BarChart3, Edit2, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api/axios';
import { IMPACT_ICON_OPTIONS, resolveIcon } from '../../lib/icons';
import { useAdminMutation } from '../../lib/queries/adminHooks';
import { PageHeader } from '../../components/admin/ui/PageHeader';
import { PreviewButton } from '../../components/admin/ui/PreviewButton';
import { DataTable, IconButton, type Column } from '../../components/admin/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { Checkbox, Field, Input, Select } from '../../components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { t, type ImpactStat } from '../../lib/types';

interface FormValues {
  label: string;
  value: number;
  color: string;
  icon: string;
  isPublished: boolean;
}

const BRAND_COLORS = [
  { value: '#87CE18', label: 'Vert' },
  { value: '#00A4DE', label: 'Bleu' },
  { value: '#EE7900', label: 'Orange' },
  { value: '#172642', label: 'Bleu nuit' },
];

const EMPTY_FORM: FormValues = {
  label: '',
  value: 0,
  color: BRAND_COLORS[0].value,
  icon: '',
  isPublished: true,
};

export const ImpactAdmin = () => {
  const [editing, setEditing] = useState<ImpactStat | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ImpactStat | null>(null);

  const listQuery = useQuery({
    queryKey: ['admin', 'impact'],
    queryFn: async () => (await api.get<ImpactStat[]>('/impact')).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: EMPTY_FORM });

  const selectedColor = watch('color');

  const openCreate = () => {
    setEditing(null);
    reset(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEdit = (stat: ImpactStat) => {
    setEditing(stat);
    reset({
      label: t(stat.label),
      value: stat.value,
      color: stat.color,
      icon: stat.icon ?? '',
      isPublished: stat.isPublished,
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
        label: { fr: values.label },
        value: Number(values.value),
        color: values.color,
        // Empty means "no pictogram"; the figure is then shown on its own.
        icon: values.icon || null,
        isPublished: values.isPublished,
      };

      return editing
        ? (await api.patch(`/impact/${editing.id}`, payload)).data
        : (await api.post('/impact', payload)).data;
    },
    successMessage: editing ? 'Chiffre clé mis à jour.' : 'Chiffre clé ajouté.',
    invalidate: [['admin', 'impact']],
    onSuccess: closeForm,
  });

  const togglePublish = useAdminMutation<ImpactStat>({
    mutationFn: async (stat) =>
      (await api.patch(`/impact/${stat.id}`, { isPublished: !stat.isPublished })).data,
    successMessage: 'Statut mis à jour.',
    invalidate: [['admin', 'impact']],
  });

  const deleteMutation = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/impact/${id}`)).data,
    successMessage: 'Chiffre clé supprimé.',
    invalidate: [['admin', 'impact']],
    onSuccess: () => setPendingDelete(null),
  });

  const columns: Array<Column<ImpactStat>> = [
    {
      key: 'value',
      header: 'Valeur',
      render: (stat) => (
        <span className="text-xl font-extrabold tabular-nums" style={{ color: stat.color }}>
          {stat.value.toLocaleString('fr-FR')}
        </span>
      ),
    },
    {
      key: 'label',
      header: 'Intitulé',
      render: (stat) => {
        const Icon = stat.icon ? resolveIcon(stat.icon) : null;
        return (
          <span className="inline-flex items-center gap-2 font-semibold text-navy">
            {Icon && (
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ backgroundColor: `${stat.color}1f`, color: stat.color }}
                aria-hidden
              >
                <Icon className="h-4 w-4" />
              </span>
            )}
            {t(stat.label)}
          </span>
        );
      },
    },
    {
      key: 'color',
      header: 'Couleur',
      render: (stat) => (
        <span className="inline-flex items-center gap-2">
          <span
            className="h-4 w-4 rounded-full ring-1 ring-navy/10"
            style={{ backgroundColor: stat.color }}
            aria-hidden
          />
          <span className="text-xs uppercase text-navy/50">{stat.color}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (stat) => (
        <Badge tone={stat.isPublished ? 'green' : 'neutral'}>
          {stat.isPublished ? 'Affiché' : 'Masqué'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Chiffres clés"
        description="Les indicateurs d'impact affichés sur la page d'accueil et la page « Impact »."
        actions={
          <>
            <PreviewButton path="/impact" />
            <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Ajouter un chiffre
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
          icon={BarChart3}
          title="Aucun chiffre clé"
          description="Ajoutez des indicateurs mesurables pour illustrer l'impact de votre association."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Ajouter un chiffre clé
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={listQuery.data}
          rowKey={(stat) => stat.id}
          mobileTitle={(stat) => t(stat.label)}
          actions={(stat) => (
            <>
              <IconButton
                label={stat.isPublished ? 'Masquer' : 'Afficher'}
                icon={stat.isPublished ? EyeOff : Eye}
                onClick={() => togglePublish.mutate(stat)}
                disabled={togglePublish.isPending}
              />
              <IconButton label="Modifier" icon={Edit2} onClick={() => openEdit(stat)} />
              <IconButton
                label="Supprimer"
                icon={Trash2}
                tone="danger"
                onClick={() => setPendingDelete(stat)}
              />
            </>
          )}
        />
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editing ? 'Modifier le chiffre clé' : 'Nouveau chiffre clé'}
        footer={
          <>
            <Button variant="outline" onClick={closeForm} disabled={saveMutation.isPending}>
              Annuler
            </Button>
            <Button form="impact-form" type="submit" isLoading={saveMutation.isPending}>
              {editing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </>
        }
      >
        <form
          id="impact-form"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          className="space-y-5"
        >
          <Field label="Intitulé" htmlFor="impact-label" required error={errors.label?.message}>
            <Input
              id="impact-label"
              placeholder="Kits scolaires distribués"
              aria-invalid={Boolean(errors.label)}
              {...register('label', {
                required: "L'intitulé est obligatoire",
                minLength: { value: 2, message: "L'intitulé est trop court" },
              })}
            />
          </Field>

          <Field label="Valeur" htmlFor="impact-value" required error={errors.value?.message}>
            <Input
              id="impact-value"
              type="number"
              min={0}
              step={1}
              aria-invalid={Boolean(errors.value)}
              {...register('value', {
                required: 'La valeur est obligatoire',
                valueAsNumber: true,
                min: { value: 0, message: 'La valeur doit être positive' },
              })}
            />
          </Field>

          <Field
            label="Pictogramme"
            htmlFor="impact-icon"
            hint="Affiché au-dessus du chiffre sur le site. Laissez vide pour n'afficher que le nombre."
          >
            <Select id="impact-icon" {...register('icon')}>
              <option value="">Aucun pictogramme</option>
              {IMPACT_ICON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Couleur" htmlFor="impact-color" hint="Utilisez une couleur de la charte.">
            <div className="flex flex-wrap gap-2">
              {BRAND_COLORS.map((color) => (
                <label
                  key={color.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    selectedColor === color.value
                      ? 'border-blue bg-blue/5 font-semibold text-navy'
                      : 'border-navy/15 text-navy/70 hover:border-navy/35'
                  }`}
                >
                  <input
                    type="radio"
                    value={color.value}
                    className="sr-only"
                    {...register('color', { required: true })}
                  />
                  <span
                    className="h-4 w-4 rounded-full ring-1 ring-navy/10"
                    style={{ backgroundColor: color.value }}
                    aria-hidden
                  />
                  {color.label}
                </label>
              ))}
            </div>
          </Field>

          <Checkbox
            id="impact-published"
            label="Afficher sur le site public"
            {...register('isPublished')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Supprimer ce chiffre clé ?"
        message={`« ${t(pendingDelete?.label, '')} » ne sera plus affiché sur le site.`}
        isLoading={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </div>
  );
};
