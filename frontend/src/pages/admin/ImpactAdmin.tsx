import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { BarChart3, Edit2, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api/axios';
import { useLocale } from '../../context/LocaleContext';
import { useT } from '../../lib/i18n/useT';
import { localizedOrSource } from '../../lib/i18n/resolve';
import { IMPACT_ICON_OPTIONS, resolveIcon } from '../../lib/icons';
import { useAdminMutation } from '../../lib/queries/adminHooks';
import { PageHeader } from '../../components/admin/ui/PageHeader';
import { LocalizedFormField } from '../../components/i18n/LocalizedFormField';
import { TranslationStatus } from '../../components/i18n/TranslationStatus';
import { cleanLocalized, type LocalizedValue } from '../../components/i18n/LocalizedField';
import { PreviewButton } from '../../components/admin/ui/PreviewButton';
import { DataTable, IconButton, type Column } from '../../components/admin/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { Checkbox, Field, Input, Select } from '../../components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import type { ImpactStat } from '../../lib/types';

interface FormValues {
  /* Only the wording is linguistic: the figure, its colour, its pictogram
     and its order are the same in both languages. */
  label: LocalizedValue;
  value: number;
  color: string;
  icon: string;
  isPublished: boolean;
}

/** The charte's four colours. Their names come from the dictionary. */
const BRAND_COLORS = ['#87CE18', '#00A4DE', '#EE7900', '#172642'] as const;

const EMPTY_FORM: FormValues = {
  label: {},
  value: 0,
  color: BRAND_COLORS[0],
  icon: '',
  isPublished: true,
};

export const ImpactAdmin = () => {
  const t = useT();
  const { locale } = useLocale();
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
  control,
  } = useForm<FormValues>({ defaultValues: EMPTY_FORM });

  const selectedColor = watch('color');

  const text = (value: Parameters<typeof localizedOrSource>[0]) =>
    localizedOrSource(value, locale).text;

  const COLOR_LABELS: Record<(typeof BRAND_COLORS)[number], string> = {
    '#87CE18': t.admin.impact.colorGreen,
    '#00A4DE': t.admin.impact.colorBlue,
    '#EE7900': t.admin.impact.colorOrange,
    '#172642': t.admin.impact.colorNavy,
  };

  const openCreate = () => {
    setEditing(null);
    reset(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEdit = (stat: ImpactStat) => {
    setEditing(stat);
    reset({
      // The form writes the French source, whatever language the screen is in.
      label: stat.label ?? {},
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
        label: cleanLocalized(values.label),
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
    successMessage: editing ? t.admin.impact.updated : t.admin.impact.created,
    invalidate: [['admin', 'impact']],
    onSuccess: closeForm,
  });

  const togglePublish = useAdminMutation<ImpactStat>({
    mutationFn: async (stat) =>
      (await api.patch(`/impact/${stat.id}`, { isPublished: !stat.isPublished })).data,
    successMessage: t.admin.common.statusUpdated,
    invalidate: [['admin', 'impact']],
  });

  const deleteMutation = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/impact/${id}`)).data,
    successMessage: t.admin.impact.deleted,
    invalidate: [['admin', 'impact']],
    onSuccess: () => setPendingDelete(null),
  });

  const columns: Array<Column<ImpactStat>> = [
    {
      key: 'value',
      header: t.admin.impact.columnValue,
      render: (stat) => (
        <span className="text-xl font-extrabold tabular-nums" style={{ color: stat.color }}>
          {t.admin.common.formatNumber(stat.value)}
        </span>
      ),
    },
    {
      key: 'label',
      header: t.admin.impact.columnLabel,
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
            {text(stat.label)}
            <TranslationStatus fields={[stat.label]} />
          </span>
        );
      },
    },
    {
      key: 'color',
      header: t.admin.impact.columnColor,
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
      header: t.admin.common.status,
      render: (stat) => (
        <Badge tone={stat.isPublished ? 'green' : 'neutral'}>
          {stat.isPublished ? t.admin.common.visible : t.admin.common.hidden}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t.admin.impact.title}
        description={t.admin.impact.description}
        actions={
          <>
            <PreviewButton path="/impact" label={t.admin.common.preview} />
            <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> {t.admin.impact.addButton}
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
          title={t.admin.impact.emptyTitle}
          description={t.admin.impact.emptyDescription}
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t.admin.impact.emptyAction}
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={listQuery.data}
          rowKey={(stat) => stat.id}
          mobileTitle={(stat) => text(stat.label)}
          actions={(stat) => (
            <>
              <IconButton
                label={stat.isPublished ? t.admin.common.hide : t.admin.common.show}
                icon={stat.isPublished ? EyeOff : Eye}
                onClick={() => togglePublish.mutate(stat)}
                disabled={togglePublish.isPending}
              />
              <IconButton label={t.common.edit} icon={Edit2} onClick={() => openEdit(stat)} />
              <IconButton
                label={t.common.delete}
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
        title={editing ? t.admin.impact.editTitle : t.admin.impact.createTitle}
        footer={
          <>
            <Button variant="outline" onClick={closeForm} disabled={saveMutation.isPending}>
              {t.common.cancel}
            </Button>
            <Button form="impact-form" type="submit" isLoading={saveMutation.isPending}>
              {editing ? t.common.save : t.admin.common.add}
            </Button>
          </>
        }
      >
        <form
          id="impact-form"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          className="space-y-5"
        >
          <LocalizedFormField
            control={control}
            name="label"
            id="impact-label"
            label={t.admin.impact.labelLabel}
            placeholder={t.admin.impact.labelPlaceholder}
            maxLength={160}
            required
          />

          <Field
            label={t.admin.impact.valueLabel}
            htmlFor="impact-value"
            required
            error={errors.value?.message}
          >
            <Input
              id="impact-value"
              type="number"
              min={0}
              step={1}
              aria-invalid={Boolean(errors.value)}
              {...register('value', {
                required: t.admin.impact.valueRequired,
                valueAsNumber: true,
                min: { value: 0, message: t.admin.impact.valuePositive },
              })}
            />
          </Field>

          <Field
            label={t.admin.impact.iconLabel}
            htmlFor="impact-icon"
            hint={t.admin.impact.iconHint}
          >
            <Select id="impact-icon" {...register('icon')}>
              <option value="">{t.admin.impact.iconNone}</option>
              {IMPACT_ICON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {/* The pictogram is the same in both languages; only its
                      name is translated. The French label is the fallback so
                      a newly added icon is never a blank line. */}
                  {t.iconLabels.impact[option.value] ?? option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label={t.admin.impact.colorLabel}
            htmlFor="impact-color"
            hint={t.admin.impact.colorHint}
          >
            <div className="flex flex-wrap gap-2">
              {BRAND_COLORS.map((color) => (
                <label
                  key={color}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    selectedColor === color
                      ? 'border-blue bg-blue/5 font-semibold text-navy'
                      : 'border-navy/15 text-navy/70 hover:border-navy/35'
                  }`}
                >
                  <input
                    type="radio"
                    value={color}
                    className="sr-only"
                    {...register('color', { required: true })}
                  />
                  <span
                    className="h-4 w-4 rounded-full ring-1 ring-navy/10"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  {COLOR_LABELS[color]}
                </label>
              ))}
            </div>
          </Field>

          <Checkbox
            id="impact-published"
            label={t.admin.common.showOnSite}
            {...register('isPublished')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title={t.admin.impact.deleteTitle}
        message={t.admin.impact.deleteMessage(text(pendingDelete?.label))}
        isLoading={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </div>
  );
};
