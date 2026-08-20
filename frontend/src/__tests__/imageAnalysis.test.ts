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

  it('quantifies the crop without treating it as a defect', () => {
    // A square in a 16:10 slot loses its top and bottom.
    const report = analyseImage(image(1200, 1200), cover);
    const note = report.issues.find((i) => i.message.includes('masquée'));

    expect(note?.message).toMatch(/en haut et en bas/);
    // A crop is something to be aware of, not a reason to reject the image.
    expect(note?.level).toBe('info');
    expect(report.croppedAway).toBeCloseTo(0.375, 2);
  });

  it('says which way the crop goes for a very wide image', () => {
    const report = analyseImage(image(3000, 750), cover);

    expect(report.issues.find((i) => i.message.includes('masquée'))?.message).toMatch(
      /sur les côtés/,
    );
  });

  it('never reports a crop for a slot that shows the whole image', () => {
    const report = analyseImage(image(600, 600), contain);

    expect(report.croppedAway).toBe(0);
    expect(report.issues.some((i) => i.message.includes('masquée'))).toBe(false);
  });

  it('warns, without blocking, below the size the slot is displayed at', () => {
    const report = analyseImage(image(300, 188), cover); // minWidth is 420

    const warning = report.issues.find((i) => i.level === 'warning');
    expect(warning?.message).toMatch(/floue/);
    // Nothing is ever reported as an error: the administrator decides.
    expect(report.issues.some((i) => i.level === 'error')).toBe(false);
  });

  it('accepts an image between the floor and the recommendation with a note', () => {
    const report = analyseImage(image(1000, 625), cover);

    expect(report.issues.some((i) => i.level === 'warning')).toBe(false);
    expect(report.issues.find((i) => i.level === 'info')?.message).toMatch(/utilisable/);
  });

  it('suggests shrinking an oversized image', () => {
    const report = analyseImage(image(4000, 2500), cover);

    expect(report.issues.some((i) => i.message.includes('plus grande que nécessaire'))).toBe(true);
  });

  it('mentions a heavy file as a suggestion', () => {
    const report = analyseImage(image(1200, 750, 2_400_000), cover);
    const note = report.issues.find((i) => i.message.includes('Mo'));

    expect(note?.message).toMatch(/2\.3 Mo/);
    expect(note?.level).toBe('info');
  });

  it('says nothing about an .ico, which has no single size', () => {
    const report = analyseImage(
      { width: null, height: null, size: 15_000, mimeType: 'image/x-icon' },
      IMAGE_SLOTS.favicon,
    );

    expect(report.issues).toHaveLength(0);
  });

  it('tolerates a small ratio difference without complaining', () => {
    // 16:10 is 1.6; 1.62 is close enough not to be worth a warning.
    const report = analyseImage(image(1215, 750), cover);

    expect(report.issues.some((i) => i.message.includes('format'))).toBe(false);
  });

  it('degrades gracefully when the dimensions are unknown', () => {
    const report = analyseImage(
      { width: null, height: null, size: 1000, mimeType: 'image/png' },
      cover,
    );

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
