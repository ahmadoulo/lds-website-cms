import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, Trash2, Upload, UserMinus, Users } from 'lucide-react';
import api from '../../../lib/api/axios';
import { useT } from '../../../lib/i18n/useT';
import { useAuth } from '../../../context/AuthContext';
import { useLocale } from '../../../context/LocaleContext';
import { useAdminMutation, useInvalidate } from '../../../lib/queries/adminHooks';
import { apiErrorMessage } from '../../../lib/apiErrorMessage';
import { PageHeader } from '../../../components/admin/ui/PageHeader';
import { SearchInput } from '../../../components/admin/ui/SearchInput';
import { Pagination } from '../../../components/admin/ui/Pagination';
import { DataTable, IconButton, type Column } from '../../../components/admin/ui/DataTable';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Modal } from '../../../components/ui/Modal';
import { Checkbox, Field, Select, Textarea } from '../../../components/ui/Field';
import { useToast } from '../../../components/ui/Toast';
import { NewsletterAvailability } from '../../../components/admin/email/EmailParts';
import type {
  ImportResult,
  Paginated,
  Subscriber,
  SubscriberStats,
  SubscriberStatus,
} from '../../../lib/types';

const STATUS_TONE: Record<SubscriberStatus, 'green' | 'blue' | 'neutral'> = {
  ACTIVE: 'green',
  PENDING: 'blue',
  UNSUBSCRIBED: 'neutral',
};

export const SubscribersAdmin = () => {
  const t = useT();
  const m = t.admin.email.subscribers;
  const { can } = useAuth();
  const { locale } = useLocale();
  const toast = useToast();
  const invalidate = useInvalidate();
  const isSuper = can('SUPER_ADMIN');

  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? '1') || 1;
  const status = params.get('status') ?? '';
  const language = params.get('lang_filter') ?? '';
  const search = params.get('q') ?? '';

  const [pendingUnsubscribe, setPendingUnsubscribe] = useState<Subscriber | null>(null);
  const [pendingErase, setPendingErase] = useState<Subscriber | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next, { replace: true });
  };

  const filters = {
    status: status || undefined,
    locale: language || undefined,
    search: search || undefined,
  };

  const stats = useQuery({
    queryKey: ['admin', 'subscribers', 'stats'],
    queryFn: async () => (await api.get<SubscriberStats>('/newsletter/subscribers/stats')).data,
  });

  const list = useQuery({
    queryKey: ['admin', 'subscribers', page, status, language, search],
    queryFn: async () =>
      (
        await api.get<Paginated<Subscriber>>('/newsletter/subscribers', {
          params: { page, limit: 25, ...filters },
        })
      ).data,
    placeholderData: (previous) => previous,
  });

  const unsubscribe = useAdminMutation<string>({
    mutationFn: async (id) => (await api.post(`/newsletter/subscribers/${id}/unsubscribe`)).data,
    successMessage: m.unsubscribed,
    invalidate: [['admin', 'subscribers']],
    onSuccess: () => setPendingUnsubscribe(null),
  });

  const erase = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/newsletter/subscribers/${id}`)).data,
    successMessage: m.erased,
    invalidate: [['admin', 'subscribers']],
    onSuccess: () => setPendingErase(null),
  });

  /*
    A download rather than a link: the export needs the session's bearer
    token, which a plain <a href> would not send.
  */
  const exportCsv = useMutation({
    mutationFn: async () => {
      const response = await api.get<Blob>('/newsletter/subscribers/export', {
        params: filters,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `abonnes-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    },
    onError: (error) => toast.error(apiErrorMessage(error, undefined, locale)),
  });

  const columns: Array<Column<Subscriber>> = [
    {
      key: 'email',
      header: m.columnEmail,
      render: (row) => (
        <span className="block max-w-[18rem] truncate font-medium text-navy" dir="ltr">
          {row.email}
        </span>
      ),
    },
    {
      key: 'status',
      header: m.columnStatus,
      render: (row) => <Badge tone={STATUS_TONE[row.status]}>{m.status[row.status]}</Badge>,
    },
    {
      key: 'locale',
      header: m.columnLocale,
      render: (row) => <span className="text-navy/65">{row.locale === 'ar' ? 'العربية' : 'Français'}</span>,
    },
    {
      key: 'source',
      header: m.columnSource,
      hideOnMobile: true,
      render: (row) => <span className="text-navy/65">{m.sources[row.source] ?? row.source}</span>,
    },
    {
      key: 'since',
      header: m.columnSince,
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-navy/50">
          {t.admin.common.formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: 'lastCampaign',
      header: m.columnLastCampaign,
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-navy/50">
          {row.lastCampaignAt ? t.admin.common.formatDate(row.lastCampaignAt) : m.never}
        </span>
      ),
    },
  ];

  const filtered = Boolean(status || language || search);
  const peak = Math.max(1, ...(stats.data?.months ?? []).flatMap((x) => [x.confirmed, x.unsubscribed]));

  return (
    <div className="space-y-6">
      <PageHeader
        title={m.title}
        description={m.description}
        actions={
          isSuper ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" aria-hidden /> {m.import}
              </Button>
              <Button
                variant="secondary"
                onClick={() => exportCsv.mutate()}
                isLoading={exportCsv.isPending}
                title={m.exportHint}
              >
                <Download className="h-4 w-4" aria-hidden /> {m.export}
              </Button>
            </div>
          ) : undefined
        }
      />

      <NewsletterAvailability />

      {/* ------------------------------------------------------- stats */}
      {stats.data && (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={m.statActive} value={stats.data.counts.ACTIVE} strong />
            <Stat label={m.statPending} value={stats.data.counts.PENDING} />
            <Stat label={m.statUnsubscribed} value={stats.data.counts.UNSUBSCRIBED} />
            <Stat label={m.statTotal} value={stats.data.total} />
          </div>
          <p className="text-xs text-navy/50">
            {stats.data.lastConfirmedAt
              ? m.lastConfirmed(t.admin.common.formatDate(stats.data.lastConfirmedAt))
              : m.neverConfirmed}
          </p>

          {/*
            Twelve real months, a zero shown as a zero. Plain bars, because the
            numbers are small and a reader should be able to count them.
          */}
          <div className="rounded-xl border border-navy/8 bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-navy">{m.evolution}</h2>
              <div className="flex gap-4 text-xs text-navy/55">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-green" aria-hidden /> {m.confirmedLegend}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-navy/25" aria-hidden /> {m.unsubscribedLegend}
                </span>
              </div>
            </div>
            <ol className="grid grid-cols-12 items-end gap-1.5" style={{ height: 120 }}>
              {stats.data.months.map((month) => {
                const format = (style: 'long' | 'narrow') =>
                  new Intl.DateTimeFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'fr-FR', {
                    month: style,
                    ...(style === 'long' ? { year: 'numeric' } : {}),
                  }).format(new Date(month.month));
                // One letter under the bar so twelve fit on a phone; the full
                // month in the tooltip and for screen readers.
                const label = format('long');
                return (
                  <li
                    key={month.month}
                    className="flex h-full flex-col justify-end gap-0.5"
                    title={`${label} : ${month.confirmed} / ${month.unsubscribed}`}
                  >
                    <span className="sr-only">
                      {label} : {m.confirmedLegend} {month.confirmed}, {m.unsubscribedLegend}{' '}
                      {month.unsubscribed}
                    </span>
                    <span
                      aria-hidden
                      className="w-full rounded-t-sm bg-green"
                      style={{ height: `${(month.confirmed / peak) * 85}%` }}
                    />
                    <span
                      aria-hidden
                      className="w-full rounded-t-sm bg-navy/25"
                      style={{ height: `${(month.unsubscribed / peak) * 85}%` }}
                    />
                    <span aria-hidden className="mt-1 text-center text-caption text-navy/45">
                      {format('narrow')}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------- filters */}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <SearchInput value={search} onChange={(value) => setFilter('q', value)} placeholder={m.searchPlaceholder} />
        <Select aria-label={m.columnStatus} value={status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">{m.allStatuses}</option>
          {(['ACTIVE', 'PENDING', 'UNSUBSCRIBED'] as const).map((value) => (
            <option key={value} value={value}>
              {m.status[value]}
            </option>
          ))}
        </Select>
        <Select
          aria-label={m.columnLocale}
          value={language}
          onChange={(e) => setFilter('lang_filter', e.target.value)}
        >
          <option value="">{m.allLocales}</option>
          <option value="fr">Français</option>
          <option value="ar">العربية</option>
        </Select>
      </div>

      {list.isLoading ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : !list.data?.data.length ? (
        <EmptyState
          icon={Users}
          title={filtered ? t.admin.common.noResults : m.emptyTitle}
          description={filtered ? m.emptyFiltered : m.emptyDescription}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={list.data.data}
            rowKey={(row) => row.id}
            mobileTitle={(row) => (
              <span className="block truncate" dir="ltr">
                {row.email}
              </span>
            )}
            actions={(row) => (
              <div className="flex items-center gap-1">
                {row.status !== 'UNSUBSCRIBED' && (
                  <IconButton label={m.unsubscribe} icon={UserMinus} onClick={() => setPendingUnsubscribe(row)} />
                )}
                {isSuper && (
                  <IconButton label={m.erase} icon={Trash2} tone="danger" onClick={() => setPendingErase(row)} />
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

      <ConfirmDialog
        isOpen={Boolean(pendingUnsubscribe)}
        title={m.unsubscribeTitle}
        message={m.unsubscribeMessage}
        confirmLabel={m.unsubscribe}
        isLoading={unsubscribe.isPending}
        onCancel={() => setPendingUnsubscribe(null)}
        onConfirm={() => pendingUnsubscribe && unsubscribe.mutate(pendingUnsubscribe.id)}
      />
      <ConfirmDialog
        isOpen={Boolean(pendingErase)}
        title={m.eraseTitle}
        message={m.eraseMessage}
        confirmLabel={m.erase}
        isLoading={erase.isPending}
        onCancel={() => setPendingErase(null)}
        onConfirm={() => pendingErase && erase.mutate(pendingErase.id)}
      />

      {isSuper && (
        <ImportDialog
          isOpen={importOpen}
          onClose={() => setImportOpen(false)}
          onDone={() => invalidate(['admin', 'subscribers'])}
        />
      )}
    </div>
  );
};

const Stat = ({ label, value, strong }: { label: string; value: number; strong?: boolean }) => {
  const t = useT();
  return (
    <div className="rounded-xl border border-navy/8 bg-white p-4">
      <p className="text-xs font-semibold text-navy/55">{label}</p>
      <p className={strong ? 'mt-1 text-2xl font-extrabold text-green' : 'mt-1 text-2xl font-extrabold text-navy'}>
        {t.admin.common.formatNumber(value)}
      </p>
    </div>
  );
};

/** Pasting a list, attesting consent, and seeing exactly what happened to it. */
const ImportDialog = ({
  isOpen,
  onClose,
  onDone,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
}) => {
  const t = useT();
  const m = t.admin.email.subscribers;
  const { locale } = useLocale();
  const [csv, setCsv] = useState('');
  const [attest, setAttest] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const run = useMutation({
    mutationFn: async () =>
      (await api.post<ImportResult>('/newsletter/subscribers/import', { csv, attest })).data,
    onSuccess: (data) => {
      setResult(data);
      setProblem(null);
      onDone();
    },
    onError: (error) => setProblem(apiErrorMessage(error, undefined, locale)),
  });

  const close = () => {
    setCsv('');
    setAttest(false);
    setResult(null);
    setProblem(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={m.importTitle}
      size="lg"
      footer={
        result ? (
          <Button onClick={close}>{t.common.close}</Button>
        ) : (
          <Button onClick={() => run.mutate()} isLoading={run.isPending} disabled={!csv.trim() || !attest}>
            <Upload className="h-4 w-4" aria-hidden /> {m.importRun}
          </Button>
        )
      }
    >
      {result ? (
        <p role="status" className="rounded-lg bg-green/10 px-4 py-3 text-sm text-navy">
          {m.importResult(result.added, result.existing, result.invalid, result.duplicates)}
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-navy/65">{m.importHint}</p>
          <Field label={m.importTitle} htmlFor="import-csv">
            <Textarea
              id="import-csv"
              rows={10}
              dir="ltr"
              spellCheck={false}
              className="font-mono text-xs"
              value={csv}
              onChange={(event) => setCsv(event.target.value)}
              placeholder={'nom@exemple.com\nautre@exemple.com;ar'}
            />
          </Field>
          <Checkbox label={m.importAttest} checked={attest} onChange={(event) => setAttest(event.target.checked)} />
          {problem && (
            <p role="alert" className="text-sm text-red-600">
              {problem}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
};

export default SubscribersAdmin;
