import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import api from '../../lib/api/axios';
import { PageHeader } from '../../components/admin/ui/PageHeader';
import { Pagination } from '../../components/admin/ui/Pagination';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import type { AuditLogEntry, Paginated } from '../../lib/types';

const ACTION_LABELS: Record<string, { label: string; tone: 'green' | 'blue' | 'red' | 'neutral' }> = {
  CREATE: { label: 'Création', tone: 'green' },
  UPDATE: { label: 'Modification', tone: 'blue' },
  DELETE: { label: 'Suppression', tone: 'red' },
  LOGIN: { label: 'Connexion', tone: 'neutral' },
  LOGOUT: { label: 'Déconnexion', tone: 'neutral' },
  LOGIN_FAILED: { label: 'Échec de connexion', tone: 'red' },
  PASSWORD_CHANGED: { label: 'Mot de passe modifié', tone: 'blue' },
};

const RESOURCE_LABELS: Record<string, string> = {
  News: 'Actualité',
  NewsCategory: 'Catégorie',
  Mission: "Domaine d'action",
  Partner: 'Partenaire',
  ImpactStatistic: 'Chiffre clé',
  GalleryAlbum: 'Album',
  Media: 'Média',
  Donation: 'Moyen de soutien',
  NavigationItem: 'Navigation',
  ContactMessage: 'Message',
  User: 'Compte',
};

export const AuditAdmin = () => {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');

  const listQuery = useQuery({
    queryKey: ['admin', 'audit', page, action, resource],
    queryFn: async () =>
      (
        await api.get<Paginated<AuditLogEntry>>('/audit', {
          params: {
            page,
            limit: 25,
            action: action || undefined,
            resource: resource || undefined,
          },
        })
      ).data,
  });

  return (
    <div>
      <PageHeader
        title="Journal d'activité"
        description="Toutes les actions effectuées dans l'administration, conservées pour traçabilité."
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <Select
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
          aria-label="Filtrer par action"
          className="sm:max-w-xs"
        >
          <option value="">Toutes les actions</option>
          {Object.entries(ACTION_LABELS).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </Select>

        <Select
          value={resource}
          onChange={(event) => {
            setResource(event.target.value);
            setPage(1);
          }}
          aria-label="Filtrer par type de contenu"
          className="sm:max-w-xs"
        >
          <option value="">Tous les contenus</option>
          {Object.entries(RESOURCE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {listQuery.isLoading ? (
        <LoadingState />
      ) : listQuery.isError ? (
        <ErrorState onRetry={() => void listQuery.refetch()} />
      ) : !listQuery.data?.data.length ? (
        <EmptyState
          icon={ShieldCheck}
          title="Aucune activité enregistrée"
          description="Les connexions et les modifications de contenu apparaîtront ici."
        />
      ) : (
        <>
          <ul className="divide-y divide-navy/8 overflow-hidden rounded-xl border border-navy/8 bg-white">
            {listQuery.data.data.map((entry) => {
              const meta = ACTION_LABELS[entry.action] ?? { label: entry.action, tone: 'neutral' as const };
              return (
                <li key={entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3.5 sm:px-5">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  <span className="text-sm font-medium text-navy">
                    {RESOURCE_LABELS[entry.resource] ?? entry.resource}
                  </span>
                  <span className="text-sm text-navy/55">
                    par{' '}
                    {entry.user
                      ? [entry.user.firstName, entry.user.lastName].filter(Boolean).join(' ') ||
                        entry.user.email
                      : 'un visiteur anonyme'}
                  </span>
                  <span className="ml-auto text-xs text-navy/40">
                    {new Date(entry.createdAt).toLocaleString('fr-FR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </li>
              );
            })}
          </ul>

          <Pagination
            page={listQuery.data.meta.page}
            totalPages={listQuery.data.meta.totalPages}
            total={listQuery.data.meta.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
};
