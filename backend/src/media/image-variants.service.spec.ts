import sharp from 'sharp';
import {
  ImageVariantsService,
  VARIANT_WIDTHS,
  acceptsWebp,
  isResizable,
  parseWidth,
} from './image-variants.service';
import type { MinioService } from '../common/minio.service';

/** A real photograph-shaped JPEG, so sharp is actually exercised. */
async function sourceJpeg(width = 2400, height = 1800): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 120, g: 160, b: 90 },
    },
  })
    .jpeg({ quality: 92 })
    .toBuffer();
}

/** The one call the tests inspect, kept typed so `this` is never in play. */
type UploadFile = jest.Mock<Promise<void>, [Buffer, string]>;

function minioFake(objects: Map<string, Buffer>) {
  const uploadFile = jest.fn((buffer: Buffer, key: string) => {
    objects.set(key, buffer);
    return Promise.resolve();
  }) as UploadFile;

  const minio = {
    objectExists: jest.fn((key: string) => Promise.resolve(objects.has(key))),
    getFileBuffer: jest.fn((key: string) => Promise.resolve(objects.get(key)!)),
    uploadFile,
  };

  return { minio: minio as unknown as MinioService, uploadFile };
}

describe('parseWidth', () => {
  it('accepts only the published widths', () => {
    for (const width of VARIANT_WIDTHS)
      expect(parseWidth(String(width))).toBe(width);
  });

  it('refuses anything else, so the cache cannot be filled on demand', () => {
    // An open width would let a single visitor store a thousand near-identical
    // renders of the same photograph in the bucket.
    for (const raw of [
      '961',
      '0',
      '-640',
      '1e3',
      'abc',
      '',
      null,
      undefined,
      '640.5',
    ]) {
      expect(parseWidth(raw)).toBeNull();
    }
  });
});

describe('isResizable', () => {
  it('leaves vector and animated formats alone', () => {
    // SVG is already right at any size; resizing a GIF here would silently
    // drop every frame but the first.
    expect(isResizable('image/svg+xml')).toBe(false);
    expect(isResizable('image/gif')).toBe(false);
    expect(isResizable('image/jpeg')).toBe(true);
    expect(isResizable('image/png')).toBe(true);
  });
});

describe('acceptsWebp', () => {
  it('believes the header rather than assuming', () => {
    expect(acceptsWebp('image/avif,image/webp,*/*')).toBe(true);
    expect(acceptsWebp('image/jpeg,*/*')).toBe(false);
    expect(acceptsWebp(undefined)).toBe(false);
  });
});

describe('ImageVariantsService', () => {
  const SOURCE_KEY = '2026/03/photo.jpg';

  it('produces an image far smaller than the original', async () => {
    const objects = new Map([[SOURCE_KEY, await sourceJpeg()]]);
    const service = new ImageVariantsService(minioFake(objects).minio);

    const variant = await service.get(SOURCE_KEY, 'image/jpeg', 640, true);

    expect(variant.mimeType).toBe('image/webp');
    expect(variant.buffer.length).toBeLessThan(
      objects.get(SOURCE_KEY)!.length / 4,
    );
    expect((await sharp(variant.buffer).metadata()).width).toBe(640);
  });

  it('never enlarges a small image to the width asked for', async () => {
    // A 400px partner logo requested at 1920 must stay 400px, not be blown up
    // into a bigger file than the original.
    const objects = new Map([[SOURCE_KEY, await sourceJpeg(400, 300)]]);
    const service = new ImageVariantsService(minioFake(objects).minio);

    const variant = await service.get(SOURCE_KEY, 'image/jpeg', 1920, true);
    expect((await sharp(variant.buffer).metadata()).width).toBe(400);
  });

  it('serves the original format to a client that did not ask for WebP', async () => {
    const objects = new Map([[SOURCE_KEY, await sourceJpeg()]]);
    const service = new ImageVariantsService(minioFake(objects).minio);

    const variant = await service.get(SOURCE_KEY, 'image/jpeg', 640, false);
    expect(variant.mimeType).toBe('image/jpeg');
    expect((await sharp(variant.buffer).metadata()).format).toBe('jpeg');
  });

  it('caches the render and reuses it', async () => {
    const objects = new Map([[SOURCE_KEY, await sourceJpeg()]]);
    const { minio, uploadFile } = minioFake(objects);
    const service = new ImageVariantsService(minio);

    const first = await service.get(SOURCE_KEY, 'image/jpeg', 640, true);
    await new Promise((resolve) => setImmediate(resolve)); // the write is not awaited
    const second = await service.get(SOURCE_KEY, 'image/jpeg', 640, true);

    expect(second.buffer.equals(first.buffer)).toBe(true);
    expect(uploadFile).toHaveBeenCalledTimes(1);
  });

  it('keys the cache on width and format, so renders cannot collide', async () => {
    const objects = new Map([[SOURCE_KEY, await sourceJpeg()]]);
    const { minio, uploadFile } = minioFake(objects);
    const service = new ImageVariantsService(minio);

    await service.get(SOURCE_KEY, 'image/jpeg', 320, true);
    await service.get(SOURCE_KEY, 'image/jpeg', 640, true);
    await service.get(SOURCE_KEY, 'image/jpeg', 640, false);
    await new Promise((resolve) => setImmediate(resolve));

    const keys = uploadFile.mock.calls.map((call) => call[1]);
    expect(new Set(keys).size).toBe(3);
    // The original's key is part of the derivative's, so a replaced upload can
    // never be served a previous image's render.
    for (const key of keys) expect(key).toContain(SOURCE_KEY);
  });

  it('still serves the image when the cache write fails', async () => {
    const objects = new Map([[SOURCE_KEY, await sourceJpeg()]]);
    const { minio, uploadFile } = minioFake(objects);
    uploadFile.mockRejectedValue(new Error('storage down'));
    const service = new ImageVariantsService(minio);

    const variant = await service.get(SOURCE_KEY, 'image/jpeg', 640, true);
    expect(variant.buffer.length).toBeGreaterThan(0);
  });

  it('applies the EXIF rotation a phone writes instead of baking it in', async () => {
    // Without .rotate(), a portrait photograph from a phone comes back on its
    // side: sharp drops the metadata that was holding it upright.
    const upright = await sharp({
      create: {
        width: 400,
        height: 1000,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const objects = new Map([[SOURCE_KEY, upright]]);
    const service = new ImageVariantsService(minioFake(objects).minio);

    const variant = await service.get(SOURCE_KEY, 'image/jpeg', 320, true);
    const meta = await sharp(variant.buffer).metadata();
    // Orientation 6 means "rotate 90°", so the 400x1000 source is landscape.
    expect(meta.width).toBeGreaterThan(meta.height);
  });
});
