import React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { formatBytes } from '../../../lib/queries/adminHooks';
import { analyseImage, formatRatio, type ImageSlot } from '../../../lib/imageAnalysis';
import { cn } from '../../../lib/cn';

const LEVEL_STYLES = {
  error: { icon: XCircle, className: 'text-red-600', row: 'bg-red-50 border-red-200' },
  warning: { icon: AlertTriangle, className: 'text-orange', row: 'bg-orange/5 border-orange/25' },
  info: { icon: Info, className: 'text-blue', row: 'bg-blue/5 border-blue/20' },
} as const;

interface ImageStats {
  width: number | null;
  height: number | null;
  size: number;
  mimeType: string;
  name: string;
}

/**
 * Everything the administrator cannot work out by looking at a thumbnail: the
 * real dimensions, the weight, and above all what the site is going to crop.
 *
 * It takes plain stats rather than a stored Media, so a file that has only been
 * selected locally is analysed exactly like one already in the library.
 */
export const ImageReportPanel = ({ stats, slot }: { stats: ImageStats; slot: ImageSlot }) => {
  const report = analyseImage(stats, slot);

  return (
    <div className="space-y-2">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-navy/60">
        <div className="flex justify-between gap-2">
          <dt>Dimensions</dt>
          <dd className="font-semibold text-navy">
            {report.width && report.height ? `${report.width}×${report.height}` : '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Conseillé</dt>
          <dd className="font-semibold text-navy">
            {slot.width}×{slot.height}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Poids</dt>
          <dd className="font-semibold text-navy">{formatBytes(stats.size)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Format</dt>
          <dd className="font-semibold text-navy">
            {formatRatio(report.ratio)}
            <span className="ml-1 font-normal text-navy/45">/ {slot.ratioLabel}</span>
          </dd>
        </div>
      </dl>

      {report.issues.length === 0 ? (
        <p className="flex items-center gap-1.5 rounded-lg border border-green/25 bg-green/5 px-2.5 py-1.5 text-xs font-medium text-[#4d7c0f]">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          Cette image convient parfaitement à cet emplacement.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {report.issues.map((issue, index) => {
            const style = LEVEL_STYLES[issue.level];
            return (
              <li
                key={index}
                className={cn(
                  'flex items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs leading-snug',
                  style.row,
                )}
              >
                <style.icon className={cn('mt-px h-3.5 w-3.5 shrink-0', style.className)} />
                <span className="text-navy/80">{issue.message}</span>
              </li>
            );
          })}
        </ul>
      )}

      {slot.note && <p className="text-xs italic text-navy/45">{slot.note}</p>}

      {stats.width !== null && (
        <p className="text-xs text-navy/45">
          Pensez à décrire l'image dans la bibliothèque de médias : cette description est
          lue par les lecteurs d'écran et affichée si l'image ne charge pas.
        </p>
      )}
    </div>
  );
};
