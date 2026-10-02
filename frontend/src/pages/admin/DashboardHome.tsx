import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpLeft,
  ArrowUpRight,
  BarChart3,
  Building2,
  Database,
  FileText,
  HardDrive,
  Images,
  Mail,
  Target,
} from 'lucide-react';
import api from '../../lib/api/axios';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { useT } from '../../lib/i18n/useT';
import { localizedOrSource } from '../../lib/i18n/resolve';
import { formatBytes } from '../../lib/queries/adminHooks';
import { PageHeader } from '../../components/admin/ui/PageHeader';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States';
import { Badge } from '../../components/ui/Badge';

interface Stats {
  missions: { total: number; published: number };
  news: { total: number; published: number };
  gallery: { albums: number; images: number };
  partners: { total: number; published: number };
  impact: { total: number };
  media: { total: number; totalSize: number };
  messages: { total: number; unread: number };
}

export const DashboardHome = () => {
  const t = useT();
  const { locale, isRtl } = useLocale();
  const { user, can } = useAuth();

  const statsQuery = useQuery<Stats>({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: async () => (await api.get('/dashboard/stats')).data,
  });

  const overviewQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'overview'],
    queryFn: async () => (await api.get('/dashboard/overview')).data,
    enabled: can('ADMIN'),
  });

  const healthQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'health'],
    queryFn: async () => (await api.get('/dashboard/health')).data,
    enabled: can('ADMIN'),
  });

  const stats = statsQuery.data;

  // The activity feed can carry an action or a resource this build does not know
  // about yet, so an unknown key falls back to the raw value from the API.
  const actionLabel = (key: string) =>
    (t.admin.dashboard.actions as Record<string, string>)[key] ?? key;
  const resourceLabel = (key: string) =>
    (t.admin.dashboard.resources as Record<string, string>)[key] ?? key;

  /* An outbound arrow points the way the page is read, so it turns around in Arabic. */
  const OutboundArrow = isRtl ? ArrowUpLeft : ArrowUpRight;

  const cards = [
    {
      label: t.admin.dashboard.cardNews,
      value: stats?.news.total,
      detail: stats ? t.admin.dashboard.publishedFeminine(stats.news.published) : undefined,
      icon: FileText,
      href: '/admin/actualites',
      tone: 'bg-blue/10 text-blue',
    },
    {
      label: t.admin.dashboard.cardMissions,
      value: stats?.missions.total,
      detail: stats ? t.admin.dashboard.publishedMasculine(stats.missions.published) : undefined,
      icon: Target,
      href: '/admin/missions',
      tone: 'bg-green/15 text-[#4d7c0f]',
    },
    {
      label: t.admin.dashboard.cardGallery,
      value: stats?.gallery.images,
      detail: stats ? t.admin.dashboard.albumCount(stats.gallery.albums) : undefined,
      icon: Images,
      href: '/admin/galerie',
      tone: 'bg-orange/10 text-orange',
    },
    {
      label: t.admin.dashboard.cardPartners,
      value: stats?.partners.total,
      detail: stats ? t.admin.dashboard.publishedMasculine(stats.partners.published) : undefined,
      icon: Building2,
      href: '/admin/partenaires',
      tone: 'bg-navy/10 text-navy',
      minRole: 'ADMIN' as const,
    },
    {
      label: t.admin.dashboard.cardImpact,
      value: stats?.impact.total,
      icon: BarChart3,
      href: '/admin/impact',
      tone: 'bg-blue/10 text-blue',
      minRole: 'ADMIN' as const,
    },
    {
      label: t.admin.dashboard.cardMessages,
      value: stats?.messages.unread,
      detail: stats ? t.admin.dashboard.messagesTotal(stats.messages.total) : undefined,
      icon: Mail,
      href: '/admin/messages',
      tone: 'bg-orange/10 text-orange',
      minRole: 'ADMIN' as const,
    },
  ].filter((card) => !card.minRole || can(card.minRole));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.admin.dashboard.greeting(user?.firstName ?? '')}
        description={t.admin.dashboard.description}
      />

      {statsQuery.isError ? (
        <ErrorState onRetry={() => void statsQuery.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.label}
              to={card.href}
              className="group flex items-start justify-between gap-4 rounded-xl border border-navy/8 bg-white p-5 transition-all hover:border-blue/40 hover:shadow-sm"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-navy/55">{card.label}</p>
                {statsQuery.isLoading ? (
                  <Skeleton className="mt-2 h-8 w-14" />
                ) : (
                  <p className="mt-1 text-3xl font-extrabold tabular-nums text-navy">
                    {card.value ?? 0}
                  </p>
                )}
                {card.detail && <p className="mt-1 text-xs text-navy/45">{card.detail}</p>}
              </div>
              <div className="flex flex-col items-end gap-3">
                <span className={`rounded-xl p-2.5 ${card.tone}`}>
                  <card.icon className="h-5 w-5" />
                </span>
                <OutboundArrow className="h-4 w-4 text-navy/25 transition-colors group-hover:text-blue" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {can('ADMIN') && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Latest articles */}
          <section className="rounded-xl border border-navy/8 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-navy/55">
                {t.admin.dashboard.latestNews}
              </h2>
              <Link to="/admin/actualites" className="text-xs font-semibold text-blue hover:underline">
                {t.admin.dashboard.seeAll}
              </Link>
            </div>

            {overviewQuery.isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !overviewQuery.data?.recentNews?.length ? (
              <EmptyState
                title={t.admin.dashboard.emptyNewsTitle}
                description={t.admin.dashboard.emptyNewsDescription}
                icon={FileText}
                className="border-0 py-8"
              />
            ) : (
              <ul className="divide-y divide-navy/6">
                {overviewQuery.data.recentNews.map((item: any) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <Link
                      to={`/admin/actualites?edit=${item.id}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium text-navy hover:text-blue"
                    >
                      {localizedOrSource(item.title, locale).text || t.admin.dashboard.untitled}
                    </Link>
                    <Badge tone={item.isPublished ? 'green' : 'neutral'}>
                      {item.isPublished ? t.admin.common.published : t.admin.common.draft}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Unread messages */}
          <section className="rounded-xl border border-navy/8 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-navy/55">
                {t.admin.dashboard.unreadMessages}
              </h2>
              <Link to="/admin/messages" className="text-xs font-semibold text-blue hover:underline">
                {t.admin.dashboard.seeAll}
              </Link>
            </div>

            {overviewQuery.isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !overviewQuery.data?.recentMessages?.length ? (
              <EmptyState
                title={t.admin.dashboard.emptyMessagesTitle}
                description={t.admin.dashboard.emptyMessagesDescription}
                icon={Mail}
                className="border-0 py-8"
              />
            ) : (
              <ul className="divide-y divide-navy/6">
                {overviewQuery.data.recentMessages.map((message: any) => (
                  <li key={message.id} className="py-3">
                    <Link to="/admin/messages" className="block">
                      <p className="truncate text-sm font-semibold text-navy">{message.subject}</p>
                      <p className="truncate text-xs text-navy/50">
                        {message.name} · {message.email}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {can('ADMIN') && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-4 rounded-xl border border-navy/8 bg-white p-5">
            <span className="rounded-xl bg-navy/8 p-2.5 text-navy">
              <HardDrive className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-navy/55">{t.admin.dashboard.storageUsed}</p>
              <p className="text-lg font-bold text-navy">
                {formatBytes(stats?.media.totalSize ?? 0, locale)}
              </p>
              <p className="text-xs text-navy/45">
                {t.admin.dashboard.fileCount(stats?.media.total ?? 0)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-navy/8 bg-white p-5">
            <span className="rounded-xl bg-navy/8 p-2.5 text-navy">
              <Database className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-navy/55">{t.admin.dashboard.database}</p>
              <Badge tone={healthQuery.data?.database ? 'green' : 'red'}>
                {healthQuery.data?.database
                  ? t.admin.dashboard.databaseConnected
                  : t.admin.dashboard.databaseUnavailable}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-navy/8 bg-white p-5">
            <span className="rounded-xl bg-navy/8 p-2.5 text-navy">
              <Images className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-navy/55">{t.admin.dashboard.imageStorage}</p>
              <Badge tone={healthQuery.data?.storage ? 'green' : 'red'}>
                {healthQuery.data?.storage
                  ? t.admin.dashboard.storageConnected
                  : t.admin.dashboard.storageUnavailable}
              </Badge>
            </div>
          </div>
        </section>
      )}

      {can('SUPER_ADMIN') && overviewQuery.data?.recentActivity?.length > 0 && (
        <section className="rounded-xl border border-navy/8 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy/55">
              {t.admin.dashboard.recentActivity}
            </h2>
            <Link to="/admin/journal" className="text-xs font-semibold text-blue hover:underline">
              {t.admin.dashboard.fullLog}
            </Link>
          </div>
          <ul className="divide-y divide-navy/6">
            {overviewQuery.data.recentActivity.map((entry: any) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-x-1.5 py-2.5 text-sm">
                <span className="font-semibold text-navy">
                  {entry.user
                    ? [entry.user.firstName, entry.user.lastName].filter(Boolean).join(' ') ||
                      entry.user.email
                    : t.admin.dashboard.system}
                </span>
                <span className="text-navy/60">{actionLabel(entry.action)}</span>
                <span className="text-navy/60">{resourceLabel(entry.resource)}</span>
                <span className="ms-auto text-xs text-navy/40">
                  {t.admin.common.formatDateTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
