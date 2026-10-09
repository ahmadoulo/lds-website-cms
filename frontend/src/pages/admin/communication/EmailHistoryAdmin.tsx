import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Ban, Eye, History, RotateCw } from 'lucide-react';
import api from '../../../lib/api/axios';
import { useT } from '../../../lib/i18n/useT';
import { useAdminMutation } from '../../../lib/queries/adminHooks';
import { PageHeader } from '../../../components/admin/ui/PageHeader';
import { SearchInput } from '../../../components/admin/ui/SearchInput';
import { Pagination } from '../../../components/admin/ui/Pagination';
import { DataTable, IconButton, type Column } from '../../../components/admin/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Field, Input, Select } from '../../../components/ui/Field';
import {
  EmailPreview,
  EmailStatusBadge,
  useKindLabel,
} from '../../../components/admin/email/EmailParts';
import type {
  EmailMessageDetail,
  EmailMessageRow,
  EmailStatus,
  Paginated,
} from '../../../lib/types';

const STATUSES: EmailStatus[] = ['PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELLED'];

/**
 * Every email the site sent or tried to send.
 *
 * The filters live in the address, so the cockpit can link straight to "the
 * failures" and a filtered view survives a reload or can be sent to someone.
 */
export const EmailHistoryAdmin = () => {
  const t = useT();
  const h = t.admin.email.history;
  const kindLabel = useKindLabel();
  const [params, setParams] = useSearchParams();

  const page = Number(params.get('page') ?? '1') || 1;
  const status = params.get('status') ?? '';
  const kind = params.get('kind') ?? '';
  const search = params.get('q') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  // Set by a campaign's results: that campaign's copies only.
  const campaign = params.get('campaign') ?? '';

  const [openedId, setOpenedId] = useState<string | null>(null);
  const [pendingRetry, setPendingRetry] = useState<EmailMessageRow | null>(null);

  /** Any filter change goes back to the first page. */
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next, { replace: true });
  };

  const list = useQuery({
    queryKey: ['admin', 'email', 'messages', page, status, kind, search, from, to, campaign],
    queryFn: async () =>
      (
        await api.get<Paginated<EmailMessageRow>>('/email/messages', {
          params: {
            page,
            limit: 20,
            status: status || undefined,
            kind: kind || undefined,
            campaignId: campaign || undefined,
            search: search || undefined,
            // Whole days, in the administrator's own sense of "from" and "to".
            from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
            to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
          },
        })
      ).data,
    placeholderData: (previous) => previous,
  });

  const detail = useQuery({
    queryKey: ['admin', 'email', 'message', openedId],
    enabled: Boolean(openedId),
    queryFn: async () => (await api.get<EmailMessageDetail>(`/email/messages/${openedId}`)).data,
  });

  const retry = useAdminMutation<string>({
    mutationFn: async (id) => (await api.post(`/email/messages/${id}/retry`)).data,
    successMessage: h.retried,
    invalidate: [['admin', 'email']],
    onSuccess: () => setPendingRetry(null),
  });

  const cancel = useAdminMutation<string>({
    mutationFn: async (id) => (await api.post(`/email/messages/${id}/cancel`)).data,
    successMessage: h.cancelled,
    invalidate: [['admin', 'email']],
  });

  const filtered = Boolean(status || kind || search || from || to || campaign);

  const columns: Array<Column<EmailMessageRow>> = [
    {
      key: 'recipient',
      header: h.columnRecipient,
      render: (row) => (
        <span className="block max-w-[16rem] truncate font-medium text-navy" dir="ltr">
          {row.toEmail}
        </span>
      ),
    },
    {
      key: 'subject',
      header: h.columnSubject,
      render: (row) => (
        <span className="block max-w-[20rem] truncate text-navy/75" dir="auto">
          {row.subject}
        </span>
      ),
    },
    {
      key: 'kind',
      header: h.columnKind,
      render: (row) => <span className="text-navy/65">{kindLabel(row.kind)}</span>,
    },
    {
      key: 'status',
      header: h.columnStatus,
      render: (row) => (
        <span className="flex flex-col items-start gap-1">
          <EmailStatusBadge status={row.status} />
          {row.attempts > 1 && (
            <span className="text-xs text-navy/45">{h.attempts(row.attempts)}</span>
          )}
        </span>
      ),
    },
    {
      key: 'date',
      header: h.columnDate,
      align: 'right',
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-navy/50">
          {t.admin.common.formatDateTime(row.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={h.title} description={h.description} />

      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto] lg:items-end">
        <SearchInput
          value={search}
          onChange={(value) => setFilter('q', value)}
          placeholder={h.searchPlaceholder}
        />
        <Select
          aria-label={h.columnStatus}
          value={status}
          onChange={(event) => setFilter('status', event.target.value)}
        >
          <option value="">{h.allStatuses}</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {t.admin.email.status[value]}
            </option>
          ))}
        </Select>
        <Select
          aria-label={h.columnKind}
          value={kind}
          onChange={(event) => setFilter('kind', event.target.value)}
        >
          <option value="">{h.allKinds}</option>
          {/* Every kind the dictionary names, so a new kind of email appears
              in the filter the moment it has a label. */}
          {Object.keys(t.admin.email.kinds).map((value) => (
            <option key={value} value={value}>
              {kindLabel(value)}
            </option>
          ))}
        </Select>
        <Field label={h.from} htmlFor="history-from">
          <Input
            id="history-from"
            type="date"
            value={from}
            onChange={(event) => setFilter('from', event.target.value)}
          />
        </Field>
        <Field label={h.to} htmlFor="history-to">
          <Input
            id="history-to"
            type="date"
            value={to}
            onChange={(event) => setFilter('to', event.target.value)}
          />
        </Field>
      </div>

      {list.isLoading ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : !list.data?.data.length ? (
        <EmptyState
          icon={History}
          title={filtered ? t.admin.common.noResults : h.emptyTitle}
          description={filtered ? h.emptyFiltered : h.emptyDescription}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={list.data.data}
            rowKey={(row) => row.id}
            mobileTitle={(row) => (
              <span className="block truncate" dir="ltr">
                {row.toEmail}
              </span>
            )}
            actions={(row) => (
              <div className="flex items-center gap-1">
                <IconButton label={h.details} icon={Eye} onClick={() => setOpenedId(row.id)} />
                {(row.status === 'FAILED' || row.status === 'CANCELLED') && (
                  <IconButton label={h.retry} icon={RotateCw} onClick={() => setPendingRetry(row)} />
                )}
                {row.status === 'PENDING' && (
                  <IconButton
                    label={h.cancel}
                    icon={Ban}
                    tone="danger"
                    onClick={() => cancel.mutate(row.id)}
                    disabled={cancel.isPending}
                  />
                )}
              </div>
            )}
          />
          <Pagination
            page={list.data.meta.page}
            totalPages={list.data.meta.totalPages}
            total={list.data.meta.total}
            onPageChange={(next) => {
              const nextParams = new URLSearchParams(params);
              nextParams.set('page', String(next));
              setParams(nextParams);
            }}
          />
        </>
      )}

      <Modal
        isOpen={Boolean(openedId)}
        onClose={() => setOpenedId(null)}
        title={h.details}
        size="lg"
        footer={
          detail.data && (detail.data.status === 'FAILED' || detail.data.status === 'CANCELLED') ? (
            <Button variant="secondary" onClick={() => setPendingRetry(detail.data!)}>
              <RotateCw className="h-4 w-4" aria-hidden /> {h.retry}
            </Button>
          ) : undefined
        }
      >
        {detail.isLoading || !detail.data ? (
          <LoadingState />
        ) : (
          <div className="space-y-4">
            <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-navy/55">{h.columnStatus}</dt>
              <dd>
                <EmailStatusBadge status={detail.data.status} />{' '}
                <span className="text-xs text-navy/45">{h.attempts(detail.data.attempts)}</span>
              </dd>
              <dt className="text-navy/55">{h.columnKind}</dt>
              <dd>{kindLabel(detail.data.kind)}</dd>
              <dt className="text-navy/55">{h.columnRecipient}</dt>
              <dd dir="ltr" className="break-all text-start">
                {detail.data.toName ? `${detail.data.toName} <${detail.data.toEmail}>` : detail.data.toEmail}
              </dd>
              <dt className="text-navy/55">{h.sender}</dt>
              <dd dir="ltr" className="break-all text-start">
                {detail.data.fromName} &lt;{detail.data.fromEmail}&gt;
              </dd>
              {detail.data.replyTo && (
                <>
                  <dt className="text-navy/55">{h.replyTo}</dt>
                  <dd dir="ltr" className="break-all text-start">
                    {detail.data.replyTo}
                  </dd>
                </>
              )}
              <dt className="text-navy/55">{h.queuedAt}</dt>
              <dd>{t.admin.common.formatDateTime(detail.data.createdAt)}</dd>
              {detail.data.sentAt && (
                <>
                  <dt className="text-navy/55">{h.sentAt}</dt>
                  <dd>{t.admin.common.formatDateTime(detail.data.sentAt)}</dd>
                </>
              )}
              {detail.data.status === 'PENDING' && detail.data.attempts > 0 && (
                <>
                  <dt className="text-navy/55">{h.nextAttempt}</dt>
                  <dd>{t.admin.common.formatDateTime(detail.data.nextAttemptAt)}</dd>
                </>
              )}
            </dl>

            {detail.data.error && (
              <div className="rounded-lg bg-red-50 px-3 py-2.5">
                <p className="text-xs font-semibold text-red-700">{h.error}</p>
                <p className="mt-1 break-words text-sm text-red-700">{detail.data.error}</p>
              </div>
            )}

            {detail.data.contactMessageId && (
              <Link
                to="/admin/messages"
                className="inline-block text-sm font-semibold text-blue hover:underline"
              >
                {h.openContact}
              </Link>
            )}

            <p className="text-sm font-semibold text-navy" dir="auto">
              {detail.data.subject}
            </p>
            <EmailPreview html={detail.data.html} title={detail.data.subject} />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingRetry)}
        title={h.retryTitle}
        message={h.retryMessage}
        confirmLabel={h.retry}
        isLoading={retry.isPending}
        onCancel={() => setPendingRetry(null)}
        onConfirm={() => pendingRetry && retry.mutate(pendingRetry.id)}
      />
    </div>
  );
};

export default EmailHistoryAdmin;
