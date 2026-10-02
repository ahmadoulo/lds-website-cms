import React from 'react';
import { describe, expect, it, vi } from 'vitest';
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
import { ImpactPage } from '../pages/public/ImpactPage';
import { renderWithProviders } from './testUtils';
import { localizedOrSource } from '../lib/i18n/resolve';

const mockedApi = api as unknown as { get: ReturnType<typeof vi.fn> };

const STATS = [
  { id: '1', label: { fr: 'Kits scolaires distribués', ar: 'الحقائب المدرسية' }, value: 620, color: '#87CE18', icon: 'Backpack', order: 0, isPublished: true },
  // Translated into French only: the association has not written its Arabic yet.
  { id: '2', label: { fr: 'Arbres plantés' }, value: 20, color: '#00A4DE', icon: 'Trees', order: 1, isPublished: true },
];

const respond = () =>
  mockedApi.get.mockImplementation((url: string) =>
    Promise.resolve({ data: url.includes('impact') ? STATS : [] }),
  );

describe('incomplete translations', () => {
  it('shows every figure in French, including the ones with no Arabic', async () => {
    respond();
    renderWithProviders(<ImpactPage />, { route: '/impact' });

    // French is the editorial source and is required by the API, so nothing is
    // ever filtered out of the French site. This is the non-regression that
    // matters most: adding Arabic must not remove anything from French.
    expect(await screen.findByText('Kits scolaires distribués')).toBeInTheDocument();
    expect(screen.getByText('Arbres plantés')).toBeInTheDocument();
  });

  it('shows every figure in Arabic too, marking the untranslated ones', async () => {
    respond();
    renderWithProviders(<ImpactPage />, { route: '/impact?lang=ar' });

    expect(await screen.findByText('الحقائب المدرسية')).toBeInTheDocument();

    /*
      Hiding the untranslated figure emptied the section while its heading
      stayed above it, so the page read as broken rather than as untranslated.
      It is shown in the original instead, and marked `lang="fr"` so a screen
      reader switches voice and the bidi algorithm lays the run out as French.
    */
    const untranslated = screen.getByText('Arbres plantés');
    expect(untranslated).toBeInTheDocument();
    expect(untranslated.closest('[lang="fr"]')).not.toBeNull();
  });
});

describe('settings that carry the page structure', () => {
  const SETTINGS = {
    organization: { name: 'Louga Développement Solidaire', shortName: 'LDS' },
    homepage: {
      // The association has written the French and not yet the Arabic.
      heroTitle: { fr: 'Solidarité et action pour un avenir meilleur à Louga' },
      heroSubtitle: { fr: 'Association à but non lucratif.' },
    },
  };

  it('never leaves the headline empty, whatever the language', () => {
    /*
      A record with no Arabic is left out of an Arabic listing, and that is
      right: nothing is missing from the page. A setting is different - it IS
      the page. An untranslated H1 resolved strictly renders an empty heading,
      which is a worse answer than an untranslated one, so these fall back and
      say that they did.
    */
    const resolved = localizedOrSource(SETTINGS.homepage.heroTitle, 'ar');
    expect(resolved.text).toBe('Solidarité et action pour un avenir meilleur à Louga');
    expect(resolved.untranslated).toBe(true);
  });

  it('prefers the Arabic as soon as it exists', () => {
    const resolved = localizedOrSource(
      { fr: 'Solidarité et action', ar: 'تضامن وعمل' },
      'ar',
    );
    expect(resolved.text).toBe('تضامن وعمل');
    expect(resolved.untranslated).toBe(false);
  });
});
