import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

describe('partner carousel — automatic drift', () => {
  /** jsdom reports every scrollWidth as 0; this makes the track overflow. */
  const withOverflow = (scrollWidth = 2000, clientWidth = 800) => {
    const track = screen.getByRole('group', { name: 'Nos partenaires' });
    Object.defineProperty(track, 'scrollWidth', { value: scrollWidth, configurable: true });
    Object.defineProperty(track, 'clientWidth', { value: clientWidth, configurable: true });
    return track;
  };

  it('hides the platform scrollbar without giving up scrolling', () => {
    renderWithProviders(<PartnerCarousel partners={EIGHT} />);
    const track = screen.getByRole('group', { name: 'Nos partenaires' });

    // The grey slab across the section is what the association objected to.
    expect(track.className).toContain('scrollbar-hidden');
    // It is still a scroll container: wheel, drag, keyboard and arrows work.
    expect(track.className).toContain('overflow-x-auto');
  });

  it('does not drift while everything already fits', async () => {
    renderWithProviders(<PartnerCarousel partners={EIGHT.slice(0, 2)} />);
    const track = screen.getByRole('group', { name: 'Nos partenaires' });

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(track.scrollLeft).toBe(0);
  });

  it('leaves the order readable the same way round', () => {
    renderWithProviders(<PartnerCarousel partners={EIGHT} />);
    const names = screen
      .getAllByRole('listitem')
      .map((item) => item.textContent);

    // The drift rewinds to the start rather than reversing, so the order the
    // association set in the administration is never read backwards.
    expect(names[0]).toContain('Institut Islamique Manar Al Houda');
    expect(names[names.length - 1]).toContain('Eaux et Forêts');
  });

  it('suspends the drift while the pointer is over the track', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PartnerCarousel partners={EIGHT} />);
    const track = withOverflow();

    await user.hover(track);
    const settled = track.scrollLeft;
    await new Promise((resolve) => setTimeout(resolve, 60));

    // A visitor reading a partner name must not have it slide away.
    expect(track.scrollLeft).toBe(settled);
  });
});
