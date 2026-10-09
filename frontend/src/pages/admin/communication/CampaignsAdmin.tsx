import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Copy,
  Megaphone,
  Pause,
  Play,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import api from '../../../lib/api/axios';
import { useT } from '../../../lib/i18n/useT';
import { useLocale } from '../../../context/LocaleContext';
import { useAdminMutation, useInvalidate } from '../../../lib/queries/adminHooks';
import { apiErrorMessage } from '../../../lib/apiErrorMessage';
import { useToast } from '../../../components/ui/Toast';
import { PageHeader } from '../../../components/admin/ui/PageHeader';
import { DataTable, type Column } from '../../../components/admin/ui/DataTable';
import { Pagination } from '../../../components/admin/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Modal } from '../../../components/ui/Modal';
import { Checkbox, Field, Input, Select } from '../../../components/ui/Field';
import { EmailPreview, Section, TestSendForm } from '../../../components/admin/email/EmailParts';
import { BlockEditor } from '../../../components/admin/email/BlockEditor';
import { cn } from '../../../lib/cn';
import type {
  Audience,
  Campaign,
  CampaignBlock,
  CampaignStats,
  CampaignStatus,
  EmailSettings,
  Paginated,
  RenderedEmail,
  Segment,
  TestResult,
} from '../../../lib/types';

const STATUS_TONE: Record<CampaignStatus, 'neutral' | 'blue' | 'orange' | 'green' | 'red'> = {
  DRAFT: 'neutral',
  SCHEDULED: 'blue',
  SENDING: 'orange',
  PAUSED: 'orange',
  SENT: 'green',
  CANCELLED: 'red',
};

export const CampaignsAdmin = () => {
  const [params, setParams] = useSearchParams();
  const id = params.get('id');
  return id ? (
    <CampaignEditor key={id} id={id} onOpen={(next) => setParams(next ? { id: next } : {})} />
  ) : (
    <CampaignList onOpen={(next) => setParams({ id: next })} />
  );
};

/* ----------------------------------------------------------------- list */

const CampaignList = ({ onOpen }: { onOpen: (id: string) => void }) => {
  const t = useT();
  const c = t.admin.email.campaigns;
  const [page, setPage] = useState(1);

  const list = useQuery({
    queryKey: ['admin', 'campaigns', page],
    queryFn: async () =>
      (await api.get<Paginated<Campaign>>('/campaigns', { params: { page, limit: 20 } })).data,
    // A campaign sending in the background changes state on its own.
    refetchInterval: 15_000,
  });

  const columns: Array<Column<Campaign>> = [
    {
      key: 'name',
      header: c.columnName,
      render: (row) => (
        <span className="block min-w-0">
          <span className="block truncate font-semibold text-navy">{row.name}</span>
          <span className="block truncate text-xs text-navy/50" dir="auto">
            {row.subject}
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      header: c.columnStatus,
      render: (row) => <Badge tone={STATUS_TONE[row.status]}>{c.status[row.status]}</Badge>,
    },
    {
      key: 'language',
      header: c.columnLanguage,
      render: (row) => <span className="text-navy/65">{row.locale === 'ar' ? 'العربية' : 'Français'}</span>,
    },
    {
      key: 'recipients',
      header: c.columnRecipients,
      render: (row) => (
        <span className="text-navy/65">{row.recipientCount === null ? '—' : t.admin.common.formatNumber(row.recipientCount)}</span>
      ),
    },
    {
      key: 'date',
      header: c.columnDate,
      align: 'right',
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-navy/50">
          {row.completedAt
            ? c.sentOn(t.admin.common.formatDateTime(row.completedAt))
            : row.scheduledAt
              ? c.scheduledFor(t.admin.common.formatDateTime(row.scheduledAt))
              : t.admin.common.formatDate(row.updatedAt)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={c.title}
        description={c.description}
        actions={
          <Button onClick={() => onOpen('nouvelle')}>
            <Plus className="h-4 w-4" aria-hidden /> {c.create}
          </Button>
        }
      />
      {list.isLoading ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : !list.data?.data.length ? (
        <EmptyState icon={Megaphone} title={c.emptyTitle} description={c.emptyDescription} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={list.data.data}
            rowKey={(row) => row.id}
            mobileTitle={(row) => row.name}
            actions={(row) => (
              <Button size="sm" variant="outline" onClick={() => onOpen(row.id)}>
                {c.preview}
              </Button>
            )}
          />
          <Pagination
            page={list.data.meta.page}
            totalPages={list.data.meta.totalPages}
            total={list.data.meta.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
};

/* --------------------------------------------------------------- editor */

interface Draft {
  name: string;
  subject: string;
  preheader: string;
  locale: 'fr' | 'ar';
  fromName: string;
  replyTo: string;
  includeSignature: boolean;
  audience: Audience;
  blocks: CampaignBlock[];
}

const EMPTY_DRAFT: Draft = {
  name: '',
  subject: '',
  preheader: '',
  locale: 'fr',
  fromName: '',
  replyTo: '',
  includeSignature: true,
  audience: { segment: 'all' },
  blocks: [],
};

const toDraft = (campaign: Campaign): Draft => ({
  name: campaign.name,
  subject: campaign.subject,
  preheader: campaign.preheader ?? '',
  locale: campaign.locale,
  fromName: campaign.fromName ?? '',
  replyTo: campaign.replyTo ?? '',
  includeSignature: campaign.includeSignature,
  audience: campaign.audience,
  blocks: campaign.blocks,
});

/** What the API accepts: empty list lines dropped, blanks as null. */
const toPayload = (draft: Draft) => ({
  name: draft.name,
  subject: draft.subject,
  preheader: draft.preheader.trim() || null,
  locale: draft.locale,
  fromName: draft.fromName.trim() || null,
  replyTo: draft.replyTo.trim() || null,
  includeSignature: draft.includeSignature,
  audience: draft.audience,
  blocks: draft.blocks.map((block) =>
    block.type === 'list'
      ? { ...block, items: block.items.filter((item) => item.trim()) }
      : block.type === 'image'
        ? { type: 'image' as const, mediaId: block.mediaId, alt: block.alt, ...(block.caption ? { caption: block.caption } : {}) }
        : block,
  ),
});

const CampaignEditor = ({ id, onOpen }: { id: string; onOpen: (id: string | null) => void }) => {
  const t = useT();
  const c = t.admin.email.campaigns;
  const { isRtl, locale } = useLocale();
  const toast = useToast();
  const invalidate = useInvalidate();
  const isNew = id === 'nouvelle';

  const campaign = useQuery({
    queryKey: ['admin', 'campaigns', 'one', id],
    enabled: !isNew,
    queryFn: async () => (await api.get<Campaign>(`/campaigns/${id}`)).data,
    refetchInterval: (query) =>
      query.state.data && ['SENDING', 'SCHEDULED', 'PAUSED'].includes(query.state.data.status) ? 10_000 : false,
  });

  const settings = useQuery({
    queryKey: ['admin', 'email', 'settings'],
    queryFn: async () => (await api.get<EmailSettings>('/email/settings')).data,
  });

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  useEffect(() => {
    if (campaign.data) setDraft(toDraft(campaign.data));
  }, [campaign.data]);

  const isDraft = isNew || campaign.data?.status === 'DRAFT';
  const dirty = isNew
    ? JSON.stringify(draft) !== JSON.stringify(EMPTY_DRAFT)
    : Boolean(campaign.data && JSON.stringify(toPayload(draft)) !== JSON.stringify(toPayload(toDraft(campaign.data))));

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  /* The audience count follows the selection live. */
  const audience = useQuery({
    queryKey: ['admin', 'campaigns', 'audience', draft.audience],
    enabled: draft.audience.segment !== 'period' || Boolean(draft.audience.from && draft.audience.to),
    queryFn: async () =>
      (await api.post<{ recipients: number }>('/campaigns/audience', draft.audience)).data.recipients,
  });

  /* The preview follows the draft, debounced. */
  const [debounced, setDebounced] = useState(draft);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(draft), 600);
    return () => clearTimeout(timer);
  }, [draft]);
  const preview = useQuery({
    queryKey: ['admin', 'campaigns', 'preview', debounced],
    queryFn: async () =>
      (await api.post<RenderedEmail>('/campaigns/preview', toPayload(debounced))).data,
    placeholderData: (previous) => previous,
    retry: false,
  });

  const save = useAdminMutation<void, Campaign>({
    mutationFn: async () =>
      isNew
        ? (await api.post<Campaign>('/campaigns', toPayload(draft))).data
        : (await api.put<Campaign>(`/campaigns/${id}`, toPayload(draft))).data,
    successMessage: isNew ? c.created : c.saved,
    invalidate: [['admin', 'campaigns']],
    onSuccess: (saved) => {
      if (isNew) onOpen(saved.id);
    },
  });

  const duplicate = useAdminMutation<void, Campaign>({
    mutationFn: async () => (await api.post<Campaign>(`/campaigns/${id}/duplicate`)).data,
    successMessage: c.duplicated,
    invalidate: [['admin', 'campaigns']],
    onSuccess: (copy) => onOpen(copy.id),
  });

  const [confirmDelete, setConfirmDelete] = useState(false);
  const remove = useAdminMutation<void>({
    mutationFn: async () => (await api.delete(`/campaigns/${id}`)).data,
    successMessage: c.deleted,
    invalidate: [['admin', 'campaigns']],
    onSuccess: () => onOpen(null),
  });

  const pause = useCampaignAction(id, 'pause', c.paused);
  const resume = useCampaignAction(id, 'resume', c.resumed);
  const cancel = useCampaignAction(id, 'cancel', c.cancelled);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const test = useMutation({
    mutationFn: async (to: string) => (await api.post<TestResult>(`/campaigns/${id}/test`, { to })).data,
    onSuccess: setTestResult,
    onError: (error) => setTestResult({ ok: false, message: apiErrorMessage(error, undefined, locale) }),
  });

  const [sendOpen, setSendOpen] = useState(false);

  if (!isNew && campaign.isLoading) return <LoadingState />;
  if (!isNew && (campaign.isError || !campaign.data)) {
    return <ErrorState onRetry={() => void campaign.refetch()} />;
  }

  const status = campaign.data?.status ?? 'DRAFT';
  const s = settings.data;
  const operational = Boolean(
    s?.enabled && s.encryptionReady && (s.siteUrl || s.siteUrlFromEnvironment),
  );
  const sender = s
    ? {
        name: draft.fromName || s.identities.newsletter?.fromName || s.fromName || '',
        email: s.identities.newsletter?.fromEmail || s.fromEmail || s.username || '',
      }
    : null;
  const contentDir = draft.locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => onOpen(null)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy/60 hover:text-navy"
      >
        <ArrowLeft className={cn('h-4 w-4', isRtl && 'rotate-180')} aria-hidden /> {c.back}
      </button>

      <PageHeader
        title={draft.name || c.create}
        description={campaign.data ? c.status[status] : undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            {!isNew && (
              <Button variant="outline" onClick={() => duplicate.mutate()} isLoading={duplicate.isPending}>
                <Copy className="h-4 w-4" aria-hidden /> {c.duplicate}
              </Button>
            )}
            {status === 'SENDING' && (
              <Button variant="outline" onClick={() => pause.mutate()} isLoading={pause.isPending}>
                <Pause className="h-4 w-4" aria-hidden /> {c.pause}
              </Button>
            )}
            {status === 'PAUSED' && (
              <Button variant="outline" onClick={() => resume.mutate()} isLoading={resume.isPending}>
                <Play className="h-4 w-4" aria-hidden /> {c.resume}
              </Button>
            )}
            {['SCHEDULED', 'SENDING', 'PAUSED'].includes(status) && (
              <Button variant="danger" onClick={() => setConfirmCancel(true)}>
                <Ban className="h-4 w-4" aria-hidden />{' '}
                {status === 'SCHEDULED' ? c.cancelScheduled : c.cancel}
              </Button>
            )}
          </div>
        }
      />

      {!operational && settings.data && (
        <p className="flex items-start gap-2 rounded-xl bg-orange/10 px-4 py-3 text-sm text-navy">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden />
          <span>
            {c.notOperational}{' '}
            <Link to="/admin/emails/configuration" className="font-semibold text-blue hover:underline">
              {t.admin.email.overview.goSettings}
            </Link>
          </span>
        </p>
      )}

      {!isDraft && campaign.data && <CampaignResults campaign={campaign.data} />}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* --------------------------------------------- settings + content */}
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (isDraft) save.mutate();
          }}
        >
          <fieldset disabled={!isDraft} className="space-y-6 disabled:opacity-80">
            <Section title={c.title}>
              <Field label={c.name} htmlFor="campaign-name" hint={c.nameHint} required>
                <Input id="campaign-name" value={draft.name} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label={c.language} htmlFor="campaign-locale">
                <Select
                  id="campaign-locale"
                  value={draft.locale}
                  onChange={(e) => set('locale', e.target.value as Draft['locale'])}
                >
                  <option value="fr">Français</option>
                  <option value="ar">العربية</option>
                </Select>
              </Field>
              <Field label={c.subject} htmlFor="campaign-subject" required>
                <Input
                  id="campaign-subject"
                  dir={contentDir}
                  value={draft.subject}
                  onChange={(e) => set('subject', e.target.value.replace(/[\r\n]/g, ' '))}
                />
              </Field>
              <Field label={c.preheader} htmlFor="campaign-preheader" hint={c.preheaderHint}>
                <Input
                  id="campaign-preheader"
                  dir={contentDir}
                  value={draft.preheader}
                  onChange={(e) => set('preheader', e.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={c.fromName} htmlFor="campaign-from" hint={c.fromNameHint}>
                  <Input
                    id="campaign-from"
                    placeholder={sender?.name}
                    value={draft.fromName}
                    onChange={(e) => set('fromName', e.target.value)}
                  />
                </Field>
                <Field label={c.replyTo} htmlFor="campaign-reply">
                  <Input
                    id="campaign-reply"
                    type="email"
                    dir="ltr"
                    value={draft.replyTo}
                    onChange={(e) => set('replyTo', e.target.value)}
                  />
                </Field>
              </div>
              <Checkbox
                label={c.includeSignature}
                checked={draft.includeSignature}
                onChange={(e) => set('includeSignature', e.target.checked)}
              />
            </Section>

            <Section title={c.audience} hint={c.recipientsHint}>
              <Select
                aria-label={c.audience}
                value={draft.audience.segment}
                onChange={(e) => set('audience', { segment: e.target.value as Segment })}
              >
                {(['all', 'fr', 'ar', 'period'] as const).map((segment) => (
                  <option key={segment} value={segment}>
                    {c.segments[segment]}
                  </option>
                ))}
              </Select>
              {draft.audience.segment === 'period' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={c.periodFrom} htmlFor="audience-from">
                    <Input
                      id="audience-from"
                      type="date"
                      value={draft.audience.from?.slice(0, 10) ?? ''}
                      onChange={(e) =>
                        set('audience', {
                          ...draft.audience,
                          from: e.target.value ? new Date(`${e.target.value}T00:00:00`).toISOString() : undefined,
                        })
                      }
                    />
                  </Field>
                  <Field label={c.periodTo} htmlFor="audience-to">
                    <Input
                      id="audience-to"
                      type="date"
                      value={draft.audience.to?.slice(0, 10) ?? ''}
                      onChange={(e) =>
                        set('audience', {
                          ...draft.audience,
                          to: e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : undefined,
                        })
                      }
                    />
                  </Field>
                </div>
              )}
              {audience.data !== undefined && (
                <p className="text-sm font-semibold text-navy">{c.recipients(audience.data)}</p>
              )}
            </Section>

            <Section title={c.content}>
              <BlockEditor blocks={draft.blocks} onChange={(blocks) => set('blocks', blocks)} dir={contentDir} />
            </Section>
          </fieldset>

          {isDraft && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy/8 bg-white p-5">
              <span className="text-sm text-orange">{dirty ? c.unsaved : ''}</span>
              <div className="flex flex-wrap gap-2">
                {!isNew && (
                  <Button variant="ghost" type="button" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-4 w-4" aria-hidden /> {c.delete}
                  </Button>
                )}
                <Button type="submit" variant="outline" isLoading={save.isPending} disabled={!dirty}>
                  {c.save}
                </Button>
                {!isNew && (
                  <Button
                    type="button"
                    onClick={() => setSendOpen(true)}
                    disabled={dirty || !operational || !draft.blocks.length || !audience.data}
                  >
                    <Send className="h-4 w-4" aria-hidden /> {c.send}
                  </Button>
                )}
              </div>
            </div>
          )}
        </form>

        {/* ------------------------------------------------ preview + test */}
        <div className="space-y-6">
          <Section title={c.preview} hint={c.previewHint}>
            {preview.data ? (
              <>
                <p className="text-sm">
                  <span className="text-navy/55">{c.subject} : </span>
                  <span className="font-semibold text-navy" dir="auto">
                    {preview.data.subject}
                  </span>
                </p>
                <EmailPreview html={preview.data.html} title={draft.name || c.preview} />
              </>
            ) : preview.isError ? (
              <p className="text-sm text-navy/55">{apiErrorMessage(preview.error, undefined, locale)}</p>
            ) : (
              <LoadingState />
            )}
          </Section>

          {!isNew && (
            <Section title={c.testTitle} hint={c.testHint}>
              <TestSendForm
                label={t.admin.email.settings.testTo}
                buttonLabel={t.admin.email.settings.testSend}
                disabled={dirty}
                isPending={test.isPending}
                result={testResult}
                onSend={(to) => test.mutate(to)}
              />
            </Section>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        title={c.deleteTitle}
        message={c.deleteMessage}
        confirmLabel={c.delete}
        isLoading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}
      />
      <ConfirmDialog
        isOpen={confirmCancel}
        title={c.cancelTitle}
        message={c.cancelMessage}
        confirmLabel={status === 'SCHEDULED' ? c.cancelScheduled : c.cancel}
        isLoading={cancel.isPending}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => cancel.mutate(undefined, { onSuccess: () => setConfirmCancel(false) })}
      />

      {campaign.data && sendOpen && (
        <SendDialog
          campaign={campaign.data}
          sender={sender}
          onClose={() => setSendOpen(false)}
          onDone={(message) => {
            setSendOpen(false);
            toast.success(message);
            invalidate(['admin', 'campaigns']);
          }}
        />
      )}
    </div>
  );
};

/** Pause, resume or cancel: the same request with a different verb. */
const useCampaignAction = (id: string, path: 'pause' | 'resume' | 'cancel', message: string) =>
  useAdminMutation<void>({
    mutationFn: async () => (await api.post(`/campaigns/${id}/${path}`)).data,
    successMessage: message,
    invalidate: [['admin', 'campaigns']],
  });

/* ---------------------------------------------------------- send dialog */

/**
 * The recap and the explicit confirmation.
 *
 * The recipient count is fetched when the dialog opens and is what the
 * server is told was confirmed. If it no longer matches when the send is
 * requested, the server refuses and the dialog shows the new count: nobody
 * confirms one number and sends another.
 */
const SendDialog = ({
  campaign,
  sender,
  onClose,
  onDone,
}: {
  campaign: Campaign;
  sender: { name: string; email: string } | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) => {
  const t = useT();
  const c = t.admin.email.campaigns;
  const { locale } = useLocale();
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [at, setAt] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const count = useQuery({
    queryKey: ['admin', 'campaigns', 'recap', campaign.id],
    queryFn: async () =>
      (await api.post<{ recipients: number }>('/campaigns/audience', campaign.audience)).data.recipients,
    staleTime: 0,
  });

  const send = useMutation({
    mutationFn: async () =>
      (
        await api.post<Campaign>(`/campaigns/${campaign.id}/schedule`, {
          expectedRecipients: count.data,
          ...(when === 'later' && at ? { at: new Date(at).toISOString() } : {}),
        })
      ).data,
    onSuccess: (result) => onDone(result.status === 'SCHEDULED' ? c.scheduled : c.started),
    onError: (error: { response?: { status?: number } }) => {
      if (error.response?.status === 409) {
        setNotice(c.audienceChanged);
        setConfirmed(false);
        void count.refetch();
      } else {
        setNotice(apiErrorMessage(error, undefined, locale));
      }
    },
  });

  const recipients = count.data ?? 0;
  const laterValid = when === 'now' || (at && new Date(at).getTime() > Date.now());

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={c.recapTitle}
      size="md"
      footer={
        <Button
          onClick={() => send.mutate()}
          isLoading={send.isPending}
          disabled={!confirmed || !recipients || !laterValid || count.isFetching}
        >
          <Send className="h-4 w-4" aria-hidden /> {when === 'now' ? c.recapGo : c.recapSchedule}
        </Button>
      }
    >
      <div className="space-y-4">
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-navy/55">{c.recapSubject}</dt>
          <dd className="font-semibold text-navy" dir="auto">
            {campaign.subject}
          </dd>
          <dt className="text-navy/55">{c.recapSender}</dt>
          <dd dir="ltr" className="text-start">
            {sender ? `${sender.name} <${sender.email}>` : '—'}
          </dd>
          <dt className="text-navy/55">{c.recapLanguage}</dt>
          <dd>{campaign.locale === 'ar' ? 'العربية' : 'Français'}</dd>
          <dt className="text-navy/55">{c.recapAudience}</dt>
          <dd>
            {c.segments[campaign.audience.segment]} ·{' '}
            <strong>{count.isLoading ? '…' : c.recipients(recipients)}</strong>
          </dd>
        </dl>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold text-navy">{c.recapWhen}</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={when === 'now'} onChange={() => setWhen('now')} /> {c.whenNow}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={when === 'later'} onChange={() => setWhen('later')} /> {c.whenLater}
          </label>
          {when === 'later' && (
            <Field label={c.whenAt} htmlFor="send-at">
              <Input id="send-at" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
            </Field>
          )}
        </fieldset>

        <Checkbox
          label={c.recapConfirm(recipients)}
          checked={confirmed}
          disabled={!recipients}
          onChange={(e) => setConfirmed(e.target.checked)}
        />

        {notice && (
          <p role="alert" className="rounded-lg bg-orange/10 px-3 py-2 text-sm text-navy">
            {notice}
          </p>
        )}
      </div>
    </Modal>
  );
};

/* -------------------------------------------------------------- results */

const CampaignResults = ({ campaign }: { campaign: Campaign }) => {
  const t = useT();
  const c = t.admin.email.campaigns;
  const stats = useQuery({
    queryKey: ['admin', 'campaigns', 'stats', campaign.id, campaign.status],
    queryFn: async () => (await api.get<CampaignStats>(`/campaigns/${campaign.id}/stats`)).data,
    refetchInterval: campaign.status === 'SENDING' ? 10_000 : false,
  });
  const n = (value: number) => t.admin.common.formatNumber(value);

  const tiles = useMemo(() => {
    if (!stats.data) return [];
    const { counts } = stats.data;
    return [
      { label: c.statQueued, value: stats.data.queued },
      { label: c.statSent, value: counts.SENT, tone: 'text-green' },
      { label: c.statFailed, value: counts.FAILED, tone: counts.FAILED ? 'text-red-600' : undefined },
      { label: c.statPending, value: counts.PENDING + counts.SENDING },
      { label: c.statCancelled, value: counts.CANCELLED },
      { label: c.statUnsubscribed, value: stats.data.unsubscribed },
    ];
  }, [stats.data, c]);

  return (
    <Section title={c.statsTitle} hint={c.statsNote}>
      {stats.data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-lg border border-navy/8 p-3">
              <p className="text-xs text-navy/55">{tile.label}</p>
              <p className={cn('mt-1 text-xl font-extrabold text-navy', tile.tone)}>{n(tile.value)}</p>
            </div>
          ))}
        </div>
      ) : (
        <LoadingState />
      )}
      <Link
        to={`/admin/emails/historique?campaign=${campaign.id}`}
        className="inline-block text-sm font-semibold text-blue hover:underline"
      >
        {c.openHistory}
      </Link>
    </Section>
  );
};

export default CampaignsAdmin;
