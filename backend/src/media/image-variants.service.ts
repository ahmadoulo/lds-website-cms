import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { MinioService } from '../common/minio.service';

/**
 * The widths a derivative may be asked for.
 *
 * An allowlist rather than a free parameter: the derivatives are cached in
 * object storage, so an open `?w=` would let anyone fill the bucket with a
 * thousand near-identical renders of the same photograph. These five cover the
 * real breakpoints - a card on a phone, a card on a desktop, a half-width
 * figure, a full-width hero at 1x and at 2x.
 */
export const VARIANT_WIDTHS = [320, 640, 960, 1280, 1920] as const;
export type VariantWidth = (typeof VARIANT_WIDTHS)[number];

/** What sharp can usefully re-encode. Everything else is streamed untouched. */
const RESIZABLE = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
]);

/**
 * SVG is vector and already the right size at any width; GIF may be animated,
 * and resizing it here would silently drop every frame but the first.
 */
export function isResizable(mimeType: string): boolean {
  return RESIZABLE.has(mimeType);
}

export function parseWidth(raw: unknown): VariantWidth | null {
  const value = Number(raw);
  return (VARIANT_WIDTHS as readonly number[]).includes(value)
    ? (value as VariantWidth)
    : null;
}

/**
 * Whether the browser said it takes WebP.
 *
 * Every browser in use does, but the header is still what decides: a crawler,
 * a link preview bot or a mail client that does not accept it gets the
 * original format rather than an image it cannot draw.
 */
export function acceptsWebp(accept: string | undefined): boolean {
  return typeof accept === 'string' && accept.includes('image/webp');
}

export interface Variant {
  buffer: Buffer;
  mimeType: string;
}

@Injectable()
export class ImageVariantsService {
  private readonly logger = new Logger(ImageVariantsService.name);

  constructor(private readonly minio: MinioService) {}

  /**
   * Derivatives live beside the originals under their own prefix, keyed by
   * everything that changes the bytes. The original's key is part of it, so a
   * replaced upload - which gets a new key - can never be served a previous
   * image's cached render.
   */
  private key(
    storageKey: string,
    width: number,
    format: 'webp' | 'jpeg' | 'png',
  ): string {
    return `derived/w${width}/${format}/${storageKey}`;
  }

  async get(
    storageKey: string,
    sourceMimeType: string,
    width: VariantWidth,
    webp: boolean,
  ): Promise<Variant> {
    const format = webp
      ? 'webp'
      : sourceMimeType === 'image/png'
        ? 'png'
        : 'jpeg';
    const mimeType = `image/${format}`;
    const key = this.key(storageKey, width, format);

    if (await this.minio.objectExists(key)) {
      return { buffer: await this.minio.getFileBuffer(key), mimeType };
    }

    const buffer = await this.render(storageKey, width, format);

    /*
      Stored after the fact and not awaited for correctness: the visitor
      already has their bytes, and a storage hiccup should cost the next
      request a re-render rather than fail this one.
    */
    this.minio
      .uploadFile(buffer, key, mimeType, buffer.length)
      .catch((error) => this.logger.warn(`Could not cache "${key}": ${error}`));

    return { buffer, mimeType };
  }

  private async render(
    storageKey: string,
    width: number,
    format: 'webp' | 'jpeg' | 'png',
  ): Promise<Buffer> {
    const original = await this.minio.getFileBuffer(storageKey);

    const pipeline = sharp(original, { failOn: 'none' })
      /*
        Phones write the orientation in EXIF rather than in the pixels. sharp
        drops metadata when it re-encodes, so without this a portrait
        photograph from a phone comes back on its side.
      */
      .rotate()
      .resize({ width, withoutEnlargement: true, fit: 'inside' });

    if (format === 'webp')
      return pipeline.webp({ quality: 78, effort: 4 }).toBuffer();
    if (format === 'png')
      return pipeline.png({ compressionLevel: 9, palette: true }).toBuffer();
    // 4:2:0 chroma is the default and is wrong on text and sharp logo edges.
    return pipeline
      .jpeg({ quality: 80, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toBuffer();
  }
}
