import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, MailCheck, MailX, XCircle } from 'lucide-react';
import api from '../../lib/api/axios';
import { Seo } from '../../components/seo/Seo';
import { NewsletterSignup, useNewsletterStatus } from '../../components/public/NewsletterSignup';
import { useT } from '../../lib/i18n/useT';
import { cn } from '../../lib/cn';

/** The frame the three pages share: one centred column, one message. */
const Panel = ({
  icon: Icon,
  title,
  lead,
  children,
}: {
  icon: typeof MailCheck;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) => (
  <div className="container-page flex min-h-page items-center justify-center section-y">
    <div className="w-full max-w-lg rounded-panel bg-white p-6 shadow-e2 ring-1 ring-navy/5 sm:p-10">
      <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-green/15 text-green">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="text-h2 text-navy">{title}</h1>
      {lead && <p className="mt-3 leading-relaxed text-navy/70">{lead}</p>}
      <div className="mt-7">{children}</div>
    </div>
  </div>
);

const Outcome = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => {
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <p
      role="status"
      className={cn(
        'flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm leading-relaxed',
        ok ? 'bg-green/10 text-navy' : 'bg-red-50 text-red-700',
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', ok ? 'text-green' : 'text-red-600')} aria-hidden />
      <span>{children}</span>
    </p>
  );
};

/* ------------------------------------------------------------- signup */

export const NewsletterPage = () => {
  const t = useT();
  const n = t.newsletter;
  const status = useNewsletterStatus();

  return (
    <>
      <Seo title={n.page.title} description={n.page.lead} />
      <Panel icon={MailCheck} title={n.page.title} lead={n.page.lead}>
        <ul className="mb-7 space-y-2 text-sm text-navy/70">
          {n.page.points.map((point) => (
            <li key={point} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
        {status.isLoading ? null : status.data?.available ? (
          <NewsletterSignup source="page" tone="light" />
        ) : (
          <p className="rounded-xl bg-warm-muted px-4 py-3 text-sm text-navy/70">
            {n.page.unavailable}
          </p>
        )}
      </Panel>
    </>
  );
};

/* ------------------------------------------------------- confirmation */

type ConfirmResult = 'confirmed' | 'expired' | 'invalid';

/**
 * The page the confirmation email links to.
 *
 * It confirms on a click, not on arrival. Mail security scanners - Outlook's
 * Safe Links among them - open the links in an email before the person does;
 * a page that confirmed by loading would subscribe people their scanner had
 * merely looked at, which is exactly what double opt-in exists to prevent.
 */
export const NewsletterConfirmPage = () => {
  const t = useT();
  const n = t.newsletter;
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const confirm = useMutation({
    mutationFn: async () =>
      (await api.post<{ result: ConfirmResult }>('/newsletter/confirm', { token })).data.result,
  });

  const result = confirm.data;

  return (
    <>
      <Seo title={n.confirm.title} noIndex />
      <Panel icon={MailCheck} title={n.confirm.title} lead={result ? undefined : n.confirm.lead}>
        {!token ? (
          <Outcome ok={false}>{n.confirm.missing}</Outcome>
        ) : result === 'confirmed' ? (
          <Outcome ok>{n.confirm.confirmed}</Outcome>
        ) : result === 'expired' || result === 'invalid' ? (
          <div className="space-y-4">
            <Outcome ok={false}>
              {result === 'expired' ? n.confirm.expired : n.confirm.invalid}
            </Outcome>
            <Link to="/newsletter" className="inline-block font-semibold text-blue hover:underline">
              {n.confirm.subscribeAgain}
            </Link>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => confirm.mutate()}
            disabled={confirm.isPending}
            className="w-full rounded-xl bg-orange px-6 py-3.5 font-bold text-white transition-colors hover:bg-orange/90 disabled:opacity-60"
          >
            {confirm.isPending ? n.submitting : n.confirm.button}
          </button>
        )}
        {confirm.isError && <Outcome ok={false}>{n.failed}</Outcome>}
        <Link to="/" className="mt-6 inline-block text-sm text-navy/55 hover:text-navy">
          {n.backHome}
        </Link>
      </Panel>
    </>
  );
};

/* --------------------------------------------------------- unsubscribe */

/** Same reasoning as the confirmation: leaving takes a click, not a visit. */
export const NewsletterUnsubscribePage = () => {
  const t = useT();
  const n = t.newsletter;
  const [params] = useSearchParams();
  const s = params.get('s') ?? '';
  const token = params.get('t') ?? '';
  const campaign = params.get('c') ?? undefined;

  const leave = useMutation({
    mutationFn: async () =>
      (await api.post<{ ok: boolean }>('/newsletter/unsubscribe', { s, t: token, c: campaign }))
        .data.ok,
  });

  return (
    <>
      <Seo title={n.unsubscribe.title} noIndex />
      <Panel
        icon={MailX}
        title={n.unsubscribe.title}
        lead={leave.data === undefined ? n.unsubscribe.lead : undefined}
      >
        {!s || !token || leave.data === false ? (
          <Outcome ok={false}>{n.unsubscribe.invalid}</Outcome>
        ) : leave.data === true ? (
          <div className="space-y-4">
            <Outcome ok>{n.unsubscribe.done}</Outcome>
            <Link to="/newsletter" className="inline-block text-sm font-semibold text-blue hover:underline">
              {n.unsubscribe.resubscribe}
            </Link>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => leave.mutate()}
            disabled={leave.isPending}
            className="w-full rounded-xl border-2 border-navy/15 px-6 py-3.5 font-bold text-navy transition-colors hover:border-navy/40 disabled:opacity-60"
          >
            {leave.isPending ? n.submitting : n.unsubscribe.button}
          </button>
        )}
        {leave.isError && <Outcome ok={false}>{n.failed}</Outcome>}
        <Link to="/" className="mt-6 inline-block text-sm text-navy/55 hover:text-navy">
          {n.backHome}
        </Link>
      </Panel>
    </>
  );
};
