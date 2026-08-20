import { uploadMedia } from './queries/adminHooks';
import type { Media } from './types';

/**
 * An image the administrator picked but has not committed yet.
 *
 * Selecting a file used to upload it straight into MinIO, so every change of
 * mind left an orphan behind. A selection is now held locally, previewed from an
 * object URL, and only sent to storage when the form is submitted.
 */
export interface PendingImage {
  kind: 'pending';
  file: File;
  /** Object URL for the local preview. Must be revoked once done. */
  previewUrl: string;
  width: number | null;
  height: number | null;
}

/** What a picker holds: nothing, an already-stored media, or a local selection. */
export type ImageSelection = Media | PendingImage | null;

export const isPending = (value: ImageSelection): value is PendingImage =>
  Boolean(value) && (value as PendingImage).kind === 'pending';

/** Reads the dimensions in the browser so the report works before any upload. */
export function readImageDimensions(file: File): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    // An .ico bundles several sizes and decodes inconsistently; skip it.
    if (/\.ico$/i.test(file.name) || file.type.includes('icon')) {
      resolve({ width: null, height: null });
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      resolve({ width: null, height: null });
      URL.revokeObjectURL(url);
    };

    image.src = url;
  });
}

export async function createPendingImage(file: File): Promise<PendingImage> {
  const { width, height } = await readImageDimensions(file);

  return {
    kind: 'pending',
    file,
    previewUrl: URL.createObjectURL(file),
    width,
    height,
  };
}

export function releasePendingImage(value: ImageSelection) {
  if (isPending(value)) URL.revokeObjectURL(value.previewUrl);
}

/** The URL to show, whichever kind of selection this is. */
export function selectionUrl(value: ImageSelection): string | null {
  if (!value) return null;
  return isPending(value) ? value.previewUrl : value.url;
}

/** What the report needs, from either kind of selection. */
export function selectionStats(value: ImageSelection) {
  if (!value) return null;

  return isPending(value)
    ? {
        width: value.width,
        height: value.height,
        size: value.file.size,
        mimeType: value.file.type,
        name: value.file.name,
      }
    : {
        width: value.width,
        height: value.height,
        size: value.size,
        mimeType: value.mimeType,
        name: value.originalName,
      };
}

/**
 * Uploads a pending selection and returns the stored media; an already-stored
 * media passes straight through. Call this from the submit handler, so storage
 * is only written when the administrator commits.
 */
export async function commitImage(
  value: ImageSelection,
  folder: string,
): Promise<Media | null> {
  if (!value) return null;
  if (!isPending(value)) return value;

  const media = await uploadMedia(value.file, folder);
  URL.revokeObjectURL(value.previewUrl);
  return media;
}
