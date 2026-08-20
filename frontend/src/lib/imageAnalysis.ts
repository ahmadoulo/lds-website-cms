/**
 * Every slot the site renders an image into, with the size that fills it on a
 * high-density screen and the aspect ratio it is cropped to. Keeping this next
 * to the components that use those ratios is what lets the admin warn about a
 * crop *before* the image goes live.
 */
export interface ImageSlot {
  /** Ratio the site crops to, as width / height. */
  ratio: number;
  /** Ratio written the way a person reads it. */
  ratioLabel: string;
  /** Ideal source size in pixels. */
  width: number;
  height: number;
  /** How the image is fitted: `cover` crops, `contain` never does. */
  fit: 'cover' | 'contain';
  note?: string;
}

export const IMAGE_SLOTS = {
  heroPortrait: {
    ratio: 3 / 4,
    ratioLabel: '3:4 (portrait)',
    width: 900,
    height: 1200,
    fit: 'cover',
    note: "Photo verticale du bandeau d'accueil.",
  },
  aboutPhoto: {
    ratio: 4 / 3,
    ratioLabel: '4:3 (paysage)',
    width: 1200,
    height: 900,
    fit: 'cover',
    note: 'Photo de présentation de l’association.',
  },
  ctaBanner: {
    ratio: 21 / 9,
    ratioLabel: '21:9 (bandeau large)',
    width: 1920,
    height: 823,
    fit: 'cover',
    note: 'Image de fond, assombrie et recouverte de texte : évitez un sujet au centre.',
  },
  missionCover: {
    ratio: 16 / 10,
    ratioLabel: '16:10',
    width: 1200,
    height: 750,
    fit: 'cover',
    note: "Vignette d'un domaine d'action.",
  },
  newsCover: {
    ratio: 4 / 3,
    ratioLabel: '4:3',
    width: 1200,
    height: 900,
    fit: 'cover',
    note: "Couverture d'article. Recadrée en 16:9 sur la page de l'article.",
  },
  galleryPhoto: {
    ratio: 4 / 3,
    ratioLabel: '4:3',
    width: 1200,
    height: 900,
    fit: 'cover',
  },
  partnerLogo: {
    ratio: 3 / 2,
    ratioLabel: '3:2',
    width: 600,
    height: 400,
    fit: 'contain',
    note: 'Affiché entier, jamais recadré. Fond transparent recommandé (PNG ou WebP).',
  },
  siteLogo: {
    ratio: 3 / 1,
    ratioLabel: '3:1 (horizontal)',
    width: 600,
    height: 200,
    fit: 'contain',
    note: 'Affiché entier. Fond transparent recommandé.',
  },
  favicon: {
    ratio: 1,
    ratioLabel: '1:1 (carré)',
    width: 512,
    height: 512,
    fit: 'contain',
    note: "Icône de l'onglet du navigateur.",
  },
  ogImage: {
    ratio: 1.91,
    ratioLabel: '1.91:1',
    width: 1200,
    height: 630,
    fit: 'cover',
    note: 'Aperçu lors des partages sur les réseaux sociaux.',
  },
} as const satisfies Record<string, ImageSlot>;

export type ImageSlotKey = keyof typeof IMAGE_SLOTS;

export type IssueLevel = 'error' | 'warning' | 'info';

export interface ImageIssue {
  level: IssueLevel;
  message: string;
}

export interface ImageReport {
  width: number;
  height: number;
  ratio: number;
  /** Share of the image hidden by the crop, 0 to 1. */
  croppedAway: number;
  issues: ImageIssue[];
}

const RATIO_TOLERANCE = 0.06;
/** Below this share of the recommended size the image visibly softens. */
const MIN_SCALE = 0.6;
const OVERSIZED_SCALE = 2.5;

export function formatRatio(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return '—';
  return ratio >= 1 ? `${ratio.toFixed(2)}:1` : `1:${(1 / ratio).toFixed(2)}`;
}

/**
 * Compares an uploaded image with the slot it is going into and reports what the
 * administrator cannot see for themselves: the crop, and whether it will look
 * soft or weigh the page down.
 */
export function analyseImage(
  image: { width: number | null; height: number | null; size: number; mimeType: string },
  slot: ImageSlot,
): ImageReport {
  const width = image.width ?? 0;
  const height = image.height ?? 0;
  const issues: ImageIssue[] = [];

  if (!width || !height) {
    return {
      width,
      height,
      ratio: 0,
      croppedAway: 0,
      issues: [{ level: 'warning', message: "Les dimensions de cette image n'ont pas pu être lues." }],
    };
  }

  const ratio = width / height;
  const ratioGap = Math.abs(ratio - slot.ratio) / slot.ratio;

  // With `contain` nothing is ever cut off, so a ratio difference is cosmetic.
  const croppedAway =
    slot.fit === 'cover' && ratioGap > 0.001
      ? 1 - Math.min(ratio, slot.ratio) / Math.max(ratio, slot.ratio)
      : 0;

  if (slot.fit === 'cover' && ratioGap > RATIO_TOLERANCE) {
    const side = ratio > slot.ratio ? 'sur les côtés' : 'en haut et en bas';
    issues.push({
      level: 'warning',
      message:
        `Le format ne correspond pas : environ ${Math.round(croppedAway * 100)} % de l'image ` +
        `sera masquée ${side}. Format attendu : ${slot.ratioLabel}.`,
    });
  }

  if (width < slot.width * MIN_SCALE || height < slot.height * MIN_SCALE) {
    issues.push({
      level: 'error',
      message:
        `Image trop petite (${width}×${height} px). Elle apparaîtra floue. ` +
        `Utilisez au minimum ${slot.width}×${slot.height} px.`,
    });
  } else if (width < slot.width || height < slot.height) {
    issues.push({
      level: 'info',
      message: `Un peu en dessous de la taille conseillée (${slot.width}×${slot.height} px), mais exploitable.`,
    });
  }

  if (width > slot.width * OVERSIZED_SCALE) {
    issues.push({
      level: 'info',
      message:
        `Image bien plus grande que nécessaire (${width}×${height} px). ` +
        `La réduire vers ${slot.width}×${slot.height} px accélérera le chargement du site.`,
    });
  }

  if (image.size > 1_000_000) {
    issues.push({
      level: 'warning',
      message: `Fichier lourd (${(image.size / 1_048_576).toFixed(1)} Mo). Compressez-le pour un site plus rapide.`,
    });
  }

  return { width, height, ratio, croppedAway, issues };
}
