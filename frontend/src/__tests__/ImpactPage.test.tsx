import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const get = vi.fn();
vi.mock('../lib/api/axios', () => ({
  default: { get: (...args: any[]) => get(...args) },
  apiErrorMessage: () => 'erreur',
}));

vi.mock('../context/SettingsContext', () => ({
  useSettings: () => ({ settings: undefined, isLoading: false, error: null }),
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { ImpactPage } from '../pages/public/ImpactPage';

const media = (id: string) => ({
  id: `media-${id}`,
  originalName: `${id}.jpg`,
  storageKey: `gallery/${id}.jpg`,
  bucket: 'lds-media',
  folder: 'gallery',
  mimeType: 'image/jpeg',
  size: 1000,
  width: 1200,
  height: 900,
  altText: null,
  url: `http://api.test/api/v1/media/${id}/file`,
  createdAt: '2026-01-01T00:00:00.000Z',
});

const PAYLOAD: Record<string, unknown> = {
  '/public/impact': [
    // Stored as navy, the colour of the band it is drawn on.
    { id: 's1', label: { fr: 'Arbres plantés' }, value: 20, color: '#172642', icon: null,
      order: 0, isPublished: true },
    { id: 's2', label: { fr: 'Kits scolaires' }, value: 620, color: '#87CE18', icon: 'Backpack',
      order: 1, isPublished: true },
  ],
  '/public/missions': [
    { id: 'm1', title: { fr: 'Éducation' }, description: { fr: 'Cours de vacances gratuits' }, icon: 'GraduationCap',
      order: 0, isPublished: true, imageId: null, image: null },
  ],
  '/public/gallery/images': [
    { id: 'g1', caption: { fr: 'Distribution' }, order: 0, albumId: 'a1', mediaId: 'media-1',
      media: media('1') },
  ],
};

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ImpactPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  get.mockReset();
  get.mockImplementation((url: string) => Promise.resolve({ data: PAYLOAD[url] ?? [] }));
});

describe('ImpactPage', () => {
  it('shows the figures from the API', async () => {
    renderPage();

    expect(await screen.findByText('Kits scolaires')).toBeInTheDocument();
    expect(screen.getByText('Arbres plantés')).toBeInTheDocument();
  });

  it('never draws a figure in the colour of the band behind it', async () => {
    renderPage();

    const label = await screen.findByText('Arbres plantés');
    const figure = label.parentElement?.querySelector('dd');

    // The stored colour is navy, and so is the section: it has to be rescued.
    expect(figure).toBeTruthy();
    expect(figure!.getAttribute('style')).not.toMatch(/#172642|rgb\(23,\s*38,\s*66\)/i);
  });

  it('explains where the figures come from, using the real actions', async () => {
    renderPage();

    expect(await screen.findByText('Les actions qui les produisent')).toBeInTheDocument();
    expect(screen.getByText('Éducation')).toBeInTheDocument();
  });

  it('backs the figures with photographs from the gallery', async () => {
    renderPage();

    expect(await screen.findByText('Ces chiffres en images')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'http://api.test/api/v1/media/1/file',
    );
  });

  it('omits a supporting section rather than inventing content for it', async () => {
    get.mockImplementation((url: string) =>
      Promise.resolve({ data: url === '/public/impact' ? PAYLOAD['/public/impact'] : [] }),
    );
    renderPage();

    await screen.findByText('Arbres plantés');
    expect(screen.queryByText('Les actions qui les produisent')).not.toBeInTheDocument();
    expect(screen.queryByText('Ces chiffres en images')).not.toBeInTheDocument();
  });

  it('always offers the way to contribute', async () => {
    renderPage();
    expect(await screen.findByText('Contribuer à cet impact')).toBeInTheDocument();
  });
});
