import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, Info } from 'lucide-react';
import api from '../../../lib/api/axios';
import { useT } from '../../../lib/i18n/useT';
import { useAdminMutation } from '../../../lib/queries/adminHooks';
import { PageHeader } from '../../../components/admin/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States';
import { Badge } from '../../../components/ui/Badge';
import type { EmailSettings, EmailTemplate } from '../../../lib/types';

/** Who each automatic email goes to. Keyed by the template that writes it. */
type Recipient = 'visitor' | 'contactInbox' | 'adminInbox' | 'tester';

const RECIPIENTS: Record<string, Recipient> = {
  contact_ack: 'visitor',
  contact_notify: 'contactInbox',
  newsletter_confirm: 'visitor',
  newsletter_welcome: 'visitor',
  newsletter_subscribed: 'adminInbox',
  campaign_completed: 'adminInbox',
  test: 'tester',
};

/**
 * Every email the site sends on its own, by the event that sends it.
 *
 * A view over two things that already exist - the templates, which carry
 * whether each email is sent, and the email settings, which carry where the
 * team's copies go. Nothing is stored here that is not stored there, so the
 * two screens cannot disagree.
 *
 * Only events the code actually raises are listed. There is no "delivery
 * failed" alert by email, deliberately: when the SMTP server is what failed,
 * the alert would be sent through it.
 */
export const NotificationsAdmin = () => {
  const t = useT();
  const n = t.admin.email.notifications;

  const templates = useQuery({
    queryKey: ['admin', 'email', 'templates'],
    queryFn: async () => (await api.get<EmailTemplate[]>('/email/templates')).data,
  });
  const settings = useQuery({
    queryKey: ['admin', 'email', 'settings'],
    queryFn: async () => (await api.get<EmailSettings>('/email/settings')).data,
  });

  const toggle = useAdminMutation<{ key: string; isActive: boolean }>({
    mutationFn: async ({ key, isActive }) =>
      (await api.put(`/email/templates/${encodeURIComponent(key)}`, { isActive })).data,
    successMessage: n.updated,
    invalidate: [['admin', 'email', 'templates']],
  });

  if (templates.isLoading || settings.isLoading) return <LoadingState />;
  if (templates.isError || settings.isError || !templates.data || !settings.data) {
    return (
      <ErrorState
        onRetry={() => {
          void templates.refetch();
          void settings.refetch();
        }}
      />
    );
  }

  const s = settings.data;
  const recipientLabel = (recipient: Recipient) => {
    switch (recipient) {
      case 'visitor':
        return { label: n.toVisitor, address: null };
      case 'tester':
        return { label: n.toTester, address: null };
      case 'contactInbox':
        return { label: n.toContactInbox, address: s.contactInbox };
      case 'adminInbox':
        return { label: n.toAdminInbox, address: s.adminInbox ?? s.contactInbox };
    }
  };

  const rows = templates.data.filter((template) => template.key in RECIPIENTS);
  const events = n.events as Record<string, string>;

  return (
    <div className="space-y-6">
      <PageHeader title={n.title} description={n.description} />

      {rows.length === 0 ? (
        <EmptyState icon={Bell} title={n.title} description={n.description} />
      ) : (
        <ul className="divide-y divide-navy/8 overflow-hidden rounded-xl border border-navy/8 bg-white">
          {rows.map((template) => {
            const recipient = RECIPIENTS[template.key];
            const { label, address } = recipientLabel(recipient);
            const needsAddress = recipient === 'contactInbox' || recipient === 'adminInbox';

            return (
              <li key={template.key} className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[1.3fr_1fr_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-navy">{template.name}</p>
                  <p className="mt-0.5 text-xs text-navy/55">{events[template.key] ?? template.key}</p>
                  <p className="mt-1 text-xs text-navy/45">
                    {t.admin.email.notifications.columnLanguage} :{' '}
                    {template.audience === 'visitor' ? n.languageVisitor : n.languageTeam}
                  </p>
                </div>

                <div className="min-w-0 text-sm">
                  <p className="text-xs font-semibold text-navy/50">{n.columnRecipient}</p>
                  <p className="text-navy/80">{label}</p>
                  {needsAddress && (
                    <p className="truncate text-xs" dir="ltr">
                      {address ? (
                        <span className="text-navy/60">{address}</span>
                      ) : (
                        <span className="text-orange">{n.notConfigured}</span>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  {template.required ? (
                    <span title={n.requiredHint}>
                      <Badge tone="blue">{n.required}</Badge>
                    </span>
                  ) : (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={template.isActive}
                      aria-label={`${template.name} : ${template.isActive ? n.on : n.off}`}
                      disabled={toggle.isPending}
                      onClick={() => toggle.mutate({ key: template.key, isActive: !template.isActive })}
                      className={
                        template.isActive
                          ? 'rounded-full bg-green px-3 py-1 text-xs font-bold text-white'
                          : 'rounded-full bg-navy/10 px-3 py-1 text-xs font-bold text-navy/60'
                      }
                    >
                      {template.isActive ? n.on : n.off}
                    </button>
                  )}
                  <Link
                    to={`/admin/emails/modeles?key=${template.key}`}
                    className="text-xs font-semibold text-blue hover:underline"
                  >
                    {n.editTemplate}
                  </Link>
                  {needsAddress && (
                    <Link
                      to="/admin/emails/configuration"
                      className="text-xs font-semibold text-blue hover:underline"
                    >
                      {n.editRecipient}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="flex items-start gap-2 rounded-xl bg-blue/5 px-4 py-3 text-sm text-navy/70">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue" aria-hidden />
        {n.smtpAlertNote}
      </p>
    </div>
  );
};

export default NotificationsAdmin;
