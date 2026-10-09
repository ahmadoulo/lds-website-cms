import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, KeyRound, PlugZap, ShieldCheck, XCircle } from 'lucide-react';
import api from '../../../lib/api/axios';
import { useT } from '../../../lib/i18n/useT';
import { useAdminMutation } from '../../../lib/queries/adminHooks';
import { apiErrorMessage } from '../../../lib/apiErrorMessage';
import { useLocale } from '../../../context/LocaleContext';
import { PageHeader } from '../../../components/admin/ui/PageHeader';
import { ErrorState, LoadingState } from '../../../components/ui/States';
import { Button } from '../../../components/ui/Button';
import { Checkbox, Field, Input, Select } from '../../../components/ui/Field';
import {
  Section,
  TestResultNotice,
  TestSendForm,
} from '../../../components/admin/email/EmailParts';
import { cn } from '../../../lib/cn';
import type { DnsReport, EmailPurpose, EmailSettings, TestResult } from '../../../lib/types';

/** The form's own shape: every text field a string, so inputs stay controlled. */
interface Draft {
  enabled: boolean;
  host: string;
  port: string;
  security: EmailSettings['security'];
  username: string;
  fromName: string;
  fromEmail: string;
  replyToName: string;
  replyToEmail: string;
  contactInbox: string;
  adminInbox: string;
  identities: Record<EmailPurpose, { fromName: string; fromEmail: string; replyTo: string }>;
  batchSize: string;
  ratePerMinute: string;
}

const PURPOSES: EmailPurpose[] = ['contact', 'notification', 'newsletter'];

function toDraft(settings: EmailSettings): Draft {
  const identity = (purpose: EmailPurpose) => ({
    fromName: settings.identities[purpose]?.fromName ?? '',
    fromEmail: settings.identities[purpose]?.fromEmail ?? '',
    replyTo: settings.identities[purpose]?.replyTo ?? '',
  });
  return {
    enabled: settings.enabled,
    host: settings.host ?? '',
    port: settings.port ? String(settings.port) : '',
    security: settings.security,
    username: settings.username ?? '',
    fromName: settings.fromName ?? '',
    fromEmail: settings.fromEmail ?? '',
    replyToName: settings.replyToName ?? '',
    replyToEmail: settings.replyToEmail ?? '',
    contactInbox: settings.contactInbox ?? '',
    adminInbox: settings.adminInbox ?? '',
    identities: {
      contact: identity('contact'),
      notification: identity('notification'),
      newsletter: identity('newsletter'),
    },
    batchSize: String(settings.batchSize),
    ratePerMinute: String(settings.ratePerMinute),
  };
}

/** Blank strings become null: the API reads null as "clear this". */
function toPayload(draft: Draft) {
  const orNull = (value: string) => (value.trim() ? value.trim() : null);
  const identities = Object.fromEntries(
    PURPOSES.map((purpose) => {
      const value = draft.identities[purpose];
      // Only the parts that were filled in: an empty override is no override.
      const entry = Object.fromEntries(
        Object.entries(value).filter(([, field]) => field.trim()),
      ) as Record<string, string>;
      return [purpose, entry];
    }),
  );

  return {
    enabled: draft.enabled,
    host: orNull(draft.host),
    port: draft.port.trim() ? Number(draft.port) : null,
    security: draft.security,
    username: orNull(draft.username),
    fromName: orNull(draft.fromName),
    fromEmail: orNull(draft.fromEmail),
    replyToName: orNull(draft.replyToName),
    replyToEmail: orNull(draft.replyToEmail),
    contactInbox: orNull(draft.contactInbox),
    adminInbox: orNull(draft.adminInbox),
    identities,
    batchSize: Number(draft.batchSize) || 20,
    ratePerMinute: Number(draft.ratePerMinute) || 60,
  };
}

export const EmailSettingsAdmin = () => {
  const t = useT();
  const s = t.admin.email.settings;
  const { locale } = useLocale();

  const query = useQuery({
    queryKey: ['admin', 'email', 'settings'],
    queryFn: async () => (await api.get<EmailSettings>('/email/settings')).data,
  });

  const [draft, setDraft] = useState<Draft | null>(null);
  /*
    The password is write-only. The field starts empty whatever is stored;
    typing replaces the stored one, ticking "remove" deletes it, and leaving
    both alone keeps it - which is why it is not part of the draft.
  */
  const [password, setPassword] = useState('');
  const [removePassword, setRemovePassword] = useState(false);

  const [verifyResult, setVerifyResult] = useState<TestResult | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [dns, setDns] = useState<DnsReport | null>(null);

  useEffect(() => {
    if (query.data) setDraft(toDraft(query.data));
  }, [query.data]);

  const dirty = useMemo(() => {
    if (!draft || !query.data) return false;
    return (
      JSON.stringify(toPayload(draft)) !== JSON.stringify(toPayload(toDraft(query.data))) ||
      password !== '' ||
      removePassword
    );
  }, [draft, query.data, password, removePassword]);

  const save = useAdminMutation<void, EmailSettings>({
    mutationFn: async () => {
      const payload: Record<string, unknown> = toPayload(draft!);
      if (removePassword) payload.password = '';
      else if (password) payload.password = password;
      return (await api.put<EmailSettings>('/email/settings', payload)).data;
    },
    successMessage: s.saved,
    invalidate: [['admin', 'email']],
    onSuccess: () => {
      setPassword('');
      setRemovePassword(false);
      // A saved change makes the previous test results meaningless.
      setVerifyResult(null);
      setTestResult(null);
    },
  });

  /*
    Plain mutations rather than useAdminMutation: these answer 200 with
    ok:false when the server refuses, and a green "success" toast over a
    failed test would be the one message guaranteed to mislead.
  */
  const verify = useMutation({
    mutationFn: async () => (await api.post<TestResult>('/email/settings/verify')).data,
    onSuccess: (result) => {
      setVerifyResult(result);
      void query.refetch();
    },
    onError: (error) =>
      setVerifyResult({ ok: false, message: apiErrorMessage(error, undefined, locale) }),
  });

  const sendTest = useMutation({
    mutationFn: async (to: string) =>
      (await api.post<TestResult>('/email/settings/test', { to, locale })).data,
    onSuccess: (result) => {
      setTestResult(result);
      void query.refetch();
    },
    onError: (error) =>
      setTestResult({ ok: false, message: apiErrorMessage(error, undefined, locale) }),
  });

  const checkDns = useMutation({
    mutationFn: async () => (await api.get<DnsReport>('/email/settings/dns')).data,
    onSuccess: setDns,
  });

  if (query.isLoading || (query.data && !draft)) return <LoadingState />;
  if (query.isError || !query.data || !draft) {
    return <ErrorState onRetry={() => void query.refetch()} />;
  }

  const settings = query.data;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  const setIdentity = (purpose: EmailPurpose, field: 'fromName' | 'fromEmail' | 'replyTo', value: string) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            identities: {
              ...current.identities,
              [purpose]: { ...current.identities[purpose], [field]: value },
            },
          }
        : current,
    );

  const purposeLabel: Record<EmailPurpose, string> = {
    contact: s.purposeContact,
    notification: s.purposeNotification,
    newsletter: s.purposeNewsletter,
  };

  return (
    <div className="space-y-6">
      <PageHeader title={s.title} description={s.description} />

      {!settings.encryptionReady && (
        <p className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t.admin.email.overview.encryptionMissing}
        </p>
      )}

      {settings.warnings.length > 0 && (
        <section className="rounded-xl border border-orange/30 bg-orange/5 p-4">
          <h2 className="text-sm font-bold text-navy">{s.warnings}</h2>
          <ul className="mt-2 space-y-1.5">
            {settings.warnings.map((warning) => (
              <li key={warning} className="flex items-start gap-2 text-sm text-navy/75">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden />
                {warning}
              </li>
            ))}
          </ul>
        </section>
      )}

      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        {/* ------------------------------------------------- server */}
        <Section title={s.server} hint={s.serverHint}>
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <Field label={s.host} htmlFor="smtp-host">
              <Input
                id="smtp-host"
                dir="ltr"
                autoComplete="off"
                placeholder={s.hostPlaceholder}
                value={draft.host}
                onChange={(event) => set('host', event.target.value)}
              />
            </Field>
            <Field label={s.port} htmlFor="smtp-port">
              <Input
                id="smtp-port"
                dir="ltr"
                inputMode="numeric"
                value={draft.port}
                onChange={(event) => set('port', event.target.value.replace(/\D/g, ''))}
              />
            </Field>
          </div>
          <Field label={s.security} htmlFor="smtp-security">
            <Select
              id="smtp-security"
              value={draft.security}
              onChange={(event) => set('security', event.target.value as Draft['security'])}
            >
              <option value="tls">{s.securityTls}</option>
              <option value="starttls">{s.securityStarttls}</option>
              <option value="none">{s.securityNone}</option>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={s.username} htmlFor="smtp-username">
              <Input
                id="smtp-username"
                dir="ltr"
                autoComplete="off"
                value={draft.username}
                onChange={(event) => set('username', event.target.value)}
              />
            </Field>
            <Field
              label={s.password}
              htmlFor="smtp-password"
              hint={
                removePassword
                  ? s.passwordWillBeRemoved
                  : settings.hasPassword
                    ? s.passwordStored
                    : s.passwordNone
              }
            >
              <Input
                id="smtp-password"
                type="password"
                dir="ltr"
                // Never filled from the server, and never offered for saving by
                // the browser's password manager: it is not the user's own.
                autoComplete="new-password"
                value={password}
                disabled={removePassword}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
          </div>
          {settings.hasPassword && (
            <Checkbox
              label={s.passwordRemove}
              checked={removePassword}
              onChange={(event) => {
                setRemovePassword(event.target.checked);
                if (event.target.checked) setPassword('');
              }}
            />
          )}
        </Section>

        {/* ------------------------------------------------ identity */}
        <Section title={s.identity} hint={s.identityHint}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={s.fromName} htmlFor="from-name">
              <Input
                id="from-name"
                value={draft.fromName}
                onChange={(event) => set('fromName', event.target.value)}
              />
            </Field>
            <Field label={s.fromEmail} htmlFor="from-email">
              <Input
                id="from-email"
                type="email"
                dir="ltr"
                value={draft.fromEmail}
                onChange={(event) => set('fromEmail', event.target.value)}
              />
            </Field>
            <Field label={s.replyToName} htmlFor="reply-name">
              <Input
                id="reply-name"
                value={draft.replyToName}
                onChange={(event) => set('replyToName', event.target.value)}
              />
            </Field>
            <Field label={s.replyToEmail} htmlFor="reply-email" hint={s.replyToHint}>
              <Input
                id="reply-email"
                type="email"
                dir="ltr"
                value={draft.replyToEmail}
                onChange={(event) => set('replyToEmail', event.target.value)}
              />
            </Field>
          </div>
        </Section>

        <Section title={s.purposes} hint={s.purposesHint}>
          {PURPOSES.map((purpose) => (
            <fieldset key={purpose} className="rounded-lg border border-navy/8 p-4">
              <legend className="px-1 text-sm font-semibold text-navy">
                {purposeLabel[purpose]}
              </legend>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={s.fromName} htmlFor={`${purpose}-name`}>
                  <Input
                    id={`${purpose}-name`}
                    placeholder={draft.fromName}
                    value={draft.identities[purpose].fromName}
                    onChange={(event) => setIdentity(purpose, 'fromName', event.target.value)}
                  />
                </Field>
                <Field label={s.fromEmail} htmlFor={`${purpose}-email`}>
                  <Input
                    id={`${purpose}-email`}
                    type="email"
                    dir="ltr"
                    placeholder={draft.fromEmail}
                    value={draft.identities[purpose].fromEmail}
                    onChange={(event) => setIdentity(purpose, 'fromEmail', event.target.value)}
                  />
                </Field>
                <Field label={s.replyToEmail} htmlFor={`${purpose}-reply`}>
                  <Input
                    id={`${purpose}-reply`}
                    type="email"
                    dir="ltr"
                    placeholder={draft.replyToEmail}
                    value={draft.identities[purpose].replyTo}
                    onChange={(event) => setIdentity(purpose, 'replyTo', event.target.value)}
                  />
                </Field>
              </div>
            </fieldset>
          ))}
        </Section>

        {/* ---------------------------------------------- recipients */}
        <Section title={s.recipients}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={s.contactInbox} htmlFor="contact-inbox" hint={s.contactInboxHint}>
              <Input
                id="contact-inbox"
                type="email"
                dir="ltr"
                value={draft.contactInbox}
                onChange={(event) => set('contactInbox', event.target.value)}
              />
            </Field>
            <Field label={s.adminInbox} htmlFor="admin-inbox">
              <Input
                id="admin-inbox"
                type="email"
                dir="ltr"
                value={draft.adminInbox}
                onChange={(event) => set('adminInbox', event.target.value)}
              />
            </Field>
          </div>
        </Section>

        <Section title={s.throughput} hint={s.throughputHint}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={s.batchSize} htmlFor="batch-size">
              <Input
                id="batch-size"
                dir="ltr"
                inputMode="numeric"
                value={draft.batchSize}
                onChange={(event) => set('batchSize', event.target.value.replace(/\D/g, ''))}
              />
            </Field>
            <Field label={s.ratePerMinute} htmlFor="rate">
              <Input
                id="rate"
                dir="ltr"
                inputMode="numeric"
                value={draft.ratePerMinute}
                onChange={(event) => set('ratePerMinute', event.target.value.replace(/\D/g, ''))}
              />
            </Field>
          </div>
        </Section>

        {/* ------------------------------------------- enable + save */}
        <div className="flex flex-col gap-4 rounded-xl border border-navy/8 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <Checkbox
            label={s.enabled}
            hint={s.enabledHint}
            checked={draft.enabled}
            onChange={(event) => set('enabled', event.target.checked)}
          />
          <Button type="submit" variant="primary" isLoading={save.isPending} disabled={!dirty}>
            {s.save}
          </Button>
        </div>
      </form>

      {/* ---------------------------------------------------- tests */}
      <Section title={s.verify} hint={s.verifyHint}>
        {dirty && <p className="text-sm text-orange">{s.unsavedBeforeTest}</p>}
        <div>
          <Button
            variant="outline"
            onClick={() => verify.mutate()}
            isLoading={verify.isPending}
            disabled={dirty || !settings.host}
          >
            <PlugZap className="h-4 w-4" aria-hidden /> {s.verify}
          </Button>
        </div>
        <TestResultNotice result={verifyResult} />
      </Section>

      <div id="test">
        <Section title={s.testTitle}>
          <TestSendForm
            label={s.testTo}
            buttonLabel={s.testSend}
            disabled={dirty || !settings.host}
            isPending={sendTest.isPending}
            result={testResult}
            onSend={(to) => sendTest.mutate(to)}
          />
        </Section>
      </div>

      {/* ----------------------------------------------------- DNS */}
      <Section title={s.dnsTitle} hint={s.dnsHint}>
        <div>
          <Button
            variant="outline"
            onClick={() => checkDns.mutate()}
            isLoading={checkDns.isPending}
            disabled={!settings.fromEmail}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden /> {s.dnsCheck}
          </Button>
          {!settings.fromEmail && <p className="mt-2 text-sm text-navy/55">{s.dnsNoSender}</p>}
        </div>

        {dns?.domain && (
          <div className="space-y-3">
            <DnsRow
              label="SPF"
              found={dns.spf.found}
              record={dns.spf.record}
              advice={dns.spf.advice}
              found_={s.dnsFound}
              missing={s.dnsMissing}
            />
            <DnsRow
              label="DMARC"
              found={dns.dmarc.found}
              record={dns.dmarc.record}
              advice={dns.dmarc.advice}
              extra={dns.dmarc.policy ? s.dnsPolicy(dns.dmarc.policy) : null}
              found_={s.dnsFound}
              missing={s.dnsMissing}
            />
            <div className="rounded-lg border border-navy/8 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-navy">
                {s.dnsDkim}
                <span className="text-xs font-normal text-navy/50">{s.dnsNotCheckable}</span>
              </p>
              <p className="mt-1 text-xs text-navy/60">{dns.dkim.advice}</p>
            </div>
            <p className="text-xs text-navy/40">
              {s.dnsCheckedAt(t.admin.common.formatDateTime(dns.checkedAt))}
            </p>
          </div>
        )}
      </Section>
    </div>
  );
};

const DnsRow = ({
  label,
  found,
  record,
  advice,
  extra,
  found_,
  missing,
}: {
  label: string;
  found: boolean;
  record: string | null;
  advice: string | null;
  extra?: string | null;
  found_: string;
  missing: string;
}) => {
  const Icon = found ? CheckCircle2 : XCircle;
  return (
    <div className="rounded-lg border border-navy/8 p-3">
      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy">
        <Icon className={cn('h-4 w-4', found ? 'text-green' : 'text-red-600')} aria-hidden />
        {label}
        <span className="text-xs font-normal text-navy/50">{found ? found_ : missing}</span>
        {extra && <span className="text-xs font-normal text-navy/50">· {extra}</span>}
      </p>
      {record && (
        <code dir="ltr" className="mt-1.5 block break-all rounded bg-warm-muted px-2 py-1 text-xs text-navy/75">
          {record}
        </code>
      )}
      {advice && <p className="mt-1.5 text-xs text-navy/65">{advice}</p>}
    </div>
  );
};

export default EmailSettingsAdmin;
