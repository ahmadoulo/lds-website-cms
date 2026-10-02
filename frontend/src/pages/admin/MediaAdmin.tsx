import React, { useRef, useState } from 'react';
import { Eraser, ImageIcon, Link2, Pencil, Trash2, Upload } from 'lucide-react';
import api from '../../lib/api/axios';
import { apiErrorMessage } from '../../lib/apiErrorMessage';
import { useLocale } from '../../context/LocaleContext';
import { useT } from '../../lib/i18n/useT';
import { localized, localizedOrSource } from '../../lib/i18n/resolve';
import {
  formatBytes,
  useAdminMutation,
  useMediaFolders,
  useMediaLibrary,
  uploadMedia,
  validateImageFile,
} from '../../lib/queries/adminHooks';
import { useToast } from '../../components/ui/Toast';
import { PageHeader } from '../../components/admin/ui/PageHeader';
import { SearchInput } from '../../components/admin/ui/SearchInput';
import { Pagination } from '../../components/admin/ui/Pagination';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { Field, Textarea } from '../../components/ui/Field';
import { EmptyState, ErrorState, LoadingState, Spinner } from '../../components/ui/States';
import { cn } from '../../lib/cn';
import type { Media } from '../../lib/types';

export const MediaAdmin = () => {
  const t = useT();
  const { locale } = useLocale();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [folder, setFolder] = useState('');
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Media | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const [editingAlt, setEditingAlt] = useState<Media | null>(null);
  const [altDraft, setAltDraft] = useState('');

  const libraryQuery = useMediaLibrary({ page, folder, search });
  const foldersQuery = useMediaFolders();

  const purgeMutation = useAdminMutation<void>({
    mutationFn: async () => (await api.delete('/media/orphans')).data,
    successMessage: t.admin.media.purged,
    invalidate: [['admin', 'media']],
    onSuccess: () => setIsPurging(false),
  });

  const deleteMutation = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/media/${id}`)).data,
    successMessage: t.admin.media.deleted,
    invalidate: [['admin', 'media']],
    onSuccess: () => setPendingDelete(null),
  });

  const altMutation = useAdminMutation<{ id: string; altText: string }>({
    mutationFn: async ({ id, altText }) =>
      (await api.patch(`/media/${id}`, { altText: altText ? { fr: altText } : undefined })).data,
    successMessage: t.admin.media.altSaved,
    invalidate: [['admin', 'media']],
    onSuccess: () => setEditingAlt(null),
  });

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;

    setIsUploading(true);
    let uploaded = 0;
    try {
      for (const file of Array.from(files)) {
        const validationError = validateImageFile(file, false, locale);
        if (validationError) {
          toast.error(t.admin.gallery.fileError(file.name, validationError));
          continue;
        }
        await uploadMedia(file, folder || 'general');
        uploaded += 1;
      }
      if (uploaded > 0) {
        await libraryQuery.refetch();
        await foldersQuery.refetch();
        toast.success(t.admin.media.uploaded(uploaded));
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, t.admin.media.uploadFailed, locale));
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const folderButtonClass = (isActive: boolean) =>
    cn(
      'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
      isActive ? 'bg-navy text-white' : 'bg-white text-navy/60 ring-1 ring-navy/10 hover:text-navy',
    );

  return (
    <div>
      <PageHeader
        title={t.admin.media.title}
        description={t.admin.media.description}
        actions={
          <>
            <Button variant="outline" onClick={() => setIsPurging(true)}>
              <Eraser className="h-4 w-4" /> {t.admin.media.purgeButton}
            </Button>
            <Button onClick={() => inputRef.current?.click()} isLoading={isUploading}>
              <Upload className="h-4 w-4" /> {t.admin.media.uploadButton}
            </Button>
          </>
        }
      />

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(event) => void handleUpload(event.target.files)}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder={t.admin.media.searchPlaceholder}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setFolder('');
              setPage(1);
            }}
            className={folderButtonClass(folder === '')}
          >
            {t.admin.media.allFolders}
          </button>
          {foldersQuery.data?.map((item) => (
            <button
              key={item.folder}
              type="button"
              onClick={() => {
                setFolder(item.folder);
                setPage(1);
              }}
              className={folderButtonClass(folder === item.folder)}
            >
              {item.folder} ({item.count})
            </button>
          ))}
        </div>
      </div>

      {libraryQuery.isLoading ? (
        <LoadingState />
      ) : libraryQuery.isError ? (
        <ErrorState onRetry={() => void libraryQuery.refetch()} />
      ) : !libraryQuery.data?.data.length ? (
        <EmptyState
          icon={ImageIcon}
          title={search || folder ? t.admin.common.noResults : t.admin.media.emptyTitle}
          description={
            search || folder
              ? t.admin.media.emptyFilteredDescription
              : t.admin.media.emptyDescription
          }
          action={
            !search && !folder ? (
              <Button onClick={() => inputRef.current?.click()}>
                <Upload className="h-4 w-4" /> {t.admin.media.emptyAction}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {libraryQuery.data.data.map((media) => (
              <figure
                key={media.id}
                className="group overflow-hidden rounded-xl border border-navy/8 bg-white"
              >
                <div className="relative">
                  <img
                    src={media.url}
                    alt={localizedOrSource(media.altText, locale).text || media.originalName}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                  <div className="absolute end-2 top-2 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAlt(media);
                        setAltDraft(localized(media.altText, 'fr'));
                      }}
                      aria-label={t.admin.media.describeAria(media.originalName)}
                      className="rounded-lg bg-white/90 p-1.5 text-navy shadow transition-colors hover:bg-white"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={media.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={t.admin.media.viewFullSizeAria(media.originalName)}
                      className="rounded-lg bg-white/90 p-1.5 text-navy shadow transition-colors hover:bg-white"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(media)}
                      disabled={Boolean(media.usedIn?.length)}
                      title={
                        media.usedIn?.length
                          ? t.admin.media.usedIn(media.usedIn.join(' · '))
                          : undefined
                      }
                      aria-label={t.admin.media.deleteAria(media.originalName)}
                      className="rounded-lg bg-white/90 p-1.5 text-red-600 shadow transition-colors hover:bg-white disabled:cursor-not-allowed disabled:text-navy/25"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <figcaption className="px-3 py-2.5">
                  <p className="truncate text-xs font-semibold text-navy" title={media.originalName}>
                    {media.originalName}
                  </p>
                  <p className="mt-0.5 text-xs text-navy/45">
                    {media.width && media.height ? `${media.width}×${media.height} · ` : ''}
                    {formatBytes(media.size, locale)}
                  </p>
                  <p className="text-xs text-navy/40">
                    {media.folder} · {t.admin.common.formatDate(media.createdAt)}
                  </p>

                  {media.usedIn && media.usedIn.length > 0 ? (
                    <p
                      className="mt-1.5 flex items-start gap-1 text-xs font-medium text-[#4d7c0f]"
                      title={media.usedIn.join(' · ')}
                    >
                      <Link2 className="mt-px h-3 w-3 shrink-0" aria-hidden />
                      <span className="line-clamp-2">
                        {t.admin.media.usedIn(media.usedIn.join(' · '))}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-navy/35">{t.admin.media.notUsed}</p>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>

          <Pagination
            page={libraryQuery.data.meta.page}
            totalPages={libraryQuery.data.meta.totalPages}
            total={libraryQuery.data.meta.total}
            onPageChange={setPage}
          />
        </>
      )}

      {isUploading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-navy/60">
          <Spinner className="h-4 w-4" /> {t.admin.media.uploading}
        </div>
      )}

      <Modal
        isOpen={Boolean(editingAlt)}
        onClose={() => setEditingAlt(null)}
        title={t.admin.media.altTitle}
        description={t.admin.media.altDescription}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingAlt(null)}>
              {t.common.cancel}
            </Button>
            <Button
              isLoading={altMutation.isPending}
              onClick={() =>
                editingAlt && altMutation.mutate({ id: editingAlt.id, altText: altDraft.trim() })
              }
            >
              {t.common.save}
            </Button>
          </>
        }
      >
        {editingAlt && (
          <div className="space-y-4">
            <img
              src={editingAlt.url}
              alt={localizedOrSource(editingAlt.altText, locale).text || editingAlt.originalName}
              className="max-h-48 w-full rounded-lg object-contain"
            />
            <Field
              label={t.admin.media.altLabel}
              htmlFor="media-alt"
              hint={t.admin.media.altHint}
            >
              <Textarea
                id="media-alt"
                rows={3}
                value={altDraft}
                onChange={(event) => setAltDraft(event.target.value)}
                placeholder={t.admin.media.altPlaceholder}
              />
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={isPurging}
        title={t.admin.media.purgeTitle}
        message={t.admin.media.purgeMessage}
        confirmLabel={t.admin.media.purgeConfirm}
        isLoading={purgeMutation.isPending}
        onCancel={() => setIsPurging(false)}
        onConfirm={() => purgeMutation.mutate()}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title={t.admin.media.deleteTitle}
        message={t.admin.media.deleteMessage(pendingDelete?.originalName ?? '')}
        isLoading={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
      />
    </div>
  );
};
