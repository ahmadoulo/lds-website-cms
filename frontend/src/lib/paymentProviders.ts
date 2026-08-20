/**
 * How each way of giving is presented and acted on.
 *
 * On deep links, deliberately conservative: Wave and Orange Money do not publish
 * a documented URL scheme for "send money to this number", and a link invented
 * here would fail silently on the donor's phone. So the only link ever opened is
 * one the association entered themselves (a Wave Business payment link, for
 * instance). Without it the site shows the number, offers to copy it, and lets
 * the donor dial it - all of which are guaranteed to work.
 */
export type ProviderKey = 'wave' | 'orange_money' | 'bank' | 'cash' | 'other';

export interface ProviderPresentation {
  label: string;
  /** Brand colour, used for the button and the badge. */
  color: string;
  /** What the donor is told to do when no official link is configured. */
  instructions: string;
  /** Whether a phone number is the meaningful detail for this provider. */
  usesPhone: boolean;
}

export const PROVIDERS: Record<ProviderKey, ProviderPresentation> = {
  wave: {
    label: 'Wave',
    color: '#1DC8FF',
    instructions:
      "Ouvrez l'application Wave, choisissez « Envoyer », puis saisissez le numéro ci-dessus.",
    usesPhone: true,
  },
  orange_money: {
    label: 'Orange Money',
    color: '#FF7900',
    instructions:
      "Ouvrez l'application Orange Money ou composez le #144# depuis votre mobile, puis suivez « Transfert d'argent » vers le numéro ci-dessus.",
    usesPhone: true,
  },
  bank: {
    label: 'Virement bancaire',
    color: '#172642',
    instructions: 'Utilisez les coordonnées bancaires ci-dessus depuis votre banque en ligne.',
    usesPhone: false,
  },
  cash: {
    label: 'Espèces',
    color: '#87CE18',
    instructions: 'Contactez-nous pour convenir d’un rendez-vous.',
    usesPhone: false,
  },
  other: {
    label: 'Autre moyen',
    color: '#00A4DE',
    instructions: 'Contactez-nous pour en savoir plus.',
    usesPhone: false,
  },
};

export const isProviderKey = (value: string | null | undefined): value is ProviderKey =>
  Boolean(value) && value! in PROVIDERS;

/** Digits only, for a tel: link. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
