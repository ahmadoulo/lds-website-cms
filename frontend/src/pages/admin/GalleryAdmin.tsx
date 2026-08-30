import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Edit2, Eye, EyeOff, Images, Plus, Trash2, Upload } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api/axios';
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
import { t, type GalleryAlbum, type GalleryImage } from '../../lib/types';

interface AlbumFormValues {
  title: string;
  description: string;
  isPublished: boolean;
}

const EMPTY_FORM: AlbumFormValues = { title: '', description: '', isPublished: true };

export const GalleryAdmin = () => {
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
      title: t(album.title),
      description: t(album.description),
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
    successMessage: editingAlbum ? 'Album mis à jour.' : 'Album créé.',
    invalidate: [['admin', 'gallery']],
    onSuccess: closeForm,
  });

  const toggleAlbum = useAdminMutation<GalleryAlbum>({
    mutationFn: async (album) =>
      (await api.patch(`/gallery/${album.id}`, { isPublished: !album.isPublished })).data,
    successMessage: 'Statut de l\u2019album mis à jour.',
    invalidate: [['admin', 'gallery']],
  });

  const deleteAlbum = useAdminMutation<string>({
    mutationFn: async (id) => (await api.delete(`/gallery/${id}`)).data,
    successMessage: 'Album supprimé.',
    invalidate: [['admin', 'gallery']],
    onSuccess: () => setPendingAlbumDelete(null),
  });

  const attachImage = useAdminMutation<{ albumId: string; mediaId: string }>({
    mutationFn: async ({ albumId, mediaId }) =>
      (await api.post(`/gallery/${albumId}/images`, { mediaId })).data,
    successMessage: 'Photo ajoutée à l\u2019album.',
    invalidate: [['admin', 'gallery']],
  });

  const detachImage = useAdminMutation<string>({
    mutationFn: async (imageId) => (await api.delete(`/gallery/images/${imageId}`)).data,
    successMessage: 'Photo retirée de l\u2019album.',
    invalidate: [['admin', 'gallery']],
    onSuccess: () => setPendingImageDelete(null),
  });

  /** Uploads straight into an album: one file picker, two API calls. */
  const handleUpload = async (albumId: string, files: FileList | null) => {
    if (!files?.length) return;

    setUploadingAlbumId(albumId);
    try {
      for (const file of Array.from(files)) {
        const validationError = validateImageFile(file);
        if (validationError) {
          toast.error(`${file.name} : ${validationError}`);
          continue;
        }
        const media = await uploadMedia(file, 'gallery');
        await api.post(`/gallery/${albumId}/images`, { mediaId: media.id });
      }
      await listQuery.refetch();
      toast.success('Photos ajoutées.');
    } catch (error) {
      toast.error(apiErrorMessage(error, "Échec de l'ajout des photos."));
    } finally {
      setUploadingAlbumId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Galerie"
        description="Organisez vos photos en albums. Seuls les albums publiés apparaissent sur le site."
        actions={
          <>
            <PreviewButton path="/galerie" />
            <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nouvel album
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
          title="Aucun album"
          description="Créez un premier album pour regrouper les photos de vos actions."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Créer un album
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
                    <h2 className="text-base font-bold text-navy">{t(album.title)}</h2>
                    <Badge tone={album.isPublished ? 'green' : 'neutral'}>
                      {album.isPublished ? 'Publié' : 'Brouillon'}
                    </Badge>
                  </div>
                  {album.description && (
                    <p className="mt-1 text-sm text-navy/60">{t(album.description)}</p>
                  )}
                  <p className="mt-1 text-xs text-navy/45">
                    {album.images.length} photo{album.images.length > 1 ? 's' : ''}
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
                      Téléverser
                    </span>
                  </label>

                  <Button variant="ghost" size="sm" onClick={() => setLibraryAlbumId(album.id)}>
                    <Images className="h-3.5 w-3.5" /> Bibliothèque
                  </Button>

                  <IconButton
                    label={album.isPublished ? 'Dépublier' : 'Publier'}
                    icon={album.isPublished ? EyeOff : Eye}
                    onClick={() => toggleAlbum.mutate(album)}
                    disabled={toggleAlbum.isPending}
                  />
                  <IconButton label="Modifier" icon={Edit2} onClick={() => openEdit(album)} />
                  <IconButton
                    label="Supprimer"
                    icon={Trash2}
                    tone="danger"
                    onClick={() => setPendingAlbumDelete(album)}
                  />
                </div>
              </div>

              {album.images.length === 0 ? (
                <p className="rounded-lg border border-dashed border-navy/15 px-4 py-8 text-center text-sm text-navy/50">
                  Cet album est vide. Téléversez des photos ou choisissez-en dans la bibliothèque.
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
                        alt={t(image.caption, image.media.originalName)}
                        loading="lazy"
                        className="aspect-square w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setPendingImageDelete(image)}
                        aria-label="Retirer cette photo"
                        className="absolute right-1.5 top-1.5 rounded-lg bg-white/90 p-1.5 text-red-600 opacity-0 shadow transition-opacity group-hover:opacity-100 focus:opacity-100"
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
        title={editingAlbum ? "Modifier l'album" : 'Nouvel album'}
        footer={
          <>
            <Button variant="outline" onClick={closeForm} disabled={saveAlbum.isPending}>
              Annuler
            </Button>
            <Button form="album-form" type="submit" isLoading={saveAlbum.isPending}>
              {editingAlbum ? 'Enregistrer' : "Créer l'album"}
            </Button>
          </>
        }
      >
        <form
          id="album-form"
          onSubmit={handleSubmit((values) => saveAlbum.mutate(values))}
          className="space-y-5"
        >
          <Field label="Titre" htmlFor="album-title" required error={errors.title?.message}>
            <Input
              id="album-title"
              placeholder="Distribution de kits scolaires 2026"
              aria-invalid={Boolean(errors.title)}
              {...register('title', {
                required: 'Le titre est obligatoire',
                minLength: { value: 2, message: 'Le titre est trop court' },
              })}
            />
          </Field>

          <Field label="Description" htmlFor="album-description" hint="Facultatif.">
            <Textarea id="album-description" rows={3} {...register('description')} />
          </Field>

          <Checkbox
            id="album-published"
            label="Publier cet album sur le site"
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
        title="Supprimer cet album ?"
        message="L'album et son organisation seront supprimés. Les images restent disponibles dans la bibliothèque de médias."
        isLoading={deleteAlbum.isPending}
        onCancel={() => setPendingAlbumDelete(null)}
        onConfirm={() => pendingAlbumDelete && deleteAlbum.mutate(pendingAlbumDelete.id)}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingImageDelete)}
        title="Retirer cette photo de l'album ?"
        message="La photo reste dans la bibliothèque de médias et pourra être réutilisée."
        confirmLabel="Retirer"
        isLoading={detachImage.isPending}
        onCancel={() => setPendingImageDelete(null)}
        onConfirm={() => pendingImageDelete && detachImage.mutate(pendingImageDelete.id)}
      />
    </div>
  );
};
