import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Edit2, Eye, EyeOff, HeartHandshake, Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api/axios';
import { useLocale } from '../../context/LocaleContext';
import { useT } from '../../lib/i18n/useT';
import { localized, localizedOrSource } from '../../lib/i18n/resolve';
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
import type { DonationMethod } from '../../lib/types';

interface FormValues {
  title: string;
  description: string;
  actionType: DonationMethod['actionType'];
  actionData: string;
  actionLabel: string;
  iconColor: DonationMethod['iconColor'];
  isPublished: boolean;
  provider: string;
  beneficiary: string;
  paymentLink: string;
}

/**
 * The example value stays next to the action type it illustrates - a phone
 * number and a path are not translated. The labels come from the dictionary.
 */
const ACTION_TYPES = [
  { value: 'phone', hint: '+221 77 000 00 00' },
  { value: 'link', hint: '/contact' },
  { value: 'email', hint: 'contact@exemple.org' },
  { value: 'contact', hint: '/contact' },
] as const;

const COLORS = ['orange', 'blue', 'green', 'navy'] as const;

/** Wave and Orange Money are proper nouns and read the same in both languages. */
const PROVIDERS = ['', 'wave', 'orange_money', 'bank', 'cash', 'other'] as const;

const EMPTY_FORM: FormValues = {
  title: '',
  description: '',
  actionType: 'phone',
  actionData: '',
  actionLabel: '',
  iconColor: 'orange',
  isPublished: true,
  provider: '',
  beneficiary: '',
  paymentLink: '',
};

export const DonationsAdmin = () => {
  const t = useT();
  const { locale } = useLocale();
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
  const provider = watch('provider');
  const isPaymentProvider = provider === 'wave' || provider === 'orange_money' || provider === 'bank';
  const actionHint = ACTION_TYPES.find((type) => type.value === actionType)?.hint;

  /** What a row shows: the language on screen, falling back to the French source. */
  const text = (value: Parameters<typeof localizedOrSource>[0]) =>
    localizedOrSource(value, locale).text;

  const ACTION_TYPE_LABELS: Record<(typeof ACTION_TYPES)[number]['value'], string> = {
    phone: t.admin.donations.typePhone,
    link: t.admin.donations.typeLink,
    email: t.admin.donations.typeEmail,
    contact: t.admin.donations.typeContact,
  };

  const COLOR_LABELS: Record<(typeof COLORS)[number], string> = {
    orange: t.admin.donations.colorOrange,
    blue: t.admin.donations.colorBlue,
    green: t.admin.donations.colorGreen,
    navy: t.admin.donations.colorNavy,
  };

  const PROVIDER_LABELS: Record<(typeof PROVIDERS)[number], string> = {
    '': t.admin.donations.providerNone,
    wave: 'Wave',
    orange_money: 'Orange Money',
    bank: t.admin.donations.providerBank,
    cash: t.admin.donations.providerCash,
    other: t.admin.donations.providerOther,
  };

  const openCreate = () => {
    setEditing(null);
    reset(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEdit = (method: DonationMethod) => {
    setEditing(method);
    reset({
      // The form writes the French source; the language of the interface has no
      // say over which version of the text is being edited.
      title: localized(method.title, 'fr'),
      description: localized(method.description, 'fr'),
      actionType: method.actionType,
      actionData: method.actionData,
      actionLabel: localized(method.actionLabel, 'fr'),
      iconColor: method.iconColor,
      isPublished: method.isPublished,
      provider: method.provider ?? '',
      beneficiary: method.beneficiary ?? '',
      paymentLink: method.paymentLink ?? '',
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
        // Empty means "not a payment provider"; null keeps the column clean.
        provider: values.provider || null,
        beneficiary: values.beneficiary.trim() || null,
        paymentLink: values.paymentLink.trim() || null,
      };

      return editing
        ? (await api.patch(`/donations/${editing.id}`, payload)).data
        : (await api.post('/donations', payload)).data;
    },
    successMessage: editing ? t.admin.donations.updated : t.admin.donations.created,
    invalidate: [['admin', 'donations']],
    onSuccess: closeForm,
  });

  const togglePublish = useAdminMutation<DonationMethod>({
    mutationFn: async (method) =>
      (await api.patch(`/donations/${method.id}`, { isPublished: !method.isPublished })).data,
    successMessage: t.admin.common.statusUpdated,
    invalidate: [['admin', 'donations']],
  });

  const deleteMutation = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/donations/${id}`)).data,
    successMessage: t.admin.donations.deleted,
    invalidate: [['admin', 'donations']],
    onSuccess: () => setPendingDelete(null),
  });

  const columns: Array<Column<DonationMethod>> = [
    {
      key: 'title',
      header: t.admin.donations.columnTitle,
      render: (method) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy">{text(method.title)}</p>
          <p className="line-clamp-1 text-xs text-navy/50">{text(method.description)}</p>
        </div>
      ),
    },
    {
      key: 'action',
      header: t.admin.donations.columnAction,
      render: (method) => (
        <span className="text-navy/70">
          {ACTION_TYPE_LABELS[method.actionType] ?? method.actionType}
          {' · '}
          <span className="text-navy/50">{method.actionData}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: t.admin.common.status,
      render: (method) => (
        <Badge tone={method.isPublished ? 'green' : 'neutral'}>
          {method.isPublished ? t.admin.common.visible : t.admin.common.hidden}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t.admin.donations.title}
        description={t.admin.donations.description}
        actions={
          <>
            <PreviewButton path="/nous-soutenir" label={t.admin.common.preview} />
            <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> {t.admin.donations.addButton}
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
          title={t.admin.donations.emptyTitle}
          description={t.admin.donations.emptyDescription}
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t.admin.donations.emptyAction}
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          rows={listQuery.data}
          rowKey={(method) => method.id}
          mobileTitle={(method) => text(method.title)}
          actions={(method) => (
            <>
              <IconButton
                label={method.isPublished ? t.admin.common.hide : t.admin.common.show}
                icon={method.isPublished ? EyeOff : Eye}
                onClick={() => togglePublish.mutate(method)}
                disabled={togglePublish.isPending}
              />
              <IconButton label={t.common.edit} icon={Edit2} onClick={() => openEdit(method)} />
              <IconButton
                label={t.common.delete}
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
        title={editing ? t.admin.donations.editTitle : t.admin.donations.createTitle}
        footer={
          <>
            <Button variant="outline" onClick={closeForm} disabled={saveMutation.isPending}>
              {t.common.cancel}
            </Button>
            <Button form="donation-form" type="submit" isLoading={saveMutation.isPending}>
              {editing ? t.common.save : t.admin.common.add}
            </Button>
          </>
        }
      >
        <form
          id="donation-form"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          className="space-y-5"
        >
          <Field
            label={t.admin.donations.titleLabel}
            htmlFor="donation-title"
            required
            error={errors.title?.message}
          >
            <Input
              id="donation-title"
              placeholder={t.admin.donations.titlePlaceholder}
              aria-invalid={Boolean(errors.title)}
              {...register('title', { required: t.admin.donations.titleRequired })}
            />
          </Field>

          <Field
            label={t.admin.donations.descriptionLabel}
            htmlFor="donation-description"
            required
            error={errors.description?.message}
          >
            <Textarea
              id="donation-description"
              rows={3}
              aria-invalid={Boolean(errors.description)}
              {...register('description', { required: t.admin.donations.descriptionRequired })}
            />
          </Field>

          <Field label={t.admin.donations.typeLabel} htmlFor="donation-type">
            <Select id="donation-type" {...register('actionType')}>
              {ACTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {ACTION_TYPE_LABELS[type.value]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label={t.admin.donations.dataLabel}
            htmlFor="donation-data"
            required
            hint={actionHint ? t.admin.donations.dataExample(actionHint) : undefined}
            error={errors.actionData?.message}
          >
            <Input
              id="donation-data"
              aria-invalid={Boolean(errors.actionData)}
              {...register('actionData', { required: t.admin.donations.dataRequired })}
            />
          </Field>

          <Field
            label={t.admin.donations.buttonLabel}
            htmlFor="donation-label"
            required
            error={errors.actionLabel?.message}
          >
            <Input
              id="donation-label"
              placeholder={t.admin.donations.buttonLabelPlaceholder}
              aria-invalid={Boolean(errors.actionLabel)}
              {...register('actionLabel', { required: t.admin.donations.buttonLabelRequired })}
            />
          </Field>

          <Field
            label={t.admin.donations.providerLabel}
            htmlFor="donation-provider"
            hint={t.admin.donations.providerHint}
          >
            <Select id="donation-provider" {...register('provider')}>
              {PROVIDERS.map((value) => (
                <option key={value} value={value}>
                  {PROVIDER_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>

          {isPaymentProvider && (
            <>
              <Field
                label={t.admin.donations.beneficiaryLabel}
                htmlFor="donation-beneficiary"
                hint={t.admin.donations.beneficiaryHint}
              >
                <Input
                  id="donation-beneficiary"
                  placeholder={t.common.organizationName}
                  {...register('beneficiary')}
                />
              </Field>

              <Field
                label={t.admin.donations.paymentLinkLabel}
                htmlFor="donation-link"
                hint={t.admin.donations.paymentLinkHint}
                error={errors.paymentLink?.message}
              >
                <Input
                  id="donation-link"
                  type="url"
                  placeholder="https://..."
                  aria-invalid={Boolean(errors.paymentLink)}
                  {...register('paymentLink', {
                    pattern: {
                      value: /^(https?:\/\/\S+)?$/,
                      message: t.admin.donations.paymentLinkPattern,
                    },
                  })}
                />
              </Field>
            </>
          )}

          <Field label={t.admin.donations.colorLabel} htmlFor="donation-color">
            <Select id="donation-color" {...register('iconColor')}>
              {COLORS.map((color) => (
                <option key={color} value={color}>
                  {COLOR_LABELS[color]}
                </option>
              ))}
            </Select>
          </Field>

          <Checkbox
            id="donation-published"
            label={t.admin.common.showOnSite}
            {...register('isPublished')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title={t.admin.donations.deleteTitle}
        message={t.admin.donations.deleteMessage(text(pendingDelete?.title))}
        isLoading={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </div>
  );
};
