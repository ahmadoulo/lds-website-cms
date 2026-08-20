import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api/axios', async () => {
  const actual = await vi.importActual<typeof import('../lib/api/axios')>('../lib/api/axios');
  return {
    ...actual,
    default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

import api from '../lib/api/axios';
import { NewsAdmin } from '../pages/admin/NewsAdmin';
import { renderWithProviders } from './testUtils';

const mockedApi = api as unknown as Record<'get' | 'post' | 'patch' | 'delete', ReturnType<typeof vi.fn>>;

/**
 * DataTable renders a table for desktop and cards for mobile, switching with CSS
 * that jsdom does not apply, so both are in the DOM during tests.
 */
const findRowText = (text: string) => screen.findAllByText(text).then((nodes) => nodes[0]);

const ARTICLE = {
  id: 'a1',
  title: { fr: 'Rétrospective 2026' },
  slug: 'retrospective-2026',
  excerpt: { fr: 'Un résumé' },
  content: { fr: '<p>Contenu</p>' },
  categoryId: 'c1',
  category: { id: 'c1', name: { fr: 'Bilan annuel' }, slug: 'bilan-annuel' },
  imageId: null,
  image: null,
  isPublished: false,
  publishedAt: null,
  createdAt: '2026-02-01T10:00:00.000Z',
};

const emptyList = { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 1 } };
const oneItemList = { data: [ARTICLE], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } };

function mockGet(list: unknown) {
  mockedApi.get.mockImplementation((url: string) => {
    if (url === '/news/categories') return Promise.resolve({ data: [ARTICLE.category] });
    return Promise.resolve({ data: list });
  });
}

describe('NewsAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows an actionable empty state rather than a bare table', async () => {
    mockGet(emptyList);
    renderWithProviders(<NewsAdmin />);

    expect(await screen.findByText("Vous n'avez encore aucune actualité")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Créer une actualité/i })).toBeInTheDocument();
  });

  it('surfaces a load failure with a retry action', async () => {
    mockedApi.get.mockRejectedValue({ response: { status: 500 } });
    renderWithProviders(<NewsAdmin />);

    expect(await screen.findByText(/Impossible de charger ces données/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Réessayer/i })).toBeInTheDocument();
  });

  it('lists articles with their publication status', async () => {
    mockGet(oneItemList);
    renderWithProviders(<NewsAdmin />);

    expect(await findRowText('Rétrospective 2026')).toBeInTheDocument();
    expect(screen.getAllByText('Brouillon').length).toBeGreaterThan(0);
  });

  it('validates the form before sending anything to the API', async () => {
    mockGet(emptyList);
    renderWithProviders(<NewsAdmin />);

    await userEvent.click(await screen.findByRole('button', { name: /Nouvelle actualité/i }));
    await userEvent.click(screen.getByRole('button', { name: /Créer l'actualité/i }));

    expect(await screen.findByText('Le titre est obligatoire')).toBeInTheDocument();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('sends a localized payload when creating an article', async () => {
    mockGet(emptyList);
    mockedApi.post.mockResolvedValue({ data: { id: 'new' } });

    renderWithProviders(<NewsAdmin />);
    await userEvent.click(await screen.findByRole('button', { name: /Nouvelle actualité/i }));

    await userEvent.type(screen.getByLabelText(/^Titre/i), 'Nouvelle action');
    await userEvent.type(screen.getByLabelText(/Extrait/i), 'Un court résumé');
    await userEvent.type(screen.getByLabelText(/^Contenu/i), 'Le contenu complet');
    await userEvent.click(screen.getByRole('button', { name: /Créer l'actualité/i }));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledTimes(1));
    const [url, payload] = mockedApi.post.mock.calls[0];
    expect(url).toBe('/news');
    expect(payload).toMatchObject({
      title: { fr: 'Nouvelle action' },
      excerpt: { fr: 'Un court résumé' },
      content: { fr: 'Le contenu complet' },
      isPublished: false,
      imageId: null,
    });
    // The slug is generated server-side when the field is left empty.
    expect(payload.slug).toBeUndefined();
  });

  it('rejects a slug that is not URL-safe', async () => {
    mockGet(emptyList);
    renderWithProviders(<NewsAdmin />);

    await userEvent.click(await screen.findByRole('button', { name: /Nouvelle actualité/i }));
    await userEvent.type(screen.getByLabelText(/^Titre/i), 'Titre');
    await userEvent.type(screen.getByLabelText(/Slug/i), 'Pas Valide!');
    await userEvent.type(screen.getByLabelText(/Extrait/i), 'Résumé');
    await userEvent.type(screen.getByLabelText(/^Contenu/i), 'Contenu');
    await userEvent.click(screen.getByRole('button', { name: /Créer l'actualité/i }));

    expect(
      await screen.findByText('Minuscules, chiffres et tirets uniquement'),
    ).toBeInTheDocument();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('asks for confirmation before deleting', async () => {
    mockGet(oneItemList);
    mockedApi.delete.mockResolvedValue({ data: { success: true } });

    renderWithProviders(<NewsAdmin />);
    await findRowText('Rétrospective 2026');

    await userEvent.click(screen.getAllByRole('button', { name: 'Supprimer' })[0]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Supprimer cette actualité/i)).toBeInTheDocument();
    // Nothing is deleted until the confirmation is accepted.
    expect(mockedApi.delete).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }));
    await waitFor(() => expect(mockedApi.delete).toHaveBeenCalledWith('/news/a1'));
  });

  it('toggles publication through the API, not local state', async () => {
    mockGet(oneItemList);
    mockedApi.patch.mockResolvedValue({ data: { ...ARTICLE, isPublished: true } });

    renderWithProviders(<NewsAdmin />);
    await findRowText('Rétrospective 2026');

    await userEvent.click(screen.getAllByRole('button', { name: 'Publier' })[0]);

    await waitFor(() =>
      expect(mockedApi.patch).toHaveBeenCalledWith('/news/a1', { isPublished: true }),
    );
  });
});
