import { describe, expect, it } from 'vitest';
import { VARIANT_WIDTHS, responsiveImage, srcSetFor, variantUrl } from '../lib/imageSrc';

const URL = 'https://ldslouga.sn/api/v1/media/abc/file';

describe('variantUrl', () => {
  it('asks the media endpoint for one width', () => {
    expect(variantUrl(URL, 640)).toBe(`${URL}?w=640`);
  });

  it('appends to a URL that already carries a query', () => {
    expect(variantUrl(`${URL}?v=2`, 640)).toBe(`${URL}?v=2&w=640`);
  });
});

describe('srcSetFor', () => {
  it('offers every published width with its descriptor', () => {
    const srcSet = srcSetFor(URL);
    for (const width of VARIANT_WIDTHS) {
      expect(srcSet).toContain(`?w=${width} ${width}w`);
    }
  });

  it('stops at the widest the layout can use', () => {
    // A partner logo drawn 180px wide has no use for a 1920px entry, and
    // leaving it in invites a high-density screen to pick it.
    const srcSet = srcSetFor(URL, 640);
    expect(srcSet).toContain('?w=640 640w');
    expect(srcSet).not.toContain('960w');
    expect(srcSet).not.toContain('1920w');
  });
});

describe('responsiveImage', () => {
  it('falls back to a sized file, never the original', () => {
    // A browser that ignores srcset, and a crawler reading the markup, must
    // not be handed the 3072px upload.
    const image = responsiveImage(URL, '100vw');
    expect(image.src).toBe(`${URL}?w=1920`);
    expect(image.src).not.toBe(URL);
  });

  it('caps the fallback at the same ceiling as the srcset', () => {
    const image = responsiveImage(URL, '180px', 320);
    expect(image.src).toBe(`${URL}?w=320`);
    expect(image.srcSet).toBe(`${URL}?w=320 320w`);
  });

  it('carries the sizes the call site declared', () => {
    expect(responsiveImage(URL, '(min-width: 640px) 50vw, 100vw').sizes).toBe(
      '(min-width: 640px) 50vw, 100vw',
    );
  });
});
