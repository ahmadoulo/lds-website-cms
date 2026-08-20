import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Edit2, Plus, ShieldOff, Users } from 'lucide-react';
import api from '../../lib/api/axios';
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

const ROLES = [
  { value: 'EDITOR', label: 'Éditeur', hint: 'Gère les actualités, domaines d’action et la galerie.' },
  { value: 'ADMIN', label: 'Administrateur', hint: 'Ajoute la configuration du site, les médias et les messages.' },
  { value: 'SUPER_ADMIN', label: 'Super administrateur', hint: 'Accès complet, y compris les comptes.' },
] as const;

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
    successMessage: editing ? 'Compte mis à jour.' : 'Compte créé.',
    invalidate: [['admin', 'users']],
    onSuccess: closeForm,
  });

  const deactivateMutation = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/users/${id}`)).data,
    successMessage: 'Compte désactivé.',
    invalidate: [['admin', 'users']],
    onSuccess: () => setPendingDeactivate(null),
  });

  const columns: Array<Column<AdminUser>> = [
    {
      key: 'name',
      header: 'Utilisateur',
      render: (user) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy">
            {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
            {user.id === currentUser?.id && (
              <span className="ml-2 text-xs font-medium text-navy/45">(vous)</span>
            )}
          </p>
          <p className="truncate text-xs text-navy/50">{user.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rôle',
      render: (user) => (
        <Badge tone={ROLE_TONES[user.role]}>
          {ROLES.find((role) => role.value === user.role)?.label ?? user.role}
        </Badge>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Dernière connexion',
      render: (user) => (
        <span className="text-navy/60">
          {user.lastLoginAt
            ? new Date(user.lastLoginAt).toLocaleDateString('fr-FR')
            : 'Jamais connecté'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (user) => (
        <Badge tone={user.isActive ? 'green' : 'red'}>{user.isActive ? 'Actif' : 'Désactivé'}</Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        description="Les comptes autorisés à administrer le site."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Créer un compte
          </Button>
        }
      />

      {listQuery.isLoading ? (
        <LoadingState />
      ) : listQuery.isError ? (
        <ErrorState onRetry={() => void listQuery.refetch()} />
      ) : !listQuery.data?.length ? (
        <EmptyState icon={Users} title="Aucun compte" />
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
              <IconButton label="Modifier" icon={Edit2} onClick={() => openEdit(user)} />
              <IconButton
                label="Désactiver"
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
        title={editing ? 'Modifier le compte' : 'Nouveau compte'}
        footer={
          <>
            <Button variant="outline" onClick={closeForm} disabled={saveMutation.isPending}>
              Annuler
            </Button>
            <Button form="user-form" type="submit" isLoading={saveMutation.isPending}>
              {editing ? 'Enregistrer' : 'Créer le compte'}
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
            <Field label="Prénom" htmlFor="user-first">
              <Input id="user-first" {...register('firstName')} />
            </Field>
            <Field label="Nom" htmlFor="user-last">
              <Input id="user-last" {...register('lastName')} />
            </Field>
          </div>

          <Field label="Adresse email" htmlFor="user-email" required error={errors.email?.message}>
            <Input
              id="user-email"
              type="email"
              autoComplete="off"
              aria-invalid={Boolean(errors.email)}
              {...register('email', {
                required: "L'adresse email est obligatoire",
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Adresse email invalide' },
              })}
            />
          </Field>

          <Field
            label={editing ? 'Nouveau mot de passe' : 'Mot de passe'}
            htmlFor="user-password"
            required={!editing}
            hint={
              editing
                ? "Laissez vide pour ne pas changer. Un nouveau mot de passe oblige l'utilisateur à le modifier à sa prochaine connexion."
                : "8 caractères minimum, avec au moins une lettre et un chiffre. L'utilisateur devra le changer à sa première connexion."
            }
            error={errors.password?.message}
          >
            <Input
              id="user-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              {...register('password', {
                required: editing ? false : 'Le mot de passe est obligatoire',
                validate: (value) => {
                  if (editing && !value) return true;
                  if (value.length < 8) return '8 caractères minimum';
                  if (!/[A-Za-z]/.test(value)) return 'Au moins une lettre est requise';
                  if (!/[0-9]/.test(value)) return 'Au moins un chiffre est requis';
                  return true;
                },
              })}
            />
          </Field>

          <Field
            label="Rôle"
            htmlFor="user-role"
            hint={ROLES.find((role) => role.value === selectedRole)?.hint}
          >
            <Select id="user-role" {...register('role')}>
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </Select>
          </Field>

          <Checkbox
            id="user-active"
            label="Compte actif"
            hint="Un compte inactif ne peut plus se connecter."
            disabled={editing?.id === currentUser?.id}
            {...register('isActive')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDeactivate)}
        title="Désactiver ce compte ?"
        message={`${pendingDeactivate?.email ?? ''} ne pourra plus se connecter. Le compte est conservé pour préserver l'historique des actions.`}
        confirmLabel="Désactiver"
        isLoading={deactivateMutation.isPending}
        onCancel={() => setPendingDeactivate(null)}
        onConfirm={() => pendingDeactivate && deactivateMutation.mutate(pendingDeactivate.id)}
      />
    </div>
  );
};
