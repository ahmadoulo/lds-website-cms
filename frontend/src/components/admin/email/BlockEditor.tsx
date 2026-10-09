import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bold,
  Heading2,
  Image as ImageIcon,
  Link2,
  List,
  Minus,
  MousePointerClick,
  Pilcrow,
  Trash2,
} from 'lucide-react';
import api from '../../../lib/api/axios';
import { useT } from '../../../lib/i18n/useT';
import { Field, Input, Textarea } from '../../ui/Field';
import { IconButton } from '../ui/DataTable';
import { MediaLibraryModal } from '../ui/MediaPicker';
import type { CampaignBlock } from '../../../lib/types';

type BlockType = CampaignBlock['type'];

const ICONS: Record<BlockType, typeof Pilcrow> = {
  heading: Heading2,
  paragraph: Pilcrow,
  list: List,
  image: ImageIcon,
  button: MousePointerClick,
  divider: Minus,
};

const EMPTY: Record<BlockType, () => CampaignBlock> = {
  heading: () => ({ type: 'heading', text: '' }),
  paragraph: () => ({ type: 'paragraph', text: '' }),
  list: () => ({ type: 'list', items: [''] }),
  image: () => ({ type: 'image', mediaId: '', alt: '' }),
  button: () => ({ type: 'button', label: '', url: 'https://' }),
  divider: () => ({ type: 'divider' }),
};

/** A thumbnail of a library image, from its id: the block stores nothing else. */
const thumbnail = (mediaId: string) => `${api.defaults.baseURL}/media/${mediaId}/file?w=640`;

/**
 * The campaign editor: a column of blocks.
 *
 * Deliberately not a rich-text editor. What it produces is a list of typed
 * blocks the server turns into email HTML itself, so nothing typed here can
 * reach a recipient as markup, every email client gets the same tables, and
 * there is no editor library to keep up to date. Bold and links are the only
 * inline marks, written **like this** and [like this](https://...).
 */
export const BlockEditor = ({
  blocks,
  onChange,
  dir,
}: {
  blocks: CampaignBlock[];
  onChange: (blocks: CampaignBlock[]) => void;
  /** The campaign's language, not the back-office's. */
  dir: 'ltr' | 'rtl';
}) => {
  const t = useT();
  const c = t.admin.email.campaigns;
  const [pickingFor, setPickingFor] = useState<number | null>(null);

  const replace = (index: number, block: CampaignBlock) =>
    onChange(blocks.map((current, i) => (i === index ? block : current)));
  const move = (index: number, by: -1 | 1) => {
    const next = [...blocks];
    const [block] = next.splice(index, 1);
    next.splice(index + by, 0, block);
    onChange(next);
  };
  const remove = (index: number) => onChange(blocks.filter((_, i) => i !== index));
  const add = (type: BlockType) => onChange([...blocks, EMPTY[type]()]);

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <p className="rounded-xl border border-dashed border-navy/15 px-4 py-6 text-center text-sm text-navy/50">
          {c.emptyContent}
        </p>
      )}

      {blocks.map((block, index) => {
        const Icon = ICONS[block.type];
        return (
          <div key={index} className="rounded-xl border border-navy/10 bg-white">
            <div className="flex items-center justify-between gap-2 border-b border-navy/8 px-3 py-1.5">
              <span className="flex items-center gap-2 text-xs font-semibold text-navy/60">
                <Icon className="h-4 w-4" aria-hidden /> {c.blockTypes[block.type]}
              </span>
              <span className="flex items-center">
                <IconButton
                  label={c.moveUp}
                  icon={ArrowUp}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                />
                <IconButton
                  label={c.moveDown}
                  icon={ArrowDown}
                  disabled={index === blocks.length - 1}
                  onClick={() => move(index, 1)}
                />
                <IconButton label={c.removeBlock} icon={Trash2} tone="danger" onClick={() => remove(index)} />
              </span>
            </div>
            <div className="p-3">
              <BlockFields
                block={block}
                dir={dir}
                onChange={(next) => replace(index, next)}
                onPickImage={() => setPickingFor(index)}
              />
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs font-semibold text-navy/50">{c.addBlock} :</span>
        {(Object.keys(EMPTY) as BlockType[]).map((type) => {
          const Icon = ICONS[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => add(type)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-navy/12 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy transition-colors hover:border-navy/30"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden /> {c.blockTypes[type]}
            </button>
          );
        })}
      </div>

      <MediaLibraryModal
        isOpen={pickingFor !== null}
        onClose={() => setPickingFor(null)}
        onSelect={(media) => {
          if (pickingFor === null) return;
          const current = blocks[pickingFor];
          if (current.type === 'image') {
            replace(pickingFor, {
              ...current,
              mediaId: media.id,
              // The library's own description, when it has one, as a start.
              alt: current.alt || media.altText?.fr || '',
            });
          }
          setPickingFor(null);
        }}
      />
    </div>
  );
};

const BlockFields = ({
  block,
  dir,
  onChange,
  onPickImage,
}: {
  block: CampaignBlock;
  dir: 'ltr' | 'rtl';
  onChange: (block: CampaignBlock) => void;
  onPickImage: () => void;
}) => {
  const t = useT();
  const c = t.admin.email.campaigns;
  const area = useRef<HTMLTextAreaElement>(null);

  /** Wraps the selection in the mark, or inserts a placeholder for it. */
  const mark = (kind: 'bold' | 'link') => {
    if (block.type !== 'paragraph' || !area.current) return;
    const { selectionStart: start, selectionEnd: end, value } = area.current;
    const selected = value.slice(start, end) || (kind === 'bold' ? 'texte' : 'lien');
    const wrapped = kind === 'bold' ? `**${selected}**` : `[${selected}](https://)`;
    onChange({ ...block, text: value.slice(0, start) + wrapped + value.slice(end) });
    requestAnimationFrame(() => area.current?.focus());
  };

  switch (block.type) {
    case 'heading':
      return (
        <Input
          dir={dir}
          aria-label={c.blockTypes.heading}
          className="text-base font-bold"
          value={block.text}
          onChange={(event) => onChange({ ...block, text: event.target.value })}
        />
      );

    case 'paragraph':
      return (
        <div className="space-y-2">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => mark('bold')}
              className="inline-flex items-center gap-1 rounded-md border border-navy/12 px-2 py-1 text-xs font-semibold text-navy hover:border-navy/30"
            >
              <Bold className="h-3.5 w-3.5" aria-hidden /> {c.bold}
            </button>
            <button
              type="button"
              onClick={() => mark('link')}
              className="inline-flex items-center gap-1 rounded-md border border-navy/12 px-2 py-1 text-xs font-semibold text-navy hover:border-navy/30"
            >
              <Link2 className="h-3.5 w-3.5" aria-hidden /> {c.link}
            </button>
          </div>
          <Textarea
            ref={area}
            dir={dir}
            rows={4}
            aria-label={c.blockTypes.paragraph}
            value={block.text}
            onChange={(event) => onChange({ ...block, text: event.target.value })}
          />
          <p className="text-xs text-navy/45">{c.paragraphHint}</p>
        </div>
      );

    case 'list':
      return (
        <div className="space-y-1">
          <Textarea
            dir={dir}
            rows={4}
            aria-label={c.blockTypes.list}
            value={block.items.join('\n')}
            onChange={(event) => onChange({ ...block, items: event.target.value.split('\n') })}
          />
          <p className="text-xs text-navy/45">{c.listHint}</p>
        </div>
      );

    case 'image':
      return (
        <div className="space-y-3">
          {block.mediaId ? (
            <img
              src={thumbnail(block.mediaId)}
              alt=""
              className="max-h-48 rounded-lg object-contain"
            />
          ) : null}
          <button
            type="button"
            onClick={onPickImage}
            className="rounded-lg border border-navy/15 px-3 py-2 text-sm font-semibold text-navy hover:border-navy/35"
          >
            {block.mediaId ? c.imageChange : c.imageChoose}
          </button>
          <Field label={c.imageAlt} hint={c.imageAltHint}>
            <Input dir={dir} value={block.alt} onChange={(event) => onChange({ ...block, alt: event.target.value })} />
          </Field>
          <Field label={c.caption}>
            <Input
              dir={dir}
              value={block.caption ?? ''}
              onChange={(event) => onChange({ ...block, caption: event.target.value })}
            />
          </Field>
        </div>
      );

    case 'button':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={c.buttonLabel}>
            <Input dir={dir} value={block.label} onChange={(event) => onChange({ ...block, label: event.target.value })} />
          </Field>
          <Field label={c.buttonUrl}>
            <Input
              dir="ltr"
              type="url"
              value={block.url}
              onChange={(event) => onChange({ ...block, url: event.target.value })}
            />
          </Field>
        </div>
      );

    case 'divider':
      return <hr className="border-navy/10" />;
  }
};
