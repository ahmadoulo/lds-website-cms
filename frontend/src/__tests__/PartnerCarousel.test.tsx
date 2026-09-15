import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';

vi.mock('../context/SettingsContext', () => ({
  useSettings: () => ({ settings: undefined, isLoading: false, error: null }),
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { PartnerCarousel } from '../components/public/PartnerCarousel';
import { renderWithProviders } from './testUtils';
import type { Partner } from '../lib/types';

const partner = (id: string, name: string, over: Partial<Partner> = {}): Partner =>
  ({
    id,
    name,
    icon: 'Landmark',
    url: null,
    order: 0,
    isPublished: true,
    logoId: null,
    logo: null,
    ...over,
  }) as Partner;

const EIGHT = [
  'Institut Islamique Manar Al Houda',
  'LaMe',
  'YOM France (Ya Oummata Mouhamad)',
  'Carrefour',
  'GIZ',
  "Inspection d'académie (IA de Louga)",
  "Inspections de l'Éducation et de la Formation (IEF de Louga)",
  'Eaux et Forêts',
].map((name, index) => partner(`p${index}`, name));

describe('partner carousel', () => {
  it('prints every partner name in full', () => {
    renderWithProviders(<PartnerCarousel partners={EIGHT} />);
    // A partner name is public data: truncating it amputates the data.
    EIGHT.forEach((p) => expect(screen.getByText(p.name)).toBeInTheDocument());
  });

  it('stays a list so a screen reader announces how many there are', () => {
    renderWithProviders(<PartnerCarousel partners={EIGHT} />);
    const group = screen.getByRole('group', { name: 'Nos partenaires' });
    expect(within(group).getByRole('list')).toBeInTheDocument();
    expect(within(group).getAllByRole('listitem')).toHaveLength(8);
  });

  it('shows no arrows while everything already fits', () => {
    // jsdom reports every scrollWidth as 0, which is the "fits" case.
    renderWithProviders(<PartnerCarousel partners={EIGHT.slice(0, 3)} />);
    expect(screen.queryByRole('button', { name: 'Partenaires suivants' })).toBeNull();
  });

  it('links only the partners that have a site', () => {
    renderWithProviders(
      <PartnerCarousel
        partners={[partner('a', 'Avec site', { url: 'https://example.org' }), partner('b', 'Sans site')]}
      />,
    );
    expect(screen.getByRole('link', { name: /Avec site/ })).toHaveAttribute(
      'href',
      'https://example.org',
    );
    expect(screen.queryByRole('link', { name: /Sans site/ })).toBeNull();
  });

  it('never repeats the partner name to a screen reader', () => {
    const withLogo = partner('l', 'Carrefour', {
      logo: { id: 'm', url: 'http://api.test/media/m/file', width: 300, height: 100 } as never,
    });
    renderWithProviders(<PartnerCarousel partners={[withLogo]} />);

    // The name is printed beside the logo, so the image itself is decorative.
    const logo = document.querySelector('img');
    expect(logo).not.toBeNull();
    expect(logo!.getAttribute('alt')).toBe('');
    expect(logo!.getAttribute('loading')).toBe('lazy');
    expect(logo!.getAttribute('width')).toBe('300');
  });
});
