/** Turns a human title into a URL-safe slug (accents removed, spaces to dashes). */
export function slugify(input: string): string {
  return (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

/**
 * Appends -2, -3, ... until the slug is free. `exists` is injected so the caller
 * decides which table (and which record to exclude when updating) is checked.
 */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
  fallback = 'element',
): Promise<string> {
  const root = slugify(base) || fallback;
  let candidate = root;
  let suffix = 1;

  while (await exists(candidate)) {
    suffix += 1;
    candidate = `${root}-${suffix}`;
    if (suffix > 500) {
      candidate = `${root}-${Date.now()}`;
      break;
    }
  }

  return candidate;
}
