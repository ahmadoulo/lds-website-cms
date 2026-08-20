import { describe, expect, it } from 'vitest';
import { IMAGE_SLOTS, analyseImage, formatRatio } from '../lib/imageAnalysis';

const image = (width: number, height: number, size = 200_000) => ({
  width,
  height,
  size,
  mimeType: 'image/jpeg',
});

describe('analyseImage', () => {
  const cover = IMAGE_SLOTS.missionCover; // 16:10, 1200x750, cover
  const contain = IMAGE_SLOTS.partnerLogo; // 3:2, contain

  it('reports nothing for an image that matches the slot', () => {
    const report = analyseImage(image(1200, 750), cover);

    expect(report.issues).toHaveLength(0);
    expect(report.croppedAway).toBe(0);
  });

  it('quantifies the crop when the ratio differs', () => {
    // A square in a 16:10 slot loses its top and bottom.
    const report = analyseImage(image(1200, 1200), cover);
    const warning = report.issues.find((i) => i.level === 'warning');

    expect(warning?.message).toMatch(/en haut et en bas/);
    expect(report.croppedAway).toBeCloseTo(0.375, 2);
  });

  it('says which way the crop goes for a very wide image', () => {
    const report = analyseImage(image(3000, 750), cover);

    expect(report.issues.find((i) => i.level === 'warning')?.message).toMatch(/sur les côtés/);
  });

  it('never reports a crop for a slot that shows the whole image', () => {
    const report = analyseImage(image(600, 600), contain);

    expect(report.croppedAway).toBe(0);
    expect(report.issues.some((i) => i.message.includes('masquée'))).toBe(false);
  });

  it('raises an error for an image that will look blurry', () => {
    const report = analyseImage(image(300, 188), cover);

    expect(report.issues.some((i) => i.level === 'error')).toBe(true);
    expect(report.issues.find((i) => i.level === 'error')?.message).toMatch(/trop petite/);
  });

  it('only informs when the image is slightly under the recommendation', () => {
    const report = analyseImage(image(1000, 625), cover);

    expect(report.issues.some((i) => i.level === 'error')).toBe(false);
    expect(report.issues.some((i) => i.level === 'info')).toBe(true);
  });

  it('suggests shrinking an oversized image', () => {
    const report = analyseImage(image(4000, 2500), cover);

    expect(report.issues.some((i) => i.message.includes('plus grande que nécessaire'))).toBe(true);
  });

  it('flags a heavy file', () => {
    const report = analyseImage(image(1200, 750, 2_400_000), cover);

    expect(report.issues.find((i) => i.message.includes('lourd'))?.message).toMatch(/2\.3 Mo/);
  });

  it('tolerates a small ratio difference without complaining', () => {
    // 16:10 is 1.6; 1.62 is close enough not to be worth a warning.
    const report = analyseImage(image(1215, 750), cover);

    expect(report.issues.some((i) => i.message.includes('format'))).toBe(false);
  });

  it('degrades gracefully when the dimensions are unknown', () => {
    const report = analyseImage({ width: null, height: null, size: 1000, mimeType: 'image/png' }, cover);

    expect(report.issues).toHaveLength(1);
    expect(report.croppedAway).toBe(0);
  });
});

describe('formatRatio', () => {
  it('writes landscape ratios as n:1', () => {
    expect(formatRatio(16 / 9)).toBe('1.78:1');
  });

  it('writes portrait ratios as 1:n', () => {
    expect(formatRatio(3 / 4)).toBe('1:1.33');
  });

  it('handles a missing ratio', () => {
    expect(formatRatio(0)).toBe('—');
  });
});
