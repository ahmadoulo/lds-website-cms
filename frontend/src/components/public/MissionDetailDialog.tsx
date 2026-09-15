import React from 'react';
import { ImageIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { CtaLink } from './CtaLink';
import { resolveIcon } from '../../lib/icons';
import { t, type Mission } from '../../lib/types';

/**
 * The full record of one domain of intervention.
 *
 * Everything shown here comes from the mission itself. The long form is
 * optional: until the association writes one, the dialog shows the photo at
 * full width and the complete description, which on a phone is already more
 * than the card can hold (the card clamps it to three lines).
 */
export const MissionDetailDialog = ({
  mission,
  accent,
  onClose,
}: {
  mission: Mission | null;
  accent: string;
  onClose: () => void;
}) => {
  const Icon = resolveIcon(mission?.icon);
  const longForm = mission?.content ? t(mission.content) : '';

  return (
    <Modal isOpen={Boolean(mission)} onClose={onClose} title={mission ? t(mission.title) : ''} size="lg">
      {mission && (
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-xl bg-warm-muted">
            <div className="aspect-[16/9]">
              {mission.image ? (
                <img
                  src={mission.image.url}
                  /* The dialog is already named by its heading: a caption here
                     would have a screen reader read the title twice. */
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={mission.image.width ?? undefined}
                  height={mission.image.height ?? undefined}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageIcon className="h-10 w-10 text-navy/15" aria-hidden />
                </div>
              )}
            </div>

            <span
              className={`absolute bottom-4 left-4 flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-e2 ring-4 ring-white ${accent}`}
              aria-hidden
            >
              <Icon className="h-5 w-5" />
            </span>
          </div>

          <p className="text-body-lg leading-relaxed text-navy/80">{t(mission.description)}</p>

          {longForm && (
            <div className="prose-lds" dangerouslySetInnerHTML={{ __html: longForm }} />
          )}

          <div className="flex flex-col gap-3 border-t border-navy/10 pt-5 sm:flex-row">
            <CtaLink to="/nous-soutenir">Nous soutenir</CtaLink>
            <CtaLink to="/contact" variant="secondary">
              Nous contacter
            </CtaLink>
          </div>
        </div>
      )}
    </Modal>
  );
};
