import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCode2,
  History,
  Inbox,
  KeyRound,
  MailCheck,
  Send,
  XCircle,
} from 'lucide-react';
import api from '../../../lib/api/axios';
import { useT } from '../../../lib/i18n/useT';
import { useLocale } from '../../../context/LocaleContext';
import { PageHeader } from '../../../components/admin/ui/PageHeader';
import { ErrorState, LoadingState } from '../../../components/ui/States';
import { Badge } from '../../../components/ui/Badge';
import { useKindLabel } from '../../../components/admin/email/EmailParts';
import { cn } from '../../../lib/cn';
import type { EmailOverview } from '../../../lib/types';

/**
 * The communication cockpit.
 *
 * Every figure on it is counted by the API; nothing is estimated, and nothing
 * is drawn for decoration. "Accepted by the server" is the strongest claim it
 * makes about an email, because that is the last thing the site can know.
 */
export const CommunicationOverview = () => {
  const t = useT();
  const e = t.admin.email.overview;
  const kindLabel = useKindLabel();
  const { isRtl } = useLocale();

  const query = useQuery({
    queryKey: ['admin', 'email', 'overview'],
    queryFn: async () => (await api.get<EmailOverview>('/email/overview')).data,
    // A cockpit should not need a reload to notice a failure.
    refetchInterval: 30_000,
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) {
    return <ErrorState onRetry={() => void query.refetch()} />;
  }

  const data = query.data;
  const { smtp, counts } = data;
  const pending = counts.PENDING + counts.SENDING;
  const arrow = cn('h-4 w-4', isRtl && 'rotate-180');

  const smtpState = !smtp.configured
    ? { tone: 'red' as const, Icon: XCircle, text: e.smtpNotConfigured }
    : !smtp.enabled
      ? { tone: 'orange' as const, Icon: AlertTriangle, text: e.smtpDisabled }
      : { tone: 'green' as const, Icon: CheckCircle2, text: e.smtpReady };

  return (
    <div className="space-y-6">
      <PageHeader title={e.title} description={e.description} />

      {!smtp.encryptionReady && (
        <p className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {e.encryptionMissing}
        </p>
      )}

      {/* ------------------------------------------------ SMTP status */}
      <section className="rounded-xl border border-navy/8 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-navy">{e.smtpTitle}</h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-navy/75">
              <smtpState.Icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  smtpState.tone === 'green'
                    ? 'text-green'
                    : smtpState.tone === 'orange'
                      ? 'text-orange'
                      : 'text-red-600',
                )}
                aria-hidden
              />
              {smtpState.text}
            </p>
            <p className="mt-1 text-xs text-navy/50">
              {smtp.lastTestAt
                ? smtp.lastTestOk
                  ? e.lastTest(t.admin.common.formatDateTime(smtp.lastTestAt))
                  : `${e.lastTestFailed} ${e.lastTest(t.admin.common.formatDateTime(smtp.lastTestAt))}`
                : e.neverTested}
            </p>
          </div>
          <Link
            to="/admin/emails/configuration"
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
          >
            {e.configure} <ArrowRight className={arrow} aria-hidden />
          </Link>
        </div>

        {smtp.warnings.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-navy/8 pt-4">
            {smtp.warnings.map((warning) => (
              <li key={warning} className="flex items-start gap-2 text-sm text-navy/75">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden />
                {warning}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ------------------------------------------------ counts */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy/45">
          {e.period(data.periodDays)}
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={e.sent} value={t.admin.common.formatNumber(counts.SENT)} hint={e.sentHint} />
          <Stat
            label={e.failed}
            value={t.admin.common.formatNumber(counts.FAILED)}
            alert={counts.FAILED > 0}
          />
          <Stat
            label={e.pending}
            value={t.admin.common.formatNumber(pending)}
            hint={
              data.oldestPendingAt
                ? e.oldestPending(t.admin.common.formatDateTime(data.oldestPendingAt))
                : e.pendingHint
            }
          />
          <Stat
            label={e.failureRate}
            value={
              // Nothing attempted is not the same as nothing failed.
              data.failureRate === null
                ? e.noAttempts
                : `${t.admin.common.formatNumber(Math.round(data.failureRate * 1000) / 10)} %`
            }
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------------------------------------------- failures */}
        <section className="rounded-xl border border-navy/8 bg-white p-5 sm:p-6">
          <h2 className="text-base font-bold text-navy">{e.recentFailures}</h2>
          {data.recentFailures.length === 0 ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-navy/55">
              <CheckCircle2 className="h-4 w-4 text-green" aria-hidden /> {e.noFailures}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-navy/8">
              {data.recentFailures.map((failure) => (
                <li key={failure.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-navy" dir="ltr">
                      {failure.toEmail}
                    </span>
                    <Badge tone="neutral">{kindLabel(failure.kind)}</Badge>
                  </div>
                  {failure.error && (
                    <p className="mt-1 line-clamp-2 text-xs text-red-700">{failure.error}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/admin/emails/historique?status=FAILED"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue hover:underline"
          >
            {e.goHistory} <ArrowRight className={arrow} aria-hidden />
          </Link>
        </section>

        {/* ---------------------------------------------- contacts */}
        <section className="rounded-xl border border-navy/8 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-navy">{e.recentContacts}</h2>
            <Badge tone={data.contacts.unread > 0 ? 'orange' : 'neutral'}>
              {e.unreadContacts(data.contacts.unread)}
            </Badge>
          </div>
          {data.contacts.recent.length === 0 ? (
            <p className="mt-3 text-sm text-navy/55">{e.noContacts}</p>
          ) : (
            <ul className="mt-3 divide-y divide-navy/8">
              {data.contacts.recent.map((contact) => (
                <li key={contact.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'truncate text-sm',
                        contact.isRead ? 'text-navy/70' : 'font-bold text-navy',
                      )}
                    >
                      {contact.subject}
                    </p>
                    <p className="truncate text-xs text-navy/50">{contact.name}</p>
                  </div>
                  <span className="shrink-0 text-xs text-navy/40">
                    {t.admin.common.formatDate(contact.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/admin/messages"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue hover:underline"
          >
            {e.goMessages} <ArrowRight className={arrow} aria-hidden />
          </Link>
        </section>
      </div>

      {/* ------------------------------------------------ shortcuts */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy/45">
          {e.shortcuts}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Shortcut to="/admin/emails/configuration#test" icon={Send} label={e.sendTest} />
          <Shortcut to="/admin/emails/modeles" icon={FileCode2} label={e.goTemplates} />
          <Shortcut to="/admin/emails/historique" icon={History} label={e.goHistory} />
          <Shortcut to="/admin/messages" icon={Inbox} label={e.goMessages} />
        </div>
      </section>
    </div>
  );
};

const Stat = ({
  label,
  value,
  hint,
  alert,
}: {
  label: string;
  value: string;
  hint?: string;
  alert?: boolean;
}) => (
  <div
    className={cn(
      'rounded-xl border bg-white p-4',
      alert ? 'border-red-200' : 'border-navy/8',
    )}
  >
    <p className="text-xs font-semibold text-navy/55">{label}</p>
    <p className={cn('mt-1 text-2xl font-extrabold', alert ? 'text-red-600' : 'text-navy')}>
      {value}
    </p>
    {hint && <p className="mt-1 text-xs leading-snug text-navy/45">{hint}</p>}
  </div>
);

const Shortcut = ({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof MailCheck;
  label: string;
}) => (
  <Link
    to={to}
    className="flex items-center gap-3 rounded-xl border border-navy/8 bg-white px-4 py-3.5 text-sm font-semibold text-navy transition-colors hover:border-navy/25"
  >
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue/10 text-blue">
      <Icon className="h-4 w-4" aria-hidden />
    </span>
    {label}
  </Link>
);

export default CommunicationOverview;
