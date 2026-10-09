import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import api from '../../lib/api/axios';
import { useT } from '../../lib/i18n/useT';
import { PageHeader } from '../../components/admin/ui/PageHeader';
import { Pagination } from '../../components/admin/ui/Pagination';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Field';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import type { AuditLogEntry, Paginated } from '../../lib/types';

/**
 * Only the colour of each action stays here. The words live in the dictionary,
 * and the order of this record is still what fills the filter dropdown.
 */
const ACTION_TONES: Record<string, 'green' | 'blue' | 'red' | 'neutral'> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
  LOGIN: 'neutral',
  LOGOUT: 'neutral',
  LOGIN_FAILED: 'red',
  PASSWORD_CHANGED: 'blue',
  // Personal data leaving the system is worth noticing in the log.
  EXPORT: 'red',
};

const RESOURCE_KEYS = [
  'News',
  'NewsCategory',
  'Mission',
  'Partner',
  'ImpactStatistic',
  'GalleryAlbum',
  'Media',
  'Donation',
  'NavigationItem',
  'ContactMessage',
  'User',
] as const;

export const AuditAdmin = () => {
  const t = useT();
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

  // The API sends whatever it has logged, including a type this build does not
  // know about yet, so an unknown key falls back to the raw value.
  const actionLabel = (key: string) =>
    (t.admin.audit.actions as Record<string, string>)[key] ?? key;
  const resourceLabel = (key: string) =>
    (t.admin.audit.resources as Record<string, string>)[key] ?? key;

  return (
    <div>
      <PageHeader title={t.admin.audit.title} description={t.admin.audit.description} />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <Select
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
          aria-label={t.admin.audit.filterAction}
          className="sm:max-w-xs"
        >
          <option value="">{t.admin.audit.allActions}</option>
          {Object.keys(ACTION_TONES).map((value) => (
            <option key={value} value={value}>
              {actionLabel(value)}
            </option>
          ))}
        </Select>

        <Select
          value={resource}
          onChange={(event) => {
            setResource(event.target.value);
            setPage(1);
          }}
          aria-label={t.admin.audit.filterResource}
          className="sm:max-w-xs"
        >
          <option value="">{t.admin.audit.allResources}</option>
          {RESOURCE_KEYS.map((value) => (
            <option key={value} value={value}>
              {resourceLabel(value)}
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
          title={t.admin.audit.emptyTitle}
          description={t.admin.audit.emptyDescription}
        />
      ) : (
        <>
          <ul className="divide-y divide-navy/8 overflow-hidden rounded-xl border border-navy/8 bg-white">
            {listQuery.data.data.map((entry) => {
              const who = entry.user
                ? [entry.user.firstName, entry.user.lastName].filter(Boolean).join(' ') ||
                  entry.user.email
                : t.admin.audit.anonymous;
              return (
                <li key={entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3.5 sm:px-5">
                  <Badge tone={ACTION_TONES[entry.action] ?? 'neutral'}>
                    {actionLabel(entry.action)}
                  </Badge>
                  <span className="text-sm font-medium text-navy">
                    {resourceLabel(entry.resource)}
                  </span>
                  <span className="text-sm text-navy/55">{t.admin.audit.by(who)}</span>
                  <span className="ms-auto text-xs text-navy/40">
                    {t.admin.common.formatDateTime(entry.createdAt)}
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
