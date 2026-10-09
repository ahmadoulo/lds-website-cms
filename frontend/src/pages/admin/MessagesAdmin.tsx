import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Mail, MailOpen, Trash2 } from 'lucide-react';
import api from '../../lib/api/axios';
import { useT } from '../../lib/i18n/useT';
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
import { ContactEmails } from '../../components/admin/email/EmailParts';

type Filter = 'all' | 'unread' | 'read';

export const MessagesAdmin = () => {
  const t = useT();
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
    successMessage: t.admin.messages.updated,
    invalidate: [['admin', 'contact'], ['admin', 'dashboard']],
  });

  const deleteMutation = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/contact/${id}`)).data,
    successMessage: t.admin.messages.deleted,
    invalidate: [['admin', 'contact'], ['admin', 'dashboard']],
    onSuccess: () => {
      setPendingDelete(null);
      setOpened(null);
    },
  });

  /*
    `?id=` opens one message directly. The team's notification email links
    here, and landing on the list with the message somewhere in it would
    leave them looking for the thing the email was about.
  */
  const [params, setParams] = useSearchParams();
  const linkedId = params.get('id');
  const linked = useQuery({
    queryKey: ['admin', 'contact', 'one', linkedId],
    enabled: Boolean(linkedId),
    queryFn: async () => (await api.get<ContactMessage>(`/contact/${linkedId}`)).data,
  });
  useEffect(() => {
    if (linked.data) openMessage(linked.data);
    // Opened once per link; the effect must not reopen it after closing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked.data]);

  const closeMessage = () => {
    setOpened(null);
    if (linkedId) {
      const next = new URLSearchParams(params);
      next.delete('id');
      setParams(next, { replace: true });
    }
  };

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
      <PageHeader title={t.admin.messages.title} description={t.admin.messages.description} />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder={t.admin.messages.searchPlaceholder}
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
              {value === 'all'
                ? t.admin.messages.filterAll
                : value === 'unread'
                  ? t.admin.messages.filterUnread
                  : t.admin.messages.filterRead}
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
          title={
            search || filter !== 'all' ? t.admin.common.noResults : t.admin.messages.emptyTitle
          }
          description={
            search || filter !== 'all'
              ? t.admin.messages.emptyFilteredDescription
              : t.admin.messages.emptyDescription
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
                  className="min-w-0 flex-1 text-start"
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
                    {!message.isRead && <Badge tone="orange">{t.admin.messages.unreadBadge}</Badge>}
                  </div>
                  <p className="mt-1 truncate text-xs text-navy/55">
                    {message.name} · {message.email}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-navy/45">{message.message}</p>
                </button>

                <div className="flex shrink-0 items-center gap-1">
                  <span className="hidden pe-2 text-xs text-navy/40 sm:inline">
                    {t.admin.common.formatDate(message.createdAt)}
                  </span>
                  <IconButton
                    label={
                      message.isRead ? t.admin.messages.markAsUnread : t.admin.messages.markAsRead
                    }
                    icon={message.isRead ? Mail : MailOpen}
                    onClick={() => setRead.mutate({ id: message.id, isRead: !message.isRead })}
                    disabled={setRead.isPending}
                  />
                  <IconButton
                    label={t.common.delete}
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
        onClose={closeMessage}
        title={opened?.subject ?? ''}
        description={
          opened
            ? `${opened.name} · ${t.admin.common.formatDateTime(opened.createdAt)}`
            : undefined
        }
        footer={
          opened ? (
            <>
              <Button variant="danger" onClick={() => setPendingDelete(opened)}>
                <Trash2 className="h-4 w-4" /> {t.common.delete}
              </Button>
              <Button
                onClick={() => {
                  const subject = encodeURIComponent(t.admin.messages.replySubject(opened.subject));
                  window.location.href = `mailto:${opened.email}?subject=${subject}`;
                }}
              >
                {t.admin.messages.replyByEmail}
              </Button>
            </>
          ) : undefined
        }
      >
        {opened && (
          <div className="space-y-4">
            <div className="rounded-lg bg-warm-muted px-4 py-3 text-sm">
              <p className="text-navy/60">
                {t.admin.messages.fromLabel}{' '}
                <span className="font-semibold text-navy">{opened.name}</span>
              </p>
              <a href={`mailto:${opened.email}`} className="text-blue hover:underline">
                {opened.email}
              </a>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-navy/80">
              {opened.message}
            </p>
            <ContactEmails contactId={opened.id} />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title={t.admin.messages.deleteTitle}
        message={t.admin.messages.deleteMessage}
        isLoading={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </div>
  );
};
