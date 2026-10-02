import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Edit2, Eye, EyeOff, Images, Plus, Trash2, Upload } from 'lucide-react';
import api from '../../lib/api/axios';
import { apiErrorMessage } from '../../lib/apiErrorMessage';
import { useLocale } from '../../context/LocaleContext';
import { useT } from '../../lib/i18n/useT';
import { localized, localizedOrSource } from '../../lib/i18n/resolve';
import { useAdminMutation, uploadMedia, validateImageFile } from '../../lib/queries/adminHooks';
import { useToast } from '../../components/ui/Toast';
import { PageHeader } from '../../components/admin/ui/PageHeader';
import { PreviewButton } from '../../components/admin/ui/PreviewButton';
import { MediaLibraryModal } from '../../components/admin/ui/MediaPicker';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { Checkbox, Field, Input, Textarea } from '../../components/ui/Field';
import { EmptyState, ErrorState, LoadingState, Spinner } from '../../components/ui/States';
import { IconButton } from '../../components/admin/ui/DataTable';
import type { GalleryAlbum, GalleryImage } from '../../lib/types';

interface AlbumFormValues {
  title: string;
  description: string;
  isPublished: boolean;
}

const EMPTY_FORM: AlbumFormValues = { title: '', description: '', isPublished: true };

export const GalleryAdmin = () => {
  const t = useT();
  const { locale } = useLocale();
  const toast = useToast();
  const [editingAlbum, setEditingAlbum] = useState<GalleryAlbum | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingAlbumDelete, setPendingAlbumDelete] = useState<GalleryAlbum | null>(null);
  const [pendingImageDelete, setPendingImageDelete] = useState<GalleryImage | null>(null);
  const [libraryAlbumId, setLibraryAlbumId] = useState<string | null>(null);
  const [uploadingAlbumId, setUploadingAlbumId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['admin', 'gallery'],
    queryFn: async () => (await api.get<GalleryAlbum[]>('/gallery')).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AlbumFormValues>({ defaultValues: EMPTY_FORM });

  const openCreate = () => {
    setEditingAlbum(null);
    reset(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEdit = (album: GalleryAlbum) => {
    setEditingAlbum(album);
    reset({
      // The form writes the French source, whatever language the screen is in.
      title: localized(album.title, 'fr'),
      description: localized(album.description, 'fr'),
      isPublished: album.isPublished,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingAlbum(null);
    reset(EMPTY_FORM);
  };

  const saveAlbum = useAdminMutation<AlbumFormValues>({
    mutationFn: async (values) => {
      const payload = {
        title: { fr: values.title },
        description: values.description.trim() ? { fr: values.description } : undefined,
        isPublished: values.isPublished,
      };

      return editingAlbum
        ? (await api.patch(`/gallery/${editingAlbum.id}`, payload)).data
        : (await api.post('/gallery', payload)).data;
    },
    successMessage: editingAlbum ? t.admin.gallery.albumUpdated : t.admin.gallery.albumCreated,
    invalidate: [['admin', 'gallery']],
    onSuccess: closeForm,
  });

  const toggleAlbum = useAdminMutation<GalleryAlbum>({
    mutationFn: async (album) =>
      (await api.patch(`/gallery/${album.id}`, { isPublished: !album.isPublished })).data,
    successMessage: t.admin.gallery.albumStatusUpdated,
    invalidate: [['admin', 'gallery']],
  });

  const deleteAlbum = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/gallery/${id}`)).data,
    successMessage: t.admin.gallery.albumDeleted,
    invalidate: [['admin', 'gallery']],
    onSuccess: () => setPendingAlbumDelete(null),
  });

  const attachImage = useAdminMutation<{ albumId: string; mediaId: string }>({
    mutationFn: async ({ albumId, mediaId }) =>
      (await api.post(`/gallery/${albumId}/images`, { mediaId })).data,
    successMessage: t.admin.gallery.photoAdded,
    invalidate: [['admin', 'gallery']],
  });

  const detachImage = useAdminMutation<string>({
    mutationFn: async (imageId) => (await api.delete(`/gallery/images/${imageId}`)).data,
    successMessage: t.admin.gallery.photoRemoved,
    invalidate: [['admin', 'gallery']],
    onSuccess: () => setPendingImageDelete(null),
  });

  /** Uploads straight into an album: one file picker, two API calls. */
  const handleUpload = async (albumId: string, files: FileList | null) => {
    if (!files?.length) return;

    setUploadingAlbumId(albumId);
    try {
      for (const file of Array.from(files)) {
        const validationError = validateImageFile(file, false, locale);
        if (validationError) {
          toast.error(t.admin.gallery.fileError(file.name, validationError));
          continue;
        }
        const media = await uploadMedia(file, 'gallery');
        await api.post(`/gallery/${albumId}/images`, { mediaId: media.id });
      }
      await listQuery.refetch();
      toast.success(t.admin.gallery.photosAdded);
    } catch (error) {
      toast.error(apiErrorMessage(error, t.admin.gallery.uploadFailed, locale));
    } finally {
      setUploadingAlbumId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title={t.admin.gallery.title}
        description={t.admin.gallery.description}
        actions={
          <>
            <PreviewButton path="/galerie" label={t.admin.common.preview} />
            <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> {t.admin.gallery.newAlbum}
            </Button>
          </>
        }
      />

      {listQuery.isLoading ? (
        <LoadingState />
      ) : listQuery.isError ? (
        <ErrorState onRetry={() => void listQuery.refetch()} />
      ) : !listQuery.data?.length ? (
        <EmptyState
          icon={Images}
          title={t.admin.gallery.emptyTitle}
          description={t.admin.gallery.emptyDescription}
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t.admin.gallery.emptyAction}
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {listQuery.data.map((album) => (
            <section key={album.id} className="rounded-xl border border-navy/8 bg-white p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-navy">
                      {localizedOrSource(album.title, locale).text}
                    </h2>
                    <Badge tone={album.isPublished ? 'green' : 'neutral'}>
                      {album.isPublished ? t.admin.common.published : t.admin.common.draft}
                    </Badge>
                  </div>
                  {album.description && (
                    <p className="mt-1 text-sm text-navy/60">
                      {localizedOrSource(album.description, locale).text}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-navy/45">
                    {t.admin.gallery.photoCount(album.images.length)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                      className="hidden"
                      onChange={(event) => {
                        void handleUpload(album.id, event.target.files);
                        event.target.value = '';
                      }}
                    />
                    <span className="inline-flex items-center gap-2 rounded-lg border border-navy/15 bg-white px-3 py-1.5 text-caption font-semibold text-navy transition-colors hover:border-navy/40">
                      {uploadingAlbumId === album.id ? (
                        <Spinner className="h-3.5 w-3.5" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {t.admin.gallery.upload}
                    </span>
                  </label>

                  <Button variant="ghost" size="sm" onClick={() => setLibraryAlbumId(album.id)}>
                    <Images className="h-3.5 w-3.5" /> {t.admin.gallery.library}
                  </Button>

                  <IconButton
                    label={album.isPublished ? t.admin.common.unpublish : t.admin.common.publish}
                    icon={album.isPublished ? EyeOff : Eye}
                    onClick={() => toggleAlbum.mutate(album)}
                    disabled={toggleAlbum.isPending}
                  />
                  <IconButton label={t.common.edit} icon={Edit2} onClick={() => openEdit(album)} />
                  <IconButton
                    label={t.common.delete}
                    icon={Trash2}
                    tone="danger"
                    onClick={() => setPendingAlbumDelete(album)}
                  />
                </div>
              </div>

              {album.images.length === 0 ? (
                <p className="rounded-lg border border-dashed border-navy/15 px-4 py-8 text-center text-sm text-navy/50">
                  {t.admin.gallery.emptyAlbum}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {album.images.map((image) => (
                    <div
                      key={image.id}
                      className="group relative overflow-hidden rounded-lg ring-1 ring-navy/8"
                    >
                      <img
                        src={image.media.url}
                        alt={
                          localizedOrSource(image.caption, locale).text ||
                          image.media.originalName
                        }
                        loading="lazy"
                        className="aspect-square w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setPendingImageDelete(image)}
                        aria-label={t.admin.gallery.removePhoto}
                        className="absolute end-1.5 top-1.5 rounded-lg bg-white/90 p-1.5 text-red-600 opacity-0 shadow transition-opacity group-hover:opacity-100 focus:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingAlbum ? t.admin.gallery.editTitle : t.admin.gallery.createTitle}
        footer={
          <>
            <Button variant="outline" onClick={closeForm} disabled={saveAlbum.isPending}>
              {t.common.cancel}
            </Button>
            <Button form="album-form" type="submit" isLoading={saveAlbum.isPending}>
              {editingAlbum ? t.common.save : t.admin.gallery.createSubmit}
            </Button>
          </>
        }
      >
        <form
          id="album-form"
          onSubmit={handleSubmit((values) => saveAlbum.mutate(values))}
          className="space-y-5"
        >
          <Field
            label={t.admin.gallery.titleLabel}
            htmlFor="album-title"
            required
            error={errors.title?.message}
          >
            <Input
              id="album-title"
              placeholder={t.admin.gallery.titlePlaceholder}
              aria-invalid={Boolean(errors.title)}
              {...register('title', {
                required: t.admin.gallery.titleRequired,
                minLength: { value: 2, message: t.admin.gallery.titleTooShort },
              })}
            />
          </Field>

          <Field
            label={t.admin.gallery.descriptionLabel}
            htmlFor="album-description"
            hint={t.admin.gallery.descriptionHint}
          >
            <Textarea id="album-description" rows={3} {...register('description')} />
          </Field>

          <Checkbox
            id="album-published"
            label={t.admin.gallery.publishCheckbox}
            {...register('isPublished')}
          />
        </form>
      </Modal>

      <MediaLibraryModal
        isOpen={Boolean(libraryAlbumId)}
        onClose={() => setLibraryAlbumId(null)}
        onSelect={(media) => {
          if (libraryAlbumId) {
            attachImage.mutate({ albumId: libraryAlbumId, mediaId: media.id });
          }
          setLibraryAlbumId(null);
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingAlbumDelete)}
        title={t.admin.gallery.deleteAlbumTitle}
        message={t.admin.gallery.deleteAlbumMessage}
        isLoading={deleteAlbum.isPending}
        onCancel={() => setPendingAlbumDelete(null)}
        onConfirm={() => pendingAlbumDelete && deleteAlbum.mutate(pendingAlbumDelete.id)}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingImageDelete)}
        title={t.admin.gallery.removePhotoTitle}
        message={t.admin.gallery.removePhotoMessage}
        confirmLabel={t.admin.gallery.removeConfirm}
        isLoading={detachImage.isPending}
        onCancel={() => setPendingImageDelete(null)}
        onConfirm={() => pendingImageDelete && detachImage.mutate(pendingImageDelete.id)}
      />
    </div>
  );
};
