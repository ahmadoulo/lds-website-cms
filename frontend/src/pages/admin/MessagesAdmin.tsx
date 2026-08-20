import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, MailOpen, Trash2 } from 'lucide-react';
import api from '../../lib/api/axios';
import { useAdminMutation } from '../../lib/queries/adminHooks';
import { PageHeader } from '../../components/admin/ui/PageHeader';
import { SearchInput } from '../../components/admin/ui/SearchInput';
import { Pagination } from '../../components/admin/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { IconButton } from '../../components/admin/ui/DataTable';
import { cn } from '../../lib/cn';
import type { ContactMessage, Paginated } from '../../lib/types';

type Filter = 'all' | 'unread' | 'read';

export const MessagesAdmin = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [opened, setOpened] = useState<ContactMessage | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ContactMessage | null>(null);

  const listQuery = useQuery({
    queryKey: ['admin', 'contact', page, search, filter],
    queryFn: async () =>
      (
        await api.get<Paginated<ContactMessage>>('/contact', {
          params: {
            page,
            limit: 15,
            search: search || undefined,
            isRead: filter === 'all' ? undefined : String(filter === 'read'),
          },
        })
      ).data,
  });

  const setRead = useAdminMutation<{ id: string; isRead: boolean }>({
    mutationFn: async ({ id, isRead }) => (await api.patch(`/contact/${id}`, { isRead })).data,
    successMessage: 'Message mis à jour.',
    invalidate: [['admin', 'contact'], ['admin', 'dashboard']],
  });

  const deleteMutation = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/contact/${id}`)).data,
    successMessage: 'Message supprimé.',
    invalidate: [['admin', 'contact'], ['admin', 'dashboard']],
    onSuccess: () => {
      setPendingDelete(null);
      setOpened(null);
    },
  });

  /** Opening a message marks it read, which is what an inbox is expected to do. */
  const openMessage = (message: ContactMessage) => {
    setOpened(message);
    if (!message.isRead) {
      setRead.mutate({ id: message.id, isRead: true });
    }
  };

  const filterClass = (isActive: boolean) =>
    cn(
      'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
      isActive ? 'bg-navy text-white' : 'bg-white text-navy/60 ring-1 ring-navy/10 hover:text-navy',
    );

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Les messages envoyés depuis le formulaire de contact du site."
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Rechercher un message…"
        />

        <div className="flex gap-2">
          {(['all', 'unread', 'read'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
              className={filterClass(filter === value)}
            >
              {value === 'all' ? 'Tous' : value === 'unread' ? 'Non lus' : 'Lus'}
            </button>
          ))}
        </div>
      </div>

      {listQuery.isLoading ? (
        <LoadingState />
      ) : listQuery.isError ? (
        <ErrorState onRetry={() => void listQuery.refetch()} />
      ) : !listQuery.data?.data.length ? (
        <EmptyState
          icon={Mail}
          title={search || filter !== 'all' ? 'Aucun résultat' : 'Aucun message'}
          description={
            search || filter !== 'all'
              ? 'Aucun message ne correspond à ces critères.'
              : 'Les messages envoyés depuis la page Contact apparaîtront ici.'
          }
        />
      ) : (
        <>
          <ul className="divide-y divide-navy/8 overflow-hidden rounded-xl border border-navy/8 bg-white">
            {listQuery.data.data.map((message) => (
              <li key={message.id} className="flex items-start gap-3 px-4 py-4 sm:px-5">
                <button
                  type="button"
                  onClick={() => openMessage(message)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'truncate text-sm',
                        message.isRead ? 'font-medium text-navy/70' : 'font-bold text-navy',
                      )}
                    >
                      {message.subject}
                    </span>
                    {!message.isRead && <Badge tone="orange">Non lu</Badge>}
                  </div>
                  <p className="mt-1 truncate text-xs text-navy/55">
                    {message.name} · {message.email}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-navy/45">{message.message}</p>
                </button>

                <div className="flex shrink-0 items-center gap-1">
                  <span className="hidden pr-2 text-xs text-navy/40 sm:inline">
                    {new Date(message.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                  <IconButton
                    label={message.isRead ? 'Marquer comme non lu' : 'Marquer comme lu'}
                    icon={message.isRead ? Mail : MailOpen}
                    onClick={() => setRead.mutate({ id: message.id, isRead: !message.isRead })}
                    disabled={setRead.isPending}
                  />
                  <IconButton
                    label="Supprimer"
                    icon={Trash2}
                    tone="danger"
                    onClick={() => setPendingDelete(message)}
                  />
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            page={listQuery.data.meta.page}
            totalPages={listQuery.data.meta.totalPages}
            total={listQuery.data.meta.total}
            onPageChange={setPage}
          />
        </>
      )}

      <Modal
        isOpen={Boolean(opened)}
        onClose={() => setOpened(null)}
        title={opened?.subject ?? ''}
        description={
          opened
            ? `${opened.name} · ${new Date(opened.createdAt).toLocaleString('fr-FR')}`
            : undefined
        }
        footer={
          opened ? (
            <>
              <Button variant="danger" onClick={() => setPendingDelete(opened)}>
                <Trash2 className="h-4 w-4" /> Supprimer
              </Button>
              <Button
                onClick={() => {
                  const subject = encodeURIComponent(`Re : ${opened.subject}`);
                  window.location.href = `mailto:${opened.email}?subject=${subject}`;
                }}
              >
                Répondre par email
              </Button>
            </>
          ) : undefined
        }
      >
        {opened && (
          <div className="space-y-4">
            <div className="rounded-lg bg-warm-muted px-4 py-3 text-sm">
              <p className="text-navy/60">
                De : <span className="font-semibold text-navy">{opened.name}</span>
              </p>
              <a href={`mailto:${opened.email}`} className="text-blue hover:underline">
                {opened.email}
              </a>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-navy/80">
              {opened.message}
            </p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Supprimer ce message ?"
        message="Le message sera définitivement supprimé. Cette action est irréversible."
        isLoading={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </div>
  );
};
