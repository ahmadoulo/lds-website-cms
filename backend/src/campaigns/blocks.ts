import { escapeHtml, type Locale } from '../email/render';

/**
 * A campaign's content, as the editor produces it.
 *
 * Blocks rather than HTML, so that what a volunteer types can only ever
 * become the markup this file writes. The server renders them: tables and
 * inline styles that email clients agree on, and nothing typed in the editor
 * reaching a recipient as markup.
 */
export type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'image'; mediaId: string; alt: string; caption?: string }
  | { type: 'button'; label: string; url: string }
  | { type: 'divider' };

export const BLOCK_TYPES = [
  'heading',
  'paragraph',
  'list',
  'image',
  'button',
  'divider',
] as const;

const MAX_BLOCKS = 100;
const MAX_TEXT = 5000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class InvalidBlocksError extends Error {}

/** Only links a recipient can safely follow: no javascript:, no data:. */
export function safeUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Checks the shape of the blocks an editor sent, and returns them cleaned.
 *
 * The API is the only gate: a request built by hand gets exactly the same
 * checks as one from the editor.
 */
export function validateBlocks(input: unknown): Block[] {
  if (!Array.isArray(input))
    throw new InvalidBlocksError('Le contenu doit être une liste de blocs.');
  if (input.length > MAX_BLOCKS) throw new InvalidBlocksError('Trop de blocs.');

  const text = (value: unknown, field: string): string => {
    if (typeof value !== 'string')
      throw new InvalidBlocksError(`Champ ${field} manquant.`);
    if (value.length > MAX_TEXT)
      throw new InvalidBlocksError(`Champ ${field} trop long.`);
    return value;
  };

  return input.map((raw: unknown) => {
    const block = raw as Record<string, unknown>;
    switch (block?.type) {
      case 'heading':
        return { type: 'heading', text: text(block.text, 'titre') };
      case 'paragraph':
        return { type: 'paragraph', text: text(block.text, 'paragraphe') };
      case 'list': {
        if (!Array.isArray(block.items) || block.items.length > 50) {
          throw new InvalidBlocksError('Liste invalide.');
        }
        return {
          type: 'list',
          items: block.items.map((item) => text(item, 'élément')),
        };
      }
      case 'image': {
        const mediaId = text(block.mediaId, 'image');
        if (!UUID.test(mediaId))
          throw new InvalidBlocksError('Image invalide.');
        return {
          type: 'image',
          mediaId,
          alt: text(block.alt ?? '', 'texte alternatif'),
          ...(block.caption ? { caption: text(block.caption, 'légende') } : {}),
        };
      }
      case 'button': {
        const url = safeUrl(text(block.url, 'lien'));
        if (!url)
          throw new InvalidBlocksError(
            'Le lien du bouton doit commencer par https://',
          );
        return { type: 'button', label: text(block.label, 'libellé'), url };
      }
      case 'divider':
        return { type: 'divider' };
      default:
        throw new InvalidBlocksError('Type de bloc inconnu.');
    }
  });
}

/**
 * The two inline marks a paragraph understands: **bold** and [text](url).
 *
 * Escaped first, marked up second. The order is the whole point: by the time
 * the marks are applied, nothing the person typed can be a tag, so the only
 * markup in the result is the <strong> and <a> written here - and a link
 * whose address is not http, https or mailto stays as the plain text it was.
 */
export function inline(raw: string): string {
  return escapeHtml(raw)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      (whole, label: string, href: string) => {
        // href was escaped along with everything else; undo that to parse it,
        // then escape the parsed result for the attribute.
        const url = safeUrl(href.replace(/&amp;/g, '&'));
        return url
          ? `<a href="${escapeHtml(url)}" style="color:#00A4DE;text-decoration:underline;">${label}</a>`
          : whole;
      },
    )
    .replace(/\n/g, '<br />');
}

/** The same marks, read as plain text: a link becomes "text (url)". */
function plain(raw: string): string {
  return raw
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      (_whole, label: string, href: string) => {
        const url = safeUrl(href);
        return url ? `${label} (${url})` : `${label}`;
      },
    );
}

export interface RenderContext {
  siteUrl: string;
  locale: Locale;
  preheader?: string | null;
  signature?: string | null;
}

/**
 * Blocks to the body of an email, HTML and text. The frame - logo, footer,
 * unsubscribe link - is added around it by the caller, once per recipient.
 */
export function renderBlocks(
  blocks: Block[],
  context: RenderContext,
): { html: string; text: string } {
  const align = context.locale === 'ar' ? 'right' : 'left';
  const html: string[] = [];
  const text: string[] = [];

  /*
    The preheader: the line inbox lists show after the subject. Present in the
    markup, hidden in the email - and padded so the client does not fill the
    rest of the preview with whatever text comes next.
  */
  if (context.preheader) {
    html.push(
      `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(
        context.preheader,
      )}${'&#847;&zwnj;&nbsp;'.repeat(40)}</div>`,
    );
  }

  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
        html.push(
          `<h2 style="margin:24px 0 12px;font-size:20px;line-height:1.3;font-weight:700;color:#172642;text-align:${align};">${escapeHtml(
            block.text,
          )}</h2>`,
        );
        text.push(block.text.toUpperCase(), '');
        break;

      case 'paragraph':
        html.push(
          `<p style="margin:0 0 16px;text-align:${align};">${inline(block.text)}</p>`,
        );
        text.push(plain(block.text), '');
        break;

      case 'list':
        html.push(
          `<ul style="margin:0 0 16px;padding-${align === 'right' ? 'right' : 'left'}:22px;">${block.items
            .map((item) => `<li style="margin:0 0 6px;">${inline(item)}</li>`)
            .join('')}</ul>`,
        );
        text.push(...block.items.map((item) => `- ${plain(item)}`), '');
        break;

      case 'image': {
        // Through the resizing endpoint: an email is no place for the 3 MB
        // original. Mail clients do not ask for WebP, so they get a JPEG.
        const src = `${context.siteUrl}/api/v1/media/${block.mediaId}/file?w=1280`;
        html.push(
          `<p style="margin:0 0 16px;"><img src="${escapeHtml(src)}" alt="${escapeHtml(
            block.alt,
          )}" width="544" style="display:block;width:100%;max-width:544px;height:auto;border:0;border-radius:8px;" /></p>`,
        );
        if (block.caption) {
          html.push(
            `<p style="margin:-8px 0 16px;font-size:13px;color:#6b7280;text-align:${align};">${escapeHtml(
              block.caption,
            )}</p>`,
          );
        }
        if (block.alt) text.push(`[${block.alt}]`, '');
        break;
      }

      case 'button':
        // A table, because Outlook ignores padding on a link.
        html.push(
          `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;"><tr><td style="border-radius:8px;background:#EE7900;"><a href="${escapeHtml(
            block.url,
          )}" style="display:inline-block;padding:12px 22px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(
            block.label,
          )}</a></td></tr></table>`,
        );
        text.push(`${block.label} : ${block.url}`, '');
        break;

      case 'divider':
        html.push(
          '<hr style="border:0;border-top:1px solid #ece8e0;margin:24px 0;" />',
        );
        text.push('—', '');
        break;
    }
  }

  if (context.signature?.trim()) {
    html.push(
      `<p style="margin:24px 0 0;color:#172642;text-align:${align};">${escapeHtml(
        context.signature.trim(),
      ).replace(/\n/g, '<br />')}</p>`,
    );
    text.push(context.signature.trim());
  }

  return { html: html.join('\n'), text: text.join('\n').trim() };
}

/** Every media id the blocks point at, so they can be checked to exist. */
export function mediaIdsIn(blocks: Block[]): string[] {
  return blocks.flatMap((block) =>
    block.type === 'image' ? [block.mediaId] : [],
  );
}
