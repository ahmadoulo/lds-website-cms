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
  /** Ideal source size in pixels. Advisory, never enforced. */
  width: number;
  height: number;
  /**
   * Below this the image is genuinely unusable at the size it is displayed.
   * Anything between this and the recommended size is accepted with a note.
   */
  minWidth: number;
  /** How the image is fitted: `cover` crops, `contain` never does. */
  fit: 'cover' | 'contain';
  /** An icon slot also accepts .ico. */
  allowIcon?: boolean;
  note?: string;
}

const SLOTS = {
  heroPortrait: {
    ratio: 3 / 4,
    ratioLabel: '3:4 (portrait)',
    width: 900,
    height: 1200,
    minWidth: 480,
    fit: 'cover',
    note: "Photo verticale du bandeau d'accueil.",
  },
  aboutPhoto: {
    ratio: 4 / 3,
    ratioLabel: '4:3 (paysage)',
    width: 1200,
    height: 900,
    minWidth: 560,
    fit: 'cover',
    note: 'Photo de présentation de l’association.',
  },
  ctaBanner: {
    ratio: 21 / 9,
    ratioLabel: '21:9 (bandeau large)',
    width: 1920,
    height: 823,
    minWidth: 900,
    fit: 'cover',
    note: 'Image de fond, assombrie et recouverte de texte : évitez un sujet au centre.',
  },
  missionCover: {
    ratio: 16 / 10,
    ratioLabel: '16:10',
    width: 1200,
    height: 750,
    minWidth: 420,
    fit: 'cover',
    note: "Vignette d'un domaine d'action.",
  },
  newsCover: {
    ratio: 4 / 3,
    ratioLabel: '4:3',
    width: 1200,
    height: 900,
    minWidth: 420,
    fit: 'cover',
    note: "Couverture d'article. Recadrée en 16:9 sur la page de l'article.",
  },
  galleryPhoto: {
    ratio: 4 / 3,
    ratioLabel: '4:3',
    width: 1200,
    height: 900,
    minWidth: 400,
    fit: 'cover',
  },
  partnerLogo: {
    ratio: 3 / 2,
    ratioLabel: '3:2',
    width: 600,
    height: 400,
    minWidth: 160,
    fit: 'contain',
    note: 'Affiché entier, jamais recadré. Fond transparent recommandé (PNG ou WebP).',
  },
  siteLogo: {
    ratio: 3 / 1,
    ratioLabel: '3:1 (horizontal)',
    width: 600,
    height: 200,
    minWidth: 160,
    fit: 'contain',
    note: 'Affiché entier. Fond transparent recommandé.',
  },
  favicon: {
    ratio: 1,
    ratioLabel: '1:1 (carré)',
    width: 512,
    height: 512,
    minWidth: 32,
    fit: 'contain',
    allowIcon: true,
    note: 'Icône de l’onglet du navigateur. Un .ico multi-tailles (16, 32, 48 px) ou un PNG carré de 512 px conviennent.',
  },
  ogImage: {
    ratio: 1.91,
    ratioLabel: '1.91:1',
    width: 1200,
    height: 630,
    minWidth: 600,
    fit: 'cover',
    note: 'Aperçu lors des partages sur les réseaux sociaux.',
  },
} as const satisfies Record<string, ImageSlot>;

export type ImageSlotKey = keyof typeof SLOTS;

/**
 * Widened to ImageSlot so optional fields such as `allowIcon` are readable on
 * every entry, while the key union stays exact.
 */
export const IMAGE_SLOTS: Record<ImageSlotKey, ImageSlot> = SLOTS;

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

/** Ratio differences under this are invisible once rendered. */
const RATIO_TOLERANCE = 0.08;
const OVERSIZED_SCALE = 3;

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

  // An .ico holds several sizes at once, so there is nothing to compare.
  if (!width || !height) {
    return {
      width,
      height,
      ratio: 0,
      croppedAway: 0,
      issues: slot.allowIcon
        ? []
        : [{ level: 'info', message: "Les dimensions de cette image n'ont pas pu être lues." }],
    };
  }

  const ratio = width / height;
  const ratioGap = Math.abs(ratio - slot.ratio) / slot.ratio;

  // With `contain` nothing is ever cut off, so a ratio difference is cosmetic.
  const croppedAway =
    slot.fit === 'cover' && ratioGap > 0.001
      ? 1 - Math.min(ratio, slot.ratio) / Math.max(ratio, slot.ratio)
      : 0;

  // A crop is not a defect: it is simply something the administrator should see
  // coming, so it is reported at the level of a remark.
  if (slot.fit === 'cover' && ratioGap > RATIO_TOLERANCE) {
    const side = ratio > slot.ratio ? 'sur les côtés' : 'en haut et en bas';
    issues.push({
      level: 'info',
      message:
        `Format différent du cadrage (${slot.ratioLabel}) : environ ` +
        `${Math.round(croppedAway * 100)} % de l'image sera masquée ${side}. ` +
        "Utilisez « Voir l'image entière » pour vérifier ce qui reste visible.",
    });
  }

  // Only a size that is genuinely unusable at the dimensions the slot renders at
  // is reported as a problem. Everything above it is accepted.
  if (width < slot.minWidth) {
    issues.push({
      level: 'warning',
      message:
        `Image de ${width}×${height} px : elle risque d'apparaître floue à cet emplacement, ` +
        `affiché jusqu'à ${slot.minWidth} px de large. Idéalement ${slot.width}×${slot.height} px.`,
    });
  } else if (width < slot.width) {
    issues.push({
      level: 'info',
      message: `En dessous de la taille conseillée (${slot.width}×${slot.height} px), mais tout à fait utilisable.`,
    });
  }

  if (width > slot.width * OVERSIZED_SCALE) {
    issues.push({
      level: 'info',
      message:
        `Image bien plus grande que nécessaire (${width}×${height} px). ` +
        `La réduire vers ${slot.width}×${slot.height} px allégera le site.`,
    });
  }

  if (image.size > 1_500_000) {
    issues.push({
      level: 'info',
      message: `Fichier de ${(image.size / 1_048_576).toFixed(1)} Mo. Le compresser accélérera le chargement.`,
    });
  }

  return { width, height, ratio, croppedAway, issues };
}
