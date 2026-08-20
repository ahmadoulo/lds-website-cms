/**
 * Identifies an image from its actual bytes.
 *
 * The browser-supplied MIME type and the file extension are both attacker
 * controlled, so neither is trusted: the magic number decides what a file is.
 */
export interface DetectedImage {
  mime: string;
  extension: string;
  /** ICO holds several sizes and is not decoded for dimensions. */
  supportsDimensions: boolean;
}

const SIGNATURES: Array<{
  mime: string;
  extension: string;
  supportsDimensions: boolean;
  test: (buffer: Buffer) => boolean;
}> = [
  {
    mime: 'image/jpeg',
    extension: '.jpg',
    supportsDimensions: true,
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: 'image/png',
    extension: '.png',
    supportsDimensions: true,
    test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: 'image/gif',
    extension: '.gif',
    supportsDimensions: true,
    test: (b) => b.subarray(0, 6).toString('ascii') === 'GIF87a' || b.subarray(0, 6).toString('ascii') === 'GIF89a',
  },
  {
    mime: 'image/webp',
    extension: '.webp',
    supportsDimensions: true,
    test: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  {
    mime: 'image/avif',
    extension: '.avif',
    supportsDimensions: true,
    // ISO base media file: 'ftyp' at offset 4, brand 'avif' or 'avis'.
    test: (b) =>
      b.subarray(4, 8).toString('ascii') === 'ftyp' &&
      ['avif', 'avis'].includes(b.subarray(8, 12).toString('ascii')),
  },
  {
    mime: 'image/x-icon',
    extension: '.ico',
    // An .ico bundles 16/32/48 px variants; there is no single size to record.
    supportsDimensions: false,
    test: (b) => b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00,
  },
];

export function detectImageType(buffer: Buffer): DetectedImage | null {
  if (!buffer || buffer.length < 12) return null;

  const match = SIGNATURES.find((signature) => signature.test(buffer));
  if (!match) return null;

  return {
    mime: match.mime,
    extension: match.extension,
    supportsDimensions: match.supportsDimensions,
  };
}

export const SUPPORTED_IMAGE_MIMES = SIGNATURES.map((s) => s.mime);
