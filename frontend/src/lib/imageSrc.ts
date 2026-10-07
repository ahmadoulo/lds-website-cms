/**
 * The widths the media endpoint will render.
 *
 * Mirrors `VARIANT_WIDTHS` in `backend/src/media/image-variants.service.ts`.
 * Asking for anything else is not an error - the API ignores an unknown width
 * and serves the original - but it does mean the browser downloads a 2560px
 * photograph to draw a thumbnail, which is the whole problem this fixes.
 */
export const VARIANT_WIDTHS = [320, 640, 960, 1280, 1920] as const;

export type VariantWidth = (typeof VARIANT_WIDTHS)[number];

/** The same media, rendered to one width. */
export function variantUrl(url: string, width: VariantWidth): string {
  return `${url}${url.includes('?') ? '&' : '?'}w=${width}`;
}

/**
 * A `srcset` offering every width up to the largest the layout can use.
 *
 * Capped rather than always complete: a partner logo drawn 180px wide has no
 * use for a 1920px entry, and leaving it in invites a browser on a high-density
 * screen to pick it.
 */
export function srcSetFor(url: string, maxWidth: VariantWidth = 1920): string {
  return VARIANT_WIDTHS.filter((width) => width <= maxWidth)
    .map((width) => `${variantUrl(url, width)} ${width}w`)
    .join(', ');
}

export interface ResponsiveImage {
  src: string;
  srcSet: string;
  sizes: string;
}

/**
 * Everything an `<img>` needs to download the right file.
 *
 * `sizes` is the part that cannot be guessed here: only the call site knows how
 * wide the image is drawn, and without it a browser assumes the full viewport
 * and picks the largest entry every time. It is required for that reason.
 *
 * `src` stays a real URL rather than the original, so a browser that ignores
 * srcset - and a crawler reading the markup - still gets a reasonable file
 * instead of a 3072px photograph.
 */
export function responsiveImage(
  url: string,
  sizes: string,
  maxWidth: VariantWidth = 1920,
): ResponsiveImage {
  const fallback = VARIANT_WIDTHS.filter((width) => width <= maxWidth).at(-1) ?? maxWidth;
  return { src: variantUrl(url, fallback), srcSet: srcSetFor(url, maxWidth), sizes };
}
