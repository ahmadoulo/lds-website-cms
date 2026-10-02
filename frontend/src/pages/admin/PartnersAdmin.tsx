import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Edit2,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  Trash2,
} from 'lucide-react';
import api from '../../lib/api/axios';
import { useT } from '../../lib/i18n/useT';
import { useAdminMutation } from '../../lib/queries/adminHooks';
import { PARTNER_ICON_OPTIONS, resolveIcon } from '../../lib/icons';
import { PageHeader } from '../../components/admin/ui/PageHeader';
import { PreviewButton } from '../../components/admin/ui/PreviewButton';
import { DataTable, IconButton, type Column } from '../../components/admin/ui/DataTable';
import { MediaPicker } from '../../components/admin/ui/MediaPicker';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { Checkbox, Field, Input, Select } from '../../components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { commitImage, type ImageSelection } from '../../lib/pendingImage';
import type { Partner } from '../../lib/types';

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
  const t = useT();
  const [editing, setEditing] = useState<Partner | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Partner | null>(null);
  const [logo, setLogo] = useState<ImageSelection>(null);

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
      // The picked file reaches MinIO here, when the administrator commits.
      const uploaded = await commitImage(logo, 'partners');

      const payload = {
        name: values.name,
        // null (not undefined) so an existing link can actually be cleared;
        // undefined would be dropped from the JSON body and leave it unchanged.
        url: values.url.trim() || null,
        icon: values.icon,
        logoId: uploaded?.id ?? null,
        isPublished: values.isPublished,
      };

      return editing
        ? (await api.patch(`/partners/${editing.id}`, payload)).data
        : (await api.post('/partners', payload)).data;
    },
    successMessage: editing ? t.admin.partners.updated : t.admin.partners.created,
    invalidate: [['admin', 'partners']],
    onSuccess: closeForm,
  });

  const togglePublish = useAdminMutation<Partner>({
    mutationFn: async (partner) =>
      (await api.patch(`/partners/${partner.id}`, { isPublished: !partner.isPublished })).data,
    successMessage: t.admin.common.statusUpdated,
    invalidate: [['admin', 'partners']],
  });

  // PATCH /partners/reorder existed already; only the buttons were missing.
  const reorderMutation = useAdminMutation<string[]>({
    mutationFn: async (ids) => (await api.patch('/partners/reorder', { ids })).data,
    successMessage: t.admin.partners.reordered,
    invalidate: [['admin', 'partners']],
  });

  /** Swaps a partner with its neighbour and persists the whole order. */
  const move = (index: number, direction: -1 | 1) => {
    const items = listQuery.data;
    if (!items) return;

    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    const ids = items.map((item) => item.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderMutation.mutate(ids);
  };

  const deleteMutation = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/partners/${id}`)).data,
    successMessage: t.admin.partners.deleted,
    invalidate: [['admin', 'partners']],
    onSuccess: () => setPendingDelete(null),
  });

  const columns: Array<Column<Partner>> = [
    {
      key: 'logo',
      header: t.admin.partners.columnLogo,
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
      header: t.admin.partners.columnName,
      render: (partner) => <span className="font-semibold text-navy">{partner.name}</span>,
    },
    {
      key: 'url',
      header: t.admin.partners.columnWebsite,
      render: (partner) =>
        partner.url ? (
          <a
            href={partner.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-blue hover:underline"
          >
            {t.admin.partners.visit} <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-navy/40">—</span>
        ),
    },
    {
      key: 'status',
      header: t.admin.common.status,
      render: (partner) => (
        <Badge tone={partner.isPublished ? 'green' : 'neutral'}>
          {partner.isPublished ? t.admin.common.visible : t.admin.common.hidden}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t.admin.partners.title}
        description={t.admin.partners.description}
        actions={
          <>
            <PreviewButton path="/partenaires" label={t.admin.common.preview} />
            <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> {t.admin.partners.addButton}
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
          icon={Building2}
          title={t.admin.partners.emptyTitle}
          description={t.admin.partners.emptyDescription}
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t.admin.partners.addButton}
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
                label={t.admin.common.moveUp}
                icon={ArrowUp}
                disabled={
                  listQuery.data.indexOf(partner) === 0 || reorderMutation.isPending
                }
                onClick={() => move(listQuery.data!.indexOf(partner), -1)}
              />
              <IconButton
                label={t.admin.common.moveDown}
                icon={ArrowDown}
                disabled={
                  listQuery.data.indexOf(partner) === listQuery.data.length - 1 ||
                  reorderMutation.isPending
                }
                onClick={() => move(listQuery.data!.indexOf(partner), 1)}
              />
              <IconButton
                label={partner.isPublished ? t.admin.common.hide : t.admin.common.show}
                icon={partner.isPublished ? EyeOff : Eye}
                onClick={() => togglePublish.mutate(partner)}
                disabled={togglePublish.isPending}
              />
              <IconButton label={t.common.edit} icon={Edit2} onClick={() => openEdit(partner)} />
              <IconButton
                label={t.common.delete}
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
        title={editing ? t.admin.partners.editTitle : t.admin.partners.createTitle}
        footer={
          <>
            <Button variant="outline" onClick={closeForm} disabled={saveMutation.isPending}>
              {t.common.cancel}
            </Button>
            <Button form="partner-form" type="submit" isLoading={saveMutation.isPending}>
              {editing ? t.common.save : t.admin.common.add}
            </Button>
          </>
        }
      >
        <form
          id="partner-form"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          className="space-y-5"
        >
          <Field
            label={t.admin.partners.nameLabel}
            htmlFor="partner-name"
            required
            error={errors.name?.message}
          >
            <Input
              id="partner-name"
              aria-invalid={Boolean(errors.name)}
              {...register('name', {
                required: t.admin.partners.nameRequired,
                minLength: { value: 2, message: t.admin.partners.nameTooShort },
              })}
            />
          </Field>

          <Field
            label={t.admin.partners.urlLabel}
            htmlFor="partner-url"
            hint={t.admin.partners.urlHint}
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
                  message: t.admin.partners.urlPattern,
                },
              })}
            />
          </Field>

          <Field
            label={t.admin.partners.iconLabel}
            htmlFor="partner-icon"
            hint={t.admin.partners.iconHint}
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
            slot="partnerLogo"
            label={t.admin.partners.logoLabel}
          />

          <Checkbox
            id="partner-published"
            label={t.admin.common.showOnSite}
            {...register('isPublished')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title={t.admin.partners.deleteTitle}
        message={t.admin.partners.deleteMessage(pendingDelete?.name ?? '')}
        isLoading={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </div>
  );
};
