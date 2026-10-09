import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../../lib/api/axios';
import { useAdminMutation } from '../../../lib/queries/adminHooks';
import { CheckCircle2, Monitor, Send, Smartphone, XCircle } from 'lucide-react';
import { useT } from '../../../lib/i18n/useT';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Field, Input } from '../../ui/Field';
import { cn } from '../../../lib/cn';
import type { EmailMessageRow, EmailStatus, TestResult } from '../../../lib/types';

const TONES: Record<EmailStatus, React.ComponentProps<typeof Badge>['tone']> = {
  PENDING: 'blue',
  SENDING: 'blue',
  SENT: 'green',
  FAILED: 'red',
  CANCELLED: 'neutral',
};

export const EmailStatusBadge = ({ status }: { status: EmailStatus }) => {
  const t = useT();
  return <Badge tone={TONES[status]}>{t.admin.email.status[status]}</Badge>;
};

/** The kind of an email, in words; an unknown kind is shown as it is stored. */
export const useKindLabel = () => {
  const t = useT();
  const kinds = t.admin.email.kinds as Record<string, string>;
  return (kind: string) => kinds[kind] ?? kind;
};

/**
 * An email, rendered exactly as it will be sent.
 *
 * In an iframe so the email's own styles cannot leak into the back-office or
 * the other way round, and `sandbox` with no permissions so nothing in it can
 * run, navigate the page or read the session - the HTML contains values a
 * visitor typed, escaped, but defence in depth costs one attribute.
 *
 * The width toggle is there because most of these will be read on a phone.
 */
export const EmailPreview = ({ html, title }: { html: string; title: string }) => {
  const t = useT();
  const [width, setWidth] = useState<'mobile' | 'desktop'>('desktop');

  return (
    <div className="overflow-hidden rounded-xl border border-navy/10 bg-warm-muted">
      <div className="flex items-center justify-end gap-1 border-b border-navy/8 bg-white px-2 py-1.5">
        {(
          [
            ['desktop', Monitor],
            ['mobile', Smartphone],
          ] as const
        ).map(([value, Icon]) => (
          <button
            key={value}
            type="button"
            aria-pressed={width === value}
            aria-label={t.admin.email.previewWidth[value]}
            title={t.admin.email.previewWidth[value]}
            onClick={() => setWidth(value)}
            className={cn(
              'rounded-md p-1.5 transition-colors',
              width === value ? 'bg-navy text-white' : 'text-navy/50 hover:text-navy',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </button>
        ))}
      </div>
      <div className="flex justify-center p-3">
        <iframe
          title={title}
          srcDoc={html}
          sandbox=""
          className={cn(
            'h-[520px] rounded-lg bg-white shadow-e1 transition-[width] duration-300',
            width === 'mobile' ? 'w-[375px] max-w-full' : 'w-full',
          )}
        />
      </div>
    </div>
  );
};

/** The outcome of a test, said once and in plain words. */
export const TestResultNotice = ({ result }: { result: TestResult | null }) => {
  if (!result) return null;
  const Icon = result.ok ? CheckCircle2 : XCircle;
  return (
    <p
      role="status"
      className={cn(
        'flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm',
        result.ok ? 'bg-green/10 text-navy' : 'bg-red-50 text-red-700',
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', result.ok ? 'text-green' : 'text-red-600')} aria-hidden />
      <span className="break-words">{result.message}</span>
    </p>
  );
};

/**
 * One address and a send button. Used for the SMTP test and the template test,
 * which differ only in what they send.
 */
export const TestSendForm = ({
  label,
  buttonLabel,
  hint,
  disabled,
  isPending,
  result,
  onSend,
}: {
  label: string;
  buttonLabel: string;
  hint?: string;
  disabled?: boolean;
  isPending: boolean;
  result: TestResult | null;
  onSend: (to: string) => void;
}) => {
  const [to, setTo] = useState('');
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to.trim());

  return (
    <div className="space-y-3">
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onSend(to.trim());
        }}
      >
        <Field label={label} htmlFor="email-test-to" hint={hint} className="flex-1">
          <Input
            id="email-test-to"
            type="email"
            autoComplete="email"
            dir="ltr"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            placeholder="nom@exemple.com"
          />
        </Field>
        <Button
          type="submit"
          variant="secondary"
          isLoading={isPending}
          disabled={disabled || !valid}
          className="sm:mb-[1px]"
        >
          <Send className="h-4 w-4" aria-hidden /> {buttonLabel}
        </Button>
      </form>
      <TestResultNotice result={result} />
    </div>
  );
};

/** A titled block of a settings form. */
export const Section = ({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={cn('rounded-xl border border-navy/8 bg-white p-5 sm:p-6', className)}>
    <h2 className="text-base font-bold text-navy">{title}</h2>
    {hint && <p className="mt-1 text-sm text-navy/55">{hint}</p>}
    <div className="mt-5 space-y-4">{children}</div>
  </section>
);

/**
 * The emails one contact request produced, inside the message itself.
 *
 * Where the team reads a request is where they need to know whether the
 * visitor was acknowledged - not three screens away in the history. A failed
 * one can be retried from here.
 */
export const ContactEmails = ({ contactId }: { contactId: string }) => {
  const t = useT();
  const c = t.admin.email.contact;
  const kindLabel = useKindLabel();

  const query = useQuery({
    queryKey: ['admin', 'email', 'contact', contactId],
    queryFn: async () =>
      (await api.get<EmailMessageRow[]>(`/email/contacts/${contactId}/messages`)).data,
  });

  const retry = useAdminMutation<string>({
    mutationFn: async (id) => (await api.post(`/email/messages/${id}/retry`)).data,
    successMessage: t.admin.email.history.retried,
    invalidate: [['admin', 'email']],
  });

  // An editor cannot read email state (403): say nothing rather than an error.
  if (query.isError || query.isLoading) return null;

  return (
    <div className="rounded-lg border border-navy/8 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">{c.title}</p>
      {!query.data?.length ? (
        <p className="mt-2 text-sm text-navy/55">
          {c.none} <span className="text-navy/40">{c.noneHint}</span>
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {query.data.map((message) => (
            <li key={message.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <span className="text-navy/75">{kindLabel(message.kind)}</span>
                <EmailStatusBadge status={message.status} />
              </span>
              {(message.status === 'FAILED' || message.status === 'CANCELLED') && (
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={retry.isPending}
                  onClick={() => retry.mutate(message.id)}
                >
                  {t.admin.email.history.retry}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * Whether the newsletter signup form is on the public site, and if not, why.
 *
 * The form hides itself when sending cannot work, which is right for
 * visitors and baffling for the team: it simply is not there. This names the
 * exact setting to fix.
 */
export const NewsletterAvailability = () => {
  const t = useT();
  const a = t.admin.email.availability;
  const query = useQuery({
    queryKey: ['admin', 'subscribers', 'availability'],
    queryFn: async () =>
      (
        await api.get<{ available: boolean; missing: Array<keyof typeof a.missing> }>(
          '/newsletter/subscribers/availability',
        )
      ).data,
  });

  if (!query.data || typeof query.data.available !== 'boolean') return null;
  if (query.data.available) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-green/10 px-4 py-3 text-sm text-navy">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green" aria-hidden /> {a.visible}
      </p>
    );
  }

  return (
    <div role="status" className="rounded-xl border border-orange/30 bg-orange/5 px-4 py-3 text-sm text-navy">
      <p className="font-semibold">{a.hidden}</p>
      <ul className="mt-2 list-disc space-y-1 ps-5 text-navy/75">
        {(query.data.missing ?? []).map((reason) => (
          <li key={reason}>{a.missing[reason]}</li>
        ))}
      </ul>
      <Link
        to="/admin/emails/configuration"
        className="mt-2 inline-block font-semibold text-blue hover:underline"
      >
        {a.fix}
      </Link>
    </div>
  );
};
