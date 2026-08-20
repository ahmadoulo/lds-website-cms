import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Image as ImageIcon, Search, Trash2, Upload } from 'lucide-react';
import api, { apiErrorMessage } from '../../../lib/api/axios';
import { formatBytes, uploadMedia, validateImageFile } from '../../../lib/queries/adminHooks';
import { useToast } from '../../ui/Toast';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Field';
import { EmptyState, LoadingState, Spinner } from '../../ui/States';
import type { Media, Paginated } from '../../../lib/types';
import { cn } from '../../../lib/cn';

interface MediaPickerProps {
  /** Currently selected media, if any. */
  value: Media | null;
  onChange: (media: Media | null) => void;
  /** Logical MinIO folder new uploads land in. */
  folder: string;
  label?: string;
  aspect?: string;
}

/**
 * Uploads to MinIO through the API, or picks a file already in the library so the
 * same image can be reused without storing it twice.
 */
export const MediaPicker = ({
  value,
  onChange,
  folder,
  label = 'Image',
  aspect = 'aspect-[16/10]',
}: MediaPickerProps) => {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsUploading(true);
    try {
      const media = await uploadMedia(file, folder);
      onChange(media);
      toast.success('Image téléversée.');
    } catch (error) {
      toast.error(apiErrorMessage(error, "Échec du téléversement de l'image."));
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <span className="block text-sm font-semibold text-navy">{label}</span>

      <div
        className={cn(
          'relative overflow-hidden rounded-xl border-2 border-dashed border-navy/15 bg-warm-muted/40 transition-colors',
          !value && 'hover:border-blue/50',
        )}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void handleFile(event.dataTransfer.files?.[0]);
        }}
      >
        {isUploading ? (
          <div className={cn('flex flex-col items-center justify-center gap-2', aspect)}>
            <Spinner className="h-6 w-6 text-blue" />
            <span className="text-xs font-medium text-navy/60">Téléversement…</span>
          </div>
        ) : value ? (
          <img
            src={value.url}
            alt={value.altText?.fr || value.originalName}
            className={cn('w-full object-cover', aspect)}
          />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn('flex w-full flex-col items-center justify-center gap-2 px-4 text-center', aspect)}
          >
            <ImageIcon className="h-7 w-7 text-navy/30" />
            <span className="text-xs font-medium text-navy/60">
              Glissez une image ici ou cliquez pour parcourir
            </span>
            <span className="text-[11px] text-navy/40">JPG, PNG, WebP · 5 Mo maximum</span>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          className="hidden"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="h-3.5 w-3.5" /> {value ? 'Remplacer' : 'Téléverser'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsLibraryOpen(true)}
          disabled={isUploading}
        >
          <ImageIcon className="h-3.5 w-3.5" /> Bibliothèque
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            onClick={() => onChange(null)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Retirer
          </Button>
        )}
      </div>

      {value && (
        <p className="text-[11px] text-navy/45">
          {value.originalName} · {value.width}×{value.height} · {formatBytes(value.size)}
        </p>
      )}

      <MediaLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelect={(media) => {
          onChange(media);
          setIsLibraryOpen(false);
        }}
      />
    </div>
  );
};

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: Media) => void;
}

/** Browse-and-reuse dialog over the MinIO-backed media library. */
export const MediaLibraryModal = ({ isOpen, onClose, onSelect }: MediaLibraryModalProps) => {
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'media', 'picker', search],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Media>>('/media', {
        params: { page: 1, limit: 40, search: search || undefined },
      });
      return data;
    },
    enabled: isOpen,
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bibliothèque de médias" size="lg">
      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/35" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher une image…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <EmptyState title="Impossible de charger la bibliothèque" />
      ) : !data?.data.length ? (
        <EmptyState
          title="Aucune image"
          description="Téléversez votre première image depuis un formulaire ou la page Médias."
          icon={ImageIcon}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {data.data.map((media) => (
            <button
              key={media.id}
              type="button"
              onClick={() => onSelect(media)}
              className="group overflow-hidden rounded-xl border border-navy/10 bg-white text-left transition-all hover:border-blue hover:shadow-md"
            >
              <img
                src={media.url}
                alt={media.altText?.fr || media.originalName}
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
              <div className="px-2 py-1.5">
                <p className="truncate text-[11px] font-medium text-navy">{media.originalName}</p>
                <p className="text-[10px] text-navy/45">{formatBytes(media.size)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
};
