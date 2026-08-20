import { describe, expect, it } from 'vitest';
import { formatBytes, validateImageFile } from '../lib/queries/adminHooks';

const makeFile = (type: string, size: number, name = 'photo.png') => {
  const file = new File(['x'], name, { type });
  // File size is read-only, so it is stubbed to exercise the size rule.
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('validateImageFile', () => {
  it('accepts the supported image formats', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']) {
      expect(validateImageFile(makeFile(type, 1024))).toBeNull();
    }
  });

  it('rejects a non-image file', () => {
    expect(validateImageFile(makeFile('application/pdf', 1024))).toMatch(/Format non supporté/);
  });

  it('rejects SVG, which can carry script', () => {
    expect(validateImageFile(makeFile('image/svg+xml', 1024))).toMatch(/Format non supporté/);
  });

  it('rejects a file over 5 MB, matching the server limit', () => {
    expect(validateImageFile(makeFile('image/png', 6 * 1024 * 1024))).toMatch(/trop volumineux/);
  });

  it('accepts a file exactly at the limit', () => {
    expect(validateImageFile(makeFile('image/png', 5 * 1024 * 1024))).toBeNull();
  });
});

describe('formatBytes', () => {
  it('formats zero', () => {
    expect(formatBytes(0)).toBe('0 o');
  });

  it('formats bytes, kilobytes and megabytes', () => {
    expect(formatBytes(512)).toBe('512 o');
    expect(formatBytes(2048)).toBe('2.0 Ko');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 Mo');
  });
});
