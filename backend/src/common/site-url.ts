/**
 * The site's public address, normalised: scheme and host (and port), no path,
 * no trailing slash.
 *
 * Returns null for anything that is not a plain http(s) origin, so a value
 * with a path, a query, credentials or a script scheme can never be stored and
 * then written into every email's links.
 */
export function normaliseSiteUrl(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password) return null;
  if (!url.hostname || url.hostname.includes('..')) return null;
  return `${url.protocol}//${url.host}`;
}

/** The deployment's own declaration, when it makes one. */
export function configuredSiteUrl(): string | null {
  return normaliseSiteUrl(process.env.PUBLIC_SITE_URL);
}
