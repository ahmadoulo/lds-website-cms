/**
 * Turning a template and some values into an email that is safe to send.
 *
 * Three separate dangers, handled in three places:
 *
 * - A visitor's name or message pasted into HTML. `{{name}}` is escaped before
 *   it reaches the markup, always, so "<script>" in a contact form arrives in
 *   the inbox as text.
 * - A visitor's input reaching a header. A subject or a name containing a
 *   line break is how one email becomes two, or acquires a Bcc. Header values
 *   are refused outright if they carry CR or LF.
 * - The template itself. It is written by an administrator, not a visitor, so
 *   its own markup is kept - but only the variables declared for it are
 *   substituted, and an unknown one is left visible rather than silently
 *   emptied, so a typo shows up in the preview instead of in a sent email.
 */

export type Locale = 'fr' | 'ar';

export type Localized = Partial<Record<Locale, string>> | null | undefined;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** A line break in a header value is how one message becomes two. */
export class HeaderInjectionError extends Error {
  constructor(field: string) {
    super(`The ${field} contains a line break and was refused.`);
  }
}

export function assertHeaderSafe(
  field: string,
  value: string | null | undefined,
): void {
  if (value && /[\r\n]/.test(value)) throw new HeaderInjectionError(field);
}

/**
 * A deliberately plain address check.
 *
 * Not RFC 5322 - nothing short of sending proves an address exists - but
 * enough to refuse what would certainly fail: no @, spaces, a missing domain,
 * a line break. class-validator's IsEmail does the same job at the API edge;
 * this is the last check before a header is written.
 */
export function isPlausibleEmail(
  value: string | null | undefined,
): value is string {
  if (!value || value.length > 254) return false;
  if (/[\s\r\n<>,;]/.test(value)) return false;
  return /^[^@]+@[^@]+\.[^@]+$/.test(value);
}

/** Reads one language, falling back to French: an email must never go out blank. */
export function pick(value: Localized, locale: Locale): string {
  if (!value) return '';
  return value[locale] || value.fr || '';
}

const VARIABLE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

/** The variables a template refers to, for validation and for the editor. */
export function variablesIn(template: string): string[] {
  return [
    ...new Set([...template.matchAll(VARIABLE)].map((match) => match[1])),
  ];
}

/**
 * Fills `{{name}}` from `values`.
 *
 * In HTML every value is escaped. In plain text it is not, because there is no
 * markup to break - escaping there would print "&amp;" into the email.
 * A variable with no value is left as written, so it is visible in a preview.
 */
export function fill(
  template: string,
  values: Record<string, string | number | null | undefined>,
  mode: 'html' | 'text',
): string {
  return template.replace(VARIABLE, (whole, name: string) => {
    const value = values[name];
    if (value === undefined || value === null) return whole;
    const text = String(value);
    return mode === 'html' ? escapeHtml(text) : text;
  });
}

/** A one-line subject: variables filled, line breaks refused. */
export function fillSubject(
  template: string,
  values: Record<string, string | number | null | undefined>,
): string {
  const subject = fill(template, values, 'text').trim();
  assertHeaderSafe('subject', subject);
  return subject;
}

export interface Layout {
  siteName: string;
  siteUrl: string;
  logoUrl: string | null;
  address: string | null;
  /** Shown only on mail a person can stop receiving. */
  unsubscribeUrl?: string | null;
  locale: Locale;
}

/**
 * The frame every email is drawn in.
 *
 * Email clients are not browsers. Outlook renders with Word, Gmail strips
 * <style> blocks in some views, and none of them reliably supports flexbox,
 * grid or web fonts. So: tables for layout, every style inline, a system font
 * stack, a single 600px column, and colours written out rather than inherited.
 * It is plain on purpose; plain is what arrives looking the way it was sent.
 *
 * Arabic gets dir="rtl" on the table cells themselves, because several clients
 * ignore it on <html>.
 */
export function frame(body: string, layout: Layout): string {
  const dir = layout.locale === 'ar' ? 'rtl' : 'ltr';
  const align = dir === 'rtl' ? 'right' : 'left';
  const font =
    layout.locale === 'ar'
      ? "Tahoma, 'Segoe UI', Arial, sans-serif"
      : "'Segoe UI', Helvetica, Arial, sans-serif";

  const logo = layout.logoUrl
    ? `<img src="${escapeHtml(layout.logoUrl)}" width="44" height="44" alt="" style="display:block;border:0;width:44px;height:44px;" />`
    : '';

  const unsubscribe = layout.unsubscribeUrl
    ? `<p style="margin:12px 0 0;"><a href="${escapeHtml(layout.unsubscribeUrl)}" style="color:#6b7280;text-decoration:underline;">${
        layout.locale === 'ar' ? 'إلغاء الاشتراك' : 'Se désinscrire'
      }</a></p>`
    : '';

  return `<!doctype html>
<html lang="${layout.locale}" dir="${dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${escapeHtml(layout.siteName)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f2ec;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f2ec;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;">
<tr><td dir="${dir}" align="${align}" style="padding:24px 28px 0;border-top:4px solid #87CE18;border-radius:12px 12px 0 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-${dir === 'rtl' ? 'left' : 'right'}:12px;">${logo}</td>
<td dir="${dir}" style="font-family:${font};font-size:16px;font-weight:700;color:#172642;">${escapeHtml(layout.siteName)}</td>
</tr></table>
</td></tr>
<tr><td dir="${dir}" align="${align}" style="padding:24px 28px 28px;font-family:${font};font-size:15px;line-height:1.6;color:#172642;">
${body}
</td></tr>
<tr><td dir="${dir}" align="${align}" style="padding:18px 28px 24px;border-top:1px solid #ece8e0;font-family:${font};font-size:12px;line-height:1.5;color:#6b7280;">
<p style="margin:0;"><a href="${escapeHtml(layout.siteUrl)}" style="color:#00A4DE;text-decoration:none;">${escapeHtml(
    layout.siteUrl.replace(/^https?:\/\//, ''),
  )}</a></p>
${layout.address ? `<p style="margin:6px 0 0;">${escapeHtml(layout.address)}</p>` : ''}
${unsubscribe}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
