import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Crop, Image as ImageIcon, Maximize2, Search, Trash2, Upload } from 'lucide-react';
import api from '../../../lib/api/axios';
import { acceptAttribute, formatBytes, validateImageFile } from '../../../lib/queries/adminHooks';
import {
  createPendingImage,
  isPending,
  releasePendingImage,
  selectionStats,
  selectionUrl,
  type ImageSelection,
} from '../../../lib/pendingImage';
import { IMAGE_SLOTS, type ImageSlotKey } from '../../../lib/imageAnalysis';
import { useToast } from '../../ui/Toast';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Field';
import { EmptyState, LoadingState } from '../../ui/States';
import { ImageReportPanel } from './ImageReportPanel';
import type { Media, Paginated } from '../../../lib/types';
import { cn } from '../../../lib/cn';

interface MediaPickerProps {
  /** Either a stored media, a not-yet-uploaded selection, or nothing. */
  value: ImageSelection;
  onChange: (value: ImageSelection) => void;
  /** Where this image is rendered, which sets the crop and the recommended size. */
  slot: ImageSlotKey;
  label?: string;
}

/**
 * Picks an image for a slot: a local file, or one already in the library.
 *
 * A local file is NOT uploaded here. It is previewed from an object URL and only
 * written to MinIO when the form is submitted, so changing your mind leaves no
 * orphan behind. The preview uses the ratio the public site crops to, so a
 * mismatch is visible before publishing rather than after.
 */
export const MediaPicker = ({ value, onChange, slot, label = 'Image' }: MediaPickerProps) => {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [showWholeImage, setShowWholeImage] = useState(false);

  const spec = IMAGE_SLOTS[slot];
  const stats = selectionStats(value);
  const previewUrl = selectionUrl(value);
  const pending = isPending(value);

  // The object URL of a replaced selection has to be released, or the file stays
  // in memory for as long as the page is open.
  const replace = (next: ImageSelection) => {
    releasePendingImage(value);
    onChange(next);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    const validationError = validateImageFile(file, spec.allowIcon);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    replace(await createPendingImage(file));
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-navy">{label}</span>
        <span className="text-xs text-navy/45">
          {spec.width}×{spec.height} · {spec.ratioLabel}
        </span>
      </div>

      <div
        className={cn(
          'relative overflow-hidden rounded-xl border-2 border-dashed border-navy/15 bg-warm-muted/40 transition-colors',
          !value && 'hover:border-blue/50',
        )}
        style={{ aspectRatio: String(spec.ratio) }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void handleFile(event.dataTransfer.files?.[0]);
        }}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={stats?.name ?? ''}
            className={cn(
              'h-full w-full',
              // `cover` reproduces the crop the site applies; `contain` reveals
              // the parts that crop would hide.
              showWholeImage || spec.fit === 'contain' ? 'object-contain' : 'object-cover',
            )}
          />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center"
          >
            <ImageIcon className="h-7 w-7 text-navy/30" />
            <span className="text-xs font-medium text-navy/60">
              Glissez une image ici ou cliquez pour parcourir
            </span>
            <span className="text-xs text-navy/40">JPG, PNG, WebP · 5 Mo maximum</span>
          </button>
        )}

        {previewUrl && spec.fit === 'cover' && (
          <button
            type="button"
            onClick={() => setShowWholeImage((shown) => !shown)}
            className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold text-navy shadow transition-colors hover:bg-white"
          >
            {showWholeImage ? (
              <>
                <Crop className="h-3 w-3" /> Voir le cadrage du site
              </>
            ) : (
              <>
                <Maximize2 className="h-3 w-3" /> Voir l'image entière
              </>
            )}
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={acceptAttribute(Boolean(spec.allowIcon))}
          className="hidden"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </div>

      {previewUrl && showWholeImage && spec.fit === 'cover' && (
        <p className="text-xs font-medium text-blue">
          Image entière. Seule la zone visible dans le cadrage sera affichée sur le site.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" /> {previewUrl ? 'Remplacer' : 'Choisir une image'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsLibraryOpen(true)}
        >
          <ImageIcon className="h-3.5 w-3.5" /> Bibliothèque
        </Button>
        {previewUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            onClick={() => replace(null)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Retirer
          </Button>
        )}
      </div>

      {pending && (
        <p className="flex items-start gap-1.5 rounded-lg border border-blue/25 bg-blue/5 px-2.5 py-1.5 text-xs text-navy/75">
          <Clock className="mt-px h-3.5 w-3.5 shrink-0 text-blue" />
          Image sélectionnée mais pas encore envoyée. Elle sera stockée lors de
          l'enregistrement du formulaire.
        </p>
      )}

      {stats && <ImageReportPanel stats={stats} slot={spec} />}

      <MediaLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelect={(media) => {
          replace(media);
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
                <p className="truncate text-xs font-medium text-navy">{media.originalName}</p>
                <p className="text-xs text-navy/45">
                  {media.width}×{media.height} · {formatBytes(media.size)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
};
