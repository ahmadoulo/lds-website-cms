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
