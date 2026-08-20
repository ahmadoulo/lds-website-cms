import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import api, { apiErrorMessage } from '../api/axios';
import { useToast } from '../../components/ui/Toast';
import type { Media, Paginated } from '../types';

const get = async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
  const { data } = await api.get<T>(url, { params });
  return data;
};

/** Public caches are invalidated alongside admin ones so the site updates instantly. */
export function useInvalidate() {
  const queryClient = useQueryClient();
  return (...keys: QueryKey[]) => {
    keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    queryClient.invalidateQueries({ queryKey: ['public'] });
  };
}

/**
 * Wraps a mutation with the feedback every admin action needs: a success toast,
 * a readable error toast, and cache invalidation.
 */
export function useAdminMutation<TVariables, TData = unknown>(options: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  successMessage: string;
  invalidate: QueryKey[];
  onSuccess?: (data: TData) => void;
}) {
  const toast = useToast();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: (data) => {
      invalidate(...options.invalidate);
      toast.success(options.successMessage);
      options.onSuccess?.(data);
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error));
    },
  });
}

// --------------------------------------------------------------------- media

export const useMediaLibrary = (params: { page: number; folder?: string; search?: string }) =>
  useQuery({
    queryKey: ['admin', 'media', params],
    queryFn: () =>
      get<Paginated<Media>>('/media', {
        page: params.page,
        limit: 24,
        folder: params.folder || undefined,
        search: params.search || undefined,
      }),
  });

export const useMediaFolders = () =>
  useQuery({
    queryKey: ['admin', 'media', 'folders'],
    queryFn: () => get<Array<{ folder: string; count: number }>>('/media/folders'),
  });

export async function uploadMedia(file: File, folder: string): Promise<Media> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const { data } = await api.post<Media>('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];

// A favicon is legitimately supplied as .ico, which browsers report
// inconsistently (and sometimes not at all).
export const ACCEPTED_ICON_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  'image/x-icon',
  'image/vnd.microsoft.icon',
];

/** The `accept` attribute for a file input, per kind of slot. */
export const acceptAttribute = (allowIcon: boolean) =>
  allowIcon ? `${ACCEPTED_ICON_TYPES.join(',')},.ico` : ACCEPTED_IMAGE_TYPES.join(',');

/**
 * Mirrors the server-side rules so the user gets feedback before uploading.
 * The server re-checks the magic number; this only avoids a pointless round trip.
 */
export function validateImageFile(file: File, allowIcon = false): string | null {
  const accepted = allowIcon ? ACCEPTED_ICON_TYPES : ACCEPTED_IMAGE_TYPES;

  // Browsers report .ico as image/x-icon, image/vnd.microsoft.icon or nothing at
  // all, so the extension is the reliable signal for that one format.
  const looksLikeIcon = allowIcon && /\.ico$/i.test(file.name);

  if (!looksLikeIcon && file.type && !accepted.includes(file.type)) {
    return allowIcon
      ? 'Format non supporté. Utilisez ICO, PNG, WebP ou JPG.'
      : 'Format non supporté. Utilisez JPG, PNG, WebP, GIF ou AVIF.';
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return `Fichier trop volumineux (${formatBytes(file.size)}). Maximum : 5 Mo.`;
  }

  return null;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 o';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
