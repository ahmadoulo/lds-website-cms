import { describe, expect, it } from 'vitest';
import { ACCENT_SEQUENCE, BRAND, contrastRatio, luminance, readableOn } from '../lib/brand';

describe('brand palette', () => {
  it('uses the three accents from the logo, and not navy', () => {
    expect(ACCENT_SEQUENCE).toEqual([BRAND.green, BRAND.blue, BRAND.orange]);
    expect(ACCENT_SEQUENCE).not.toContain(BRAND.navy);
  });
});

describe('contrastRatio', () => {
  it('is 21 between black and white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('is 1 for a colour against itself', () => {
    expect(contrastRatio(BRAND.navy, BRAND.navy)).toBeCloseTo(1, 5);
  });

  it('is symmetrical', () => {
    expect(contrastRatio(BRAND.green, BRAND.navy)).toBeCloseTo(
      contrastRatio(BRAND.navy, BRAND.green),
      5,
    );
  });
});

describe('readableOn', () => {
  it('rescues navy on navy, the case that made a key figure vanish', () => {
    // The impact band is navy; a statistic stored as navy rendered invisible.
    const rescued = readableOn(BRAND.navy, BRAND.navy);

    expect(rescued).not.toBe(BRAND.navy);
    expect(contrastRatio(rescued, BRAND.navy)).toBeGreaterThanOrEqual(3);
  });

  it('leaves an accent that already reads well untouched', () => {
    expect(readableOn(BRAND.green, BRAND.navy)).toBe(BRAND.green);
    expect(readableOn(BRAND.orange, BRAND.navy)).toBe(BRAND.orange);
  });

  it('keeps every brand colour legible on the navy band', () => {
    for (const color of Object.values(BRAND)) {
      expect(contrastRatio(readableOn(color, BRAND.navy), BRAND.navy)).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps every brand colour legible on the warm surface', () => {
    for (const color of Object.values(BRAND)) {
      expect(contrastRatio(readableOn(color, '#fbf9f5'), '#fbf9f5')).toBeGreaterThanOrEqual(3);
    }
  });

  it('lightens rather than discarding the hue on a dark surface', () => {
    const rescued = readableOn('#0d1b33', BRAND.navy);

    // Still recognisably blue, not a flat white.
    expect(rescued).not.toBe('#ffffff');
    expect(rescued.toLowerCase()).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('darkens on a light surface instead of washing the colour out', () => {
    // Green on the warm background sits at 1.84:1; lightening makes it worse.
    const rescued = readableOn(BRAND.green, '#fbf9f5');

    expect(luminance(rescued)).toBeLessThan(luminance(BRAND.green));
    expect(contrastRatio(rescued, '#fbf9f5')).toBeGreaterThanOrEqual(3);
  });

  it('falls back to a readable colour for malformed input', () => {
    expect(readableOn('not-a-colour', BRAND.navy)).toBe('#ffffff');
    expect(readableOn('', '#fbf9f5')).toBe(BRAND.navy);
  });

  it('accepts three-digit hex', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 1);
  });
});
