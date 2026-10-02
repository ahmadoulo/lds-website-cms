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

  it('never shows a French label on the Arabic page', async () => {
    respond();
    renderWithProviders(<ImpactPage />, { route: '/impact?lang=ar' });

    expect(await screen.findByText('الحقائب المدرسية')).toBeInTheDocument();
    // The untranslated figure is left out rather than shown in French: a page
    // that mixes the two reads as translated when it is not.
    expect(screen.queryByText('Arbres plantés')).toBeNull();
  });
});
