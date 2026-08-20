import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';

vi.mock('../lib/api/axios', async () => {
  const actual = await vi.importActual<typeof import('../lib/api/axios')>('../lib/api/axios');
  return { ...actual, default: { get: vi.fn(), post: vi.fn() } };
});

vi.mock('../context/SettingsContext', () => ({
  useSettings: () => ({ settings: undefined, isLoading: false, error: null }),
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import api from '../lib/api/axios';
import Home from '../pages/public/Home';
import { renderWithProviders } from './testUtils';

const mockedApi = api as unknown as { get: ReturnType<typeof vi.fn> };

const MEDIA = {
  id: 'm1',
  originalName: 'kits.jpg',
  storageKey: 'missions/m1.jpg',
  bucket: 'lds-media',
  folder: 'missions',
  mimeType: 'image/jpeg',
  size: 1024,
  width: 800,
  height: 600,
  altText: { fr: 'Distribution de kits scolaires' },
  url: 'http://api.test/api/v1/media/m1/file',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const HOMEPAGE = {
  settings: {
    organization: {
      name: 'Louga Développement Solidaire',
      shortName: 'LDS',
      tagline: 'Solidarité et action',
      about: "L'association au service des Lougatois.",
      mission: 'Subvenir aux besoins primaires des Lougatois.',
      quote: 'Ensemble, un avenir meilleur.',
      foundedYear: '',
    },
    homepage: {
      heroTitle: 'Solidarité et action pour un avenir meilleur à Louga',
      heroSubtitle: 'Association à but non lucratif engagée pour les Lougatois.',
      heroBadgeTitle: '100% bénévole',
      heroBadgeSubtitle: 'Sénégal & diaspora',
      heroImageId: null,
      aboutImageId: null,
      ctaQuote: 'Ensemble, pour le développement de Louga.',
      ctaImageId: null,
    },
    seo: { title: 'LDS', description: 'Description SEO', keywords: '', ogImageId: null },
    global_contact: { email: '', phone: '', phoneSecondary: '', address: '' },
    global_social: { facebook: '', instagram: '', linkedin: '', youtube: '' },
  },
  missions: [
    {
      id: 'mi1',
      title: { fr: 'Éducation' },
      description: { fr: 'Distribution de kits scolaires.' },
      icon: 'GraduationCap',
      order: 0,
      isPublished: true,
      imageId: 'm1',
      image: MEDIA,
    },
  ],
  impact: [
    { id: 'i1', label: { fr: 'Kits distribués' }, value: 620, color: '#87CE18', order: 0, isPublished: true },
  ],
  news: [
    {
      id: 'n1',
      title: { fr: 'Rétrospective 2026' },
      slug: 'retrospective-2026',
      excerpt: { fr: 'Un résumé de nos actions.' },
      content: { fr: '<p>Contenu</p>' },
      categoryId: 'c1',
      category: { id: 'c1', name: { fr: 'Bilan annuel' }, slug: 'bilan-annuel' },
      imageId: null,
      image: null,
      isPublished: true,
      publishedAt: '2026-02-01T00:00:00.000Z',
      createdAt: '2026-02-01T00:00:00.000Z',
    },
  ],
  gallery: [
    { id: 'g1', caption: { fr: 'Sur le terrain' }, order: 0, albumId: 'al1', mediaId: 'm1', media: MEDIA },
  ],
  partners: [
    { id: 'p1', name: 'Orange Money', icon: 'Smartphone', url: null, order: 0, isPublished: true, logoId: null, logo: null },
  ],
  donations: [
    {
      id: 'd1',
      title: { fr: 'Faire un don financier' },
      description: { fr: 'Chaque franc compte.' },
      actionType: 'phone',
      actionData: '+221 77 861 32 02',
      actionLabel: { fr: 'Copier le numéro' },
      iconColor: 'orange',
      order: 0,
      isPublished: true,
    },
  ],
};

describe('Home', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders every section from the API payload', async () => {
    mockedApi.get.mockResolvedValue({ data: HOMEPAGE });
    renderWithProviders(<Home />);

    // Hero, association, missions, impact, news, gallery, support, partners.
    expect(
      await screen.findByRole('heading', {
        name: /Solidarité et action pour un avenir meilleur à Louga/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("L'association au service des Lougatois.")).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Éducation' })).toBeInTheDocument();
    expect(screen.getByText('Kits distribués')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rétrospective 2026' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Faire un don financier' })).toBeInTheDocument();
    expect(screen.getByText('Orange Money')).toBeInTheDocument();
  });

  it('fetches the whole homepage in a single request', async () => {
    mockedApi.get.mockResolvedValue({ data: HOMEPAGE });
    renderWithProviders(<Home />);

    await screen.findByRole('heading', { name: 'Éducation' });
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(mockedApi.get).toHaveBeenCalledWith('/public/homepage', { params: undefined });
  });

  it('serves images through the API, never from the storage host', async () => {
    mockedApi.get.mockResolvedValue({ data: HOMEPAGE });
    renderWithProviders(<Home />);

    // The same media illustrates the hero and the mission card.
    const images = await screen.findAllByAltText('Distribution de kits scolaires');
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image).toHaveAttribute('src', 'http://api.test/api/v1/media/m1/file');
    }
  });

  it('shows a recoverable error state when the API is unreachable', async () => {
    mockedApi.get.mockRejectedValue({ code: 'ERR_NETWORK' });
    renderWithProviders(<Home />);

    expect(
      await screen.findByText(/Le site est momentanément indisponible/i),
    ).toBeInTheDocument();
  });

  it('omits empty sections instead of rendering placeholders', async () => {
    mockedApi.get.mockResolvedValue({
      data: { ...HOMEPAGE, news: [], partners: [], gallery: [], donations: [] },
    });
    renderWithProviders(<Home />);

    await screen.findByRole('heading', { name: 'Éducation' });
    expect(screen.queryByText('Nos dernières actions')).not.toBeInTheDocument();
    expect(screen.queryByText('Ils nous accompagnent')).not.toBeInTheDocument();
    expect(screen.queryByText('Comment nous soutenir ?')).not.toBeInTheDocument();
  });
});
