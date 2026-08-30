/**
 * The brand as the logo states it: three equal accents carried by the three
 * figures, and navy for structure — the wordmark and the ground line.
 *
 * The distinction matters. Navy is a surface colour as much as a text colour, so
 * using it as an accent is what made a key figure disappear against the navy
 * impact band. Accents are the three below, never navy.
 */
export const BRAND = {
  green: '#87CE18',
  blue: '#00A4DE',
  orange: '#EE7900',
  navy: '#172642',
} as const;

/** The two page surfaces, needed to resolve a readable accent against them. */
export const WARM_SURFACE = '#fbf9f5';
export const WARM_MUTED_SURFACE = '#f5f2ec';

/** The accents, in the order the logo reads them: left, centre, right. */
export const ACCENT_SEQUENCE = [BRAND.green, BRAND.blue, BRAND.orange] as const;

function channels(hex: string): [number, number, number] | null {
  const value = hex.trim().replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;

  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Relative luminance, per WCAG 2.1. */
export function luminance(hex: string): number {
  const rgb = channels(hex);
  if (!rgb) return 0;

  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Mixes a colour towards white or black, keeping its hue. */
function mix(hex: string, amount: number, towards: 'white' | 'black'): string {
  const rgb = channels(hex);
  if (!rgb) return hex;

  const target = towards === 'white' ? 255 : 0;
  const mixed = rgb.map((c) => Math.round(c + (target - c) * amount));
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Large display text needs 3:1 to stay readable (WCAG 1.4.3). */
const LARGE_TEXT_MIN_CONTRAST = 3;

/**
 * Guarantees a colour is readable on a given surface.
 *
 * A colour chosen in the administration knows nothing about where it will be
 * shown. Rather than editing the stored value — which belongs to the
 * association — the component lightens it just enough to clear the contrast
 * threshold, and falls back to white if even that is not enough.
 */
export function readableOn(color: string, background: string): string {
  const backgroundIsDark = luminance(background) < 0.35;

  if (!channels(color)) return backgroundIsDark ? '#ffffff' : BRAND.navy;
  if (contrastRatio(color, background) >= LARGE_TEXT_MIN_CONTRAST) return color;

  // Push away from the background: lighter on a dark surface, darker on a light
  // one. Always lightening turned an unreadable green on beige into a paler,
  // even less readable green.
  const towards = backgroundIsDark ? 'white' : 'black';

  for (const amount of [0.15, 0.25, 0.35, 0.5, 0.65, 0.8]) {
    const candidate = mix(color, amount, towards);
    if (contrastRatio(candidate, background) >= LARGE_TEXT_MIN_CONTRAST) return candidate;
  }

  return backgroundIsDark ? '#ffffff' : '#000000';
}
