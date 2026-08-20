/**
 * Whether a sidebar entry matches the current location.
 *
 * Several entries point at the same page with a different `section`, so a plain
 * `startsWith` on the path would light up all of them at once. When an entry
 * carries a query it must match it; when it does not, it owns the whole page.
 */
export function isNavActive(href: string, pathname: string, search: string): boolean {
  const [path, query] = href.split('?');

  // The dashboard is a prefix of every other admin route.
  if (path === '/admin') return pathname === '/admin';

  const onPage = pathname === path || pathname.startsWith(`${path}/`);
  if (!onPage) return false;

  if (!query) return true;

  const current = new URLSearchParams(search);
  const expected = new URLSearchParams(query);

  return [...expected.entries()].every(([key, value]) => current.get(key) === value);
}
