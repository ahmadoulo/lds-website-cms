import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
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
import { formatBytes } from '../../lib/queries/adminHooks';
import { PageHeader } from '../../components/admin/ui/PageHeader';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States';
import { Badge } from '../../components/ui/Badge';
import { t } from '../../lib/types';

interface Stats {
  missions: { total: number; published: number };
  news: { total: number; published: number };
  gallery: { albums: number; images: number };
  partners: { total: number; published: number };
  impact: { total: number };
  media: { total: number; totalSize: number };
  messages: { total: number; unread: number };
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'a créé',
  UPDATE: 'a modifié',
  DELETE: 'a supprimé',
  LOGIN: "s'est connecté",
  LOGOUT: "s'est déconnecté",
  LOGIN_FAILED: 'a échoué à se connecter',
  PASSWORD_CHANGED: 'a changé son mot de passe',
};

const RESOURCE_LABELS: Record<string, string> = {
  News: 'une actualité',
  Mission: "un domaine d'action",
  Partner: 'un partenaire',
  ImpactStatistic: 'un chiffre clé',
  GalleryAlbum: 'un album',
  Media: 'un média',
  Donation: 'un moyen de soutien',
  NavigationItem: 'un lien de navigation',
  ContactMessage: 'un message',
  User: 'un compte',
};

export const DashboardHome = () => {
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

  const cards = [
    {
      label: 'Actualités',
      value: stats?.news.total,
      detail: stats ? `${stats.news.published} publiée(s)` : undefined,
      icon: FileText,
      href: '/admin/actualites',
      tone: 'bg-blue/10 text-blue',
    },
    {
      label: "Domaines d'action",
      value: stats?.missions.total,
      detail: stats ? `${stats.missions.published} publié(s)` : undefined,
      icon: Target,
      href: '/admin/missions',
      tone: 'bg-green/15 text-[#4d7c0f]',
    },
    {
      label: 'Photos en galerie',
      value: stats?.gallery.images,
      detail: stats ? `${stats.gallery.albums} album(s)` : undefined,
      icon: Images,
      href: '/admin/galerie',
      tone: 'bg-orange/10 text-orange',
    },
    {
      label: 'Partenaires',
      value: stats?.partners.total,
      detail: stats ? `${stats.partners.published} publié(s)` : undefined,
      icon: Building2,
      href: '/admin/partenaires',
      tone: 'bg-navy/10 text-navy',
      minRole: 'ADMIN' as const,
    },
    {
      label: 'Chiffres clés',
      value: stats?.impact.total,
      icon: BarChart3,
      href: '/admin/impact',
      tone: 'bg-blue/10 text-blue',
      minRole: 'ADMIN' as const,
    },
    {
      label: 'Messages non lus',
      value: stats?.messages.unread,
      detail: stats ? `${stats.messages.total} au total` : undefined,
      icon: Mail,
      href: '/admin/messages',
      tone: 'bg-orange/10 text-orange',
      minRole: 'ADMIN' as const,
    },
  ].filter((card) => !card.minRole || can(card.minRole));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bonjour ${user?.firstName ?? ''}`.trim()}
        description="Voici l'état actuel du contenu publié sur le site."
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
                <ArrowUpRight className="h-4 w-4 text-navy/25 transition-colors group-hover:text-blue" />
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
                Dernières actualités
              </h2>
              <Link to="/admin/actualites" className="text-xs font-semibold text-blue hover:underline">
                Tout voir
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
                title="Aucune actualité"
                description="Publiez votre première actualité pour la voir apparaître ici."
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
                      {t(item.title, 'Sans titre')}
                    </Link>
                    <Badge tone={item.isPublished ? 'green' : 'neutral'}>
                      {item.isPublished ? 'Publié' : 'Brouillon'}
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
                Messages non lus
              </h2>
              <Link to="/admin/messages" className="text-xs font-semibold text-blue hover:underline">
                Tout voir
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
                title="Aucun message en attente"
                description="Les messages envoyés depuis le formulaire de contact apparaissent ici."
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
              <p className="text-sm font-medium text-navy/55">Stockage utilisé</p>
              <p className="text-lg font-bold text-navy">
                {formatBytes(stats?.media.totalSize ?? 0)}
              </p>
              <p className="text-xs text-navy/45">{stats?.media.total ?? 0} fichier(s)</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-navy/8 bg-white p-5">
            <span className="rounded-xl bg-navy/8 p-2.5 text-navy">
              <Database className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-navy/55">Base de données</p>
              <Badge tone={healthQuery.data?.database ? 'green' : 'red'}>
                {healthQuery.data?.database ? 'Connectée' : 'Indisponible'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-navy/8 bg-white p-5">
            <span className="rounded-xl bg-navy/8 p-2.5 text-navy">
              <Images className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-navy/55">Stockage des images</p>
              <Badge tone={healthQuery.data?.storage ? 'green' : 'red'}>
                {healthQuery.data?.storage ? 'Connecté' : 'Indisponible'}
              </Badge>
            </div>
          </div>
        </section>
      )}

      {can('SUPER_ADMIN') && overviewQuery.data?.recentActivity?.length > 0 && (
        <section className="rounded-xl border border-navy/8 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy/55">
              Activité récente
            </h2>
            <Link to="/admin/journal" className="text-xs font-semibold text-blue hover:underline">
              Journal complet
            </Link>
          </div>
          <ul className="divide-y divide-navy/6">
            {overviewQuery.data.recentActivity.map((entry: any) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-x-1.5 py-2.5 text-sm">
                <span className="font-semibold text-navy">
                  {entry.user
                    ? [entry.user.firstName, entry.user.lastName].filter(Boolean).join(' ') ||
                      entry.user.email
                    : 'Système'}
                </span>
                <span className="text-navy/60">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                <span className="text-navy/60">
                  {RESOURCE_LABELS[entry.resource] ?? entry.resource}
                </span>
                <span className="ml-auto text-xs text-navy/40">
                  {new Date(entry.createdAt).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
