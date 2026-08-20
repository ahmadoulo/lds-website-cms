import { describe, expect, it } from 'vitest';
import { isNavActive } from '../components/admin/layout/isNavActive';

describe('isNavActive', () => {
  it('matches the dashboard only on its exact path', () => {
    expect(isNavActive('/admin', '/admin', '')).toBe(true);
    // Every admin route starts with /admin; only the dashboard itself counts.
    expect(isNavActive('/admin', '/admin/actualites', '')).toBe(false);
  });

  it('matches a plain page', () => {
    expect(isNavActive('/admin/actualites', '/admin/actualites', '')).toBe(true);
  });

  it('matches a nested route of that page', () => {
    expect(isNavActive('/admin/actualites', '/admin/actualites/12', '')).toBe(true);
  });

  it('does not match a different page with a shared prefix', () => {
    expect(isNavActive('/admin/media', '/admin/medias', '')).toBe(false);
  });

  it('requires the query to match when the entry carries one', () => {
    const href = '/admin/parametres?section=homepage';

    expect(isNavActive(href, '/admin/parametres', '?section=homepage')).toBe(true);
    expect(isNavActive(href, '/admin/parametres', '?section=branding')).toBe(false);
    expect(isNavActive(href, '/admin/parametres', '')).toBe(false);
  });

  it('lights up only one of two entries sharing a page', () => {
    const accueil = '/admin/parametres?section=homepage';
    const parametres = '/admin/parametres?section=branding';
    const search = '?section=homepage';

    expect(isNavActive(accueil, '/admin/parametres', search)).toBe(true);
    // The regression that made both appear selected at once.
    expect(isNavActive(parametres, '/admin/parametres', search)).toBe(false);
  });

  it('ignores unrelated query parameters', () => {
    expect(
      isNavActive('/admin/parametres?section=seo', '/admin/parametres', '?section=seo&page=2'),
    ).toBe(true);
  });

  it('matches an entry without a query whatever the query is', () => {
    expect(isNavActive('/admin/medias', '/admin/medias', '?page=3')).toBe(true);
  });
});
