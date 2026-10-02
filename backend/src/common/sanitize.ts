import sanitizeHtml from 'sanitize-html';

/**
 * Rich-text bodies are authored in the admin and rendered with dangerouslySetInnerHTML
 * on the public site, so they are sanitised on the way into the database. Editors are
 * trusted, but a compromised editor account must not be able to plant a stored XSS.
 */
const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote',
    'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'img', 'figure', 'figcaption', 'hr',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    '*': ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  transformTags: {
    // Any external link opened in a new tab must not leak the opener.
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.target === '_blank'
        ? { ...attribs, rel: 'noopener noreferrer' }
        : attribs,
    }),
  },
  disallowedTagsMode: 'discard',
};

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html ?? '', RICH_TEXT_OPTIONS);
}

/** Strips every tag - used for excerpts and other plain-text fields. */
export function sanitizePlainText(value: string): string {
  return sanitizeHtml(value ?? '', { allowedTags: [], allowedAttributes: {} }).trim();
}

/** Applies a sanitiser to every locale of a localized JSON field. */
export function sanitizeLocalized(
  value: Record<string, string> | undefined,
  sanitizer: (input: string) => string,
): Record<string, string> | undefined {
  if (!value) return value;
  return Object.fromEntries(
    Object.entries(value).map(([locale, text]) => [locale, sanitizer(text)]),
  );
}

/**
 * Folds an incoming set of translations into the one already stored.
 *
 * An update used to assign the sanitised payload straight onto the column,
 * which replaced the whole JSON object. The admin forms only ever send the
 * locales they display, so editing a record seeded with { fr, en } silently
 * destroyed its English - and would do the same to Arabic the day a form is
 * built that only shows French. Merging keeps every locale the editor did not
 * touch; sending a locale as an empty string is how one is deliberately
 * removed, which is the only way a translation can now be deleted.
 */
/**
 * Merges every named localized field of an update payload into the stored row.
 *
 * Mutates and returns the payload, so a service can keep writing `data: dto`
 * without restructuring. A field the payload does not carry is left alone.
 */
export function mergeLocalizedFields<T extends Record<string, any>>(
  stored: Record<string, any> | null | undefined,
  payload: T,
  fields: readonly string[],
): T {
  for (const field of fields) {
    if (payload[field] === undefined) continue;
    (payload as Record<string, any>)[field] = mergeLocalized(stored?.[field], payload[field]);
  }
  return payload;
}

export function mergeLocalized(
  stored: unknown,
  incoming: Record<string, string> | undefined,
): Record<string, string> | null {
  const base: Record<string, string> =
    stored && typeof stored === 'object' && !Array.isArray(stored)
      ? { ...(stored as Record<string, string>) }
      : {};

  for (const [locale, text] of Object.entries(incoming ?? {})) {
    if (typeof text === 'string' && text.trim() === '') delete base[locale];
    else base[locale] = text;
  }

  return Object.keys(base).length ? base : null;
}
