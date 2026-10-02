import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Edit2, Plus, ShieldOff, Users } from 'lucide-react';
import api from '../../lib/api/axios';
import { useT } from '../../lib/i18n/useT';
import { useAdminMutation } from '../../lib/queries/adminHooks';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/admin/ui/PageHeader';
import { DataTable, IconButton, type Column } from '../../components/admin/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { Checkbox, Field, Input, Select } from '../../components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import type { AdminUser } from '../../lib/types';

interface FormValues {
  email: string;
  firstName: string;
  lastName: string;
  role: AdminUser['role'];
  password: string;
  isActive: boolean;
}

/** The order of the roles, least privileged first. Their words are translated. */
const ROLES = ['EDITOR', 'ADMIN', 'SUPER_ADMIN'] as const;

const ROLE_TONES: Record<AdminUser['role'], 'navy' | 'blue' | 'neutral'> = {
  SUPER_ADMIN: 'navy',
  ADMIN: 'blue',
  EDITOR: 'neutral',
};

const EMPTY_FORM: FormValues = {
  email: '',
  firstName: '',
  lastName: '',
  role: 'EDITOR',
  password: '',
  isActive: true,
};

export const UsersAdmin = () => {
  const t = useT();
  const { user: currentUser } = useAuth();
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDeactivate, setPendingDeactivate] = useState<AdminUser | null>(null);

  const listQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => (await api.get<AdminUser[]>('/users')).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: EMPTY_FORM });

  const selectedRole = watch('role');

  const ROLE_LABELS: Record<AdminUser['role'], string> = {
    EDITOR: t.admin.users.roleEditor,
    ADMIN: t.admin.users.roleAdmin,
    SUPER_ADMIN: t.admin.users.roleSuperAdmin,
  };

  const ROLE_HINTS: Record<AdminUser['role'], string> = {
    EDITOR: t.admin.users.roleEditorHint,
    ADMIN: t.admin.users.roleAdminHint,
    SUPER_ADMIN: t.admin.users.roleSuperAdminHint,
  };

  const openCreate = () => {
    setEditing(null);
    reset(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setEditing(user);
    reset({
      email: user.email,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      role: user.role,
      password: '',
      isActive: user.isActive,
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
      if (editing) {
        const payload: Record<string, unknown> = {
          email: values.email,
          firstName: values.firstName || undefined,
          lastName: values.lastName || undefined,
          role: values.role,
          isActive: values.isActive,
        };
        // An empty password field means "leave the password alone".
        if (values.password) payload.password = values.password;
        return (await api.patch(`/users/${editing.id}`, payload)).data;
      }

      return (
        await api.post('/users', {
          email: values.email,
          password: values.password,
          firstName: values.firstName || undefined,
          lastName: values.lastName || undefined,
          role: values.role,
          isActive: values.isActive,
        })
      ).data;
    },
    successMessage: editing ? t.admin.users.updated : t.admin.users.created,
    invalidate: [['admin', 'users']],
    onSuccess: closeForm,
  });

  const deactivateMutation = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/users/${id}`)).data,
    successMessage: t.admin.users.deactivated,
    invalidate: [['admin', 'users']],
    onSuccess: () => setPendingDeactivate(null),
  });

  const columns: Array<Column<AdminUser>> = [
    {
      key: 'name',
      header: t.admin.users.columnUser,
      render: (user) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy">
            {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
            {user.id === currentUser?.id && (
              <span className="ms-2 text-xs font-medium text-navy/45">{t.admin.users.you}</span>
            )}
          </p>
          <p className="truncate text-xs text-navy/50">{user.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: t.admin.users.columnRole,
      render: (user) => (
        <Badge tone={ROLE_TONES[user.role]}>{ROLE_LABELS[user.role] ?? user.role}</Badge>
      ),
    },
    {
      key: 'lastLogin',
      header: t.admin.users.columnLastLogin,
      render: (user) => (
        <span className="text-navy/60">
          {user.lastLoginAt
            ? t.admin.common.formatDate(user.lastLoginAt)
            : t.admin.users.neverConnected}
        </span>
      ),
    },
    {
      key: 'status',
      header: t.admin.common.status,
      render: (user) => (
        <Badge tone={user.isActive ? 'green' : 'red'}>
          {user.isActive ? t.admin.users.active : t.admin.users.inactive}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t.admin.users.title}
        description={t.admin.users.description}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> {t.admin.users.createButton}
          </Button>
        }
      />

      {listQuery.isLoading ? (
        <LoadingState />
      ) : listQuery.isError ? (
        <ErrorState onRetry={() => void listQuery.refetch()} />
      ) : !listQuery.data?.length ? (
        <EmptyState icon={Users} title={t.admin.users.emptyTitle} />
      ) : (
        <DataTable
          columns={columns}
          rows={listQuery.data}
          rowKey={(user) => user.id}
          mobileTitle={(user) =>
            [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
          }
          actions={(user) => (
            <>
              <IconButton label={t.common.edit} icon={Edit2} onClick={() => openEdit(user)} />
              <IconButton
                label={t.admin.users.deactivate}
                icon={ShieldOff}
                tone="danger"
                disabled={!user.isActive || user.id === currentUser?.id}
                onClick={() => setPendingDeactivate(user)}
              />
            </>
          )}
        />
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editing ? t.admin.users.editTitle : t.admin.users.createTitle}
        footer={
          <>
            <Button variant="outline" onClick={closeForm} disabled={saveMutation.isPending}>
              {t.common.cancel}
            </Button>
            <Button form="user-form" type="submit" isLoading={saveMutation.isPending}>
              {editing ? t.common.save : t.admin.users.createSubmit}
            </Button>
          </>
        }
      >
        <form
          id="user-form"
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          className="space-y-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t.admin.users.firstName} htmlFor="user-first">
              <Input id="user-first" {...register('firstName')} />
            </Field>
            <Field label={t.admin.users.lastName} htmlFor="user-last">
              <Input id="user-last" {...register('lastName')} />
            </Field>
          </div>

          <Field
            label={t.admin.common.emailLabel}
            htmlFor="user-email"
            required
            error={errors.email?.message}
          >
            <Input
              id="user-email"
              type="email"
              autoComplete="off"
              aria-invalid={Boolean(errors.email)}
              {...register('email', {
                required: t.admin.common.emailRequired,
                pattern: { value: /^\S+@\S+\.\S+$/, message: t.admin.common.emailInvalid },
              })}
            />
          </Field>

          <Field
            label={editing ? t.admin.users.newPasswordLabel : t.admin.users.passwordLabel}
            htmlFor="user-password"
            required={!editing}
            hint={
              editing ? t.admin.users.passwordHintEdit : t.admin.users.passwordHintCreate
            }
            error={errors.password?.message}
          >
            <Input
              id="user-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              {...register('password', {
                required: editing ? false : t.admin.users.passwordRequired,
                validate: (value) => {
                  if (editing && !value) return true;
                  if (value.length < 8) return t.admin.users.minLength;
                  if (!/[A-Za-z]/.test(value)) return t.admin.users.needsLetter;
                  if (!/[0-9]/.test(value)) return t.admin.users.needsDigit;
                  return true;
                },
              })}
            />
          </Field>

          <Field
            label={t.admin.users.roleLabel}
            htmlFor="user-role"
            hint={ROLE_HINTS[selectedRole]}
          >
            <Select id="user-role" {...register('role')}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
          </Field>

          <Checkbox
            id="user-active"
            label={t.admin.users.activeCheckbox}
            hint={t.admin.users.activeHint}
            disabled={editing?.id === currentUser?.id}
            {...register('isActive')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDeactivate)}
        title={t.admin.users.deactivateTitle}
        message={t.admin.users.deactivateMessage(pendingDeactivate?.email ?? '')}
        confirmLabel={t.admin.users.deactivate}
        isLoading={deactivateMutation.isPending}
        onCancel={() => setPendingDeactivate(null)}
        onConfirm={() => pendingDeactivate && deactivateMutation.mutate(pendingDeactivate.id)}
      />
    </div>
  );
};
