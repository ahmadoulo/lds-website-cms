import { beforeEach, describe, expect, it, vi } from 'vitest';

const uploadMedia = vi.fn();
vi.mock('../lib/queries/adminHooks', () => ({ uploadMedia: (...args: any[]) => uploadMedia(...args) }));

import {
  commitImage,
  isPending,
  releasePendingImage,
  selectionStats,
  selectionUrl,
  type PendingImage,
} from '../lib/pendingImage';
import type { Media } from '../lib/types';

const storedMedia: Media = {
  id: 'm1',
  originalName: 'stored.png',
  storageKey: 'news/m1.png',
  bucket: 'lds-media',
  folder: 'news',
  mimeType: 'image/png',
  size: 5000,
  width: 800,
  height: 600,
  altText: null,
  url: 'http://api.test/api/v1/media/m1/file',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const pending = (): PendingImage => ({
  kind: 'pending',
  file: new File(['x'], 'local.png', { type: 'image/png' }),
  previewUrl: 'blob:local-preview',
  width: 1200,
  height: 750,
});

beforeEach(() => {
  vi.clearAllMocks();
  URL.revokeObjectURL = vi.fn();
});

describe('image selection', () => {
  it('tells a local pick apart from a stored media', () => {
    expect(isPending(pending())).toBe(true);
    expect(isPending(storedMedia)).toBe(false);
    expect(isPending(null)).toBe(false);
  });

  it('previews a local pick from its object URL', () => {
    expect(selectionUrl(pending())).toBe('blob:local-preview');
  });

  it('previews a stored media from the API URL', () => {
    expect(selectionUrl(storedMedia)).toBe('http://api.test/api/v1/media/m1/file');
  });

  it('reports stats for a local pick, before any upload', () => {
    expect(selectionStats(pending())).toMatchObject({
      width: 1200,
      height: 750,
      name: 'local.png',
    });
  });

  it('reports stats for a stored media', () => {
    expect(selectionStats(storedMedia)).toMatchObject({ width: 800, height: 600, size: 5000 });
  });
});

describe('commitImage', () => {
  it('uploads nothing for an empty slot', async () => {
    await expect(commitImage(null, 'news')).resolves.toBeNull();
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it('leaves an already-stored media untouched', async () => {
    await expect(commitImage(storedMedia, 'news')).resolves.toBe(storedMedia);
    // Re-uploading an existing file would duplicate it in storage.
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it('uploads a local pick only when the form is committed', async () => {
    uploadMedia.mockResolvedValue({ ...storedMedia, id: 'new' });
    const selection = pending();

    const result = await commitImage(selection, 'news');

    expect(uploadMedia).toHaveBeenCalledWith(selection.file, 'news');
    expect(result?.id).toBe('new');
    // The preview URL is released once the file has been stored.
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-preview');
  });

  it('lets an upload failure surface instead of silently dropping the image', async () => {
    uploadMedia.mockRejectedValue(new Error('storage down'));

    await expect(commitImage(pending(), 'news')).rejects.toThrow('storage down');
  });
});

describe('releasePendingImage', () => {
  it('frees the object URL of a discarded pick', () => {
    releasePendingImage(pending());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-preview');
  });

  it('does nothing for a stored media', () => {
    releasePendingImage(storedMedia);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});
