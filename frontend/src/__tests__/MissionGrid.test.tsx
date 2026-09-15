import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../context/SettingsContext', () => ({
  useSettings: () => ({ settings: undefined, isLoading: false, error: null }),
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { MissionGrid } from '../components/public/MissionGrid';
import { headingSpan } from '../components/public/headingSpan';
import { renderWithProviders } from './testUtils';
import type { Mission } from '../lib/types';

const mission = (id: string, title: string, extra: Partial<Mission> = {}): Mission => ({
  id,
  title: { fr: title },
  description: { fr: `Description de ${title}` },
  content: null,
  icon: 'GraduationCap',
  order: 0,
  isPublished: true,
  imageId: null,
  image: null,
  ...extra,
});

const FIVE = ['Éducation', 'Santé', 'Environnement', 'Insertion', 'Solidarité'].map((label, i) =>
  mission(`m${i}`, label),
);

const render = (missions: Mission[]) =>
  renderWithProviders(
    <MissionGrid
      missions={missions}
      eyebrow="Nos actions"
      title="Nos domaines d'intervention à Louga"
      description="Des domaines complémentaires."
    />,
  );

describe('headingSpan', () => {
  it('always closes the grid on a full row, at either column count', () => {
    // The heading is one tile of the grid, so its span has to make up whatever
    // the cards leave over. Two columns from 640px, three from 1024px: a span
    // that balances one leaves an orphan on the other, so both are computed.
    for (let count = 1; count <= 12; count += 1) {
      expect((headingSpan(count, 3) + count) % 3).toBe(0);
      expect((headingSpan(count, 2) + count) % 2).toBe(0);
    }
  });

  it('gives the heading a single column when five domains are published', () => {
    // The real case: 1 + 5 = 6 tiles, a clean 3x2 with no empty band.
    expect(headingSpan(5)).toBe(1);
  });

  it('falls back to the full-width banner when the cards already fill rows', () => {
    expect(headingSpan(3)).toBe(3);
    expect(headingSpan(6)).toBe(3);
  });
});

describe('mission grid layout', () => {
  it('balances both breakpoints for the five published domains', () => {
    render(FIVE);
    const heading = screen.getByRole('heading', { name: /Nos domaines/ }).closest('div')!;

    // Five cards: one column at sm (1+5 = 6 = three rows of two) and one at lg
    // (1+5 = 6 = two rows of three). Neither leaves a card stranded.
    expect(heading.className).toContain('sm:col-span-1');
    expect(heading.className).toContain('lg:col-span-1');
  });

  it('widens the heading when the cards already fill a row', () => {
    render(FIVE.slice(0, 4));
    const heading = screen.getByRole('heading', { name: /Nos domaines/ }).closest('div')!;

    expect(heading.className).toContain('sm:col-span-2');
    expect(heading.className).toContain('lg:col-span-2');
  });
});

describe('mission grid', () => {
  it('renders the heading and every domain', () => {
    render(FIVE);
    expect(screen.getByRole('heading', { name: "Nos domaines d'intervention à Louga" })).toBeInTheDocument();
    FIVE.forEach((m) => {
      expect(screen.getByRole('heading', { name: m.title.fr! })).toBeInTheDocument();
    });
  });

  it('opens the detail of the domain that was clicked', async () => {
    const user = userEvent.setup();
    render(FIVE);

    await user.click(screen.getByRole('button', { name: 'Santé' }));

    // Title and description also exist in the card behind, so every assertion
    // is scoped to the dialog.
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Santé' })).toBeInTheDocument();
    expect(within(dialog).getByText('Description de Santé')).toBeInTheDocument();
  });

  it('shows the long form only when the association has written one', async () => {
    const user = userEvent.setup();
    render([
      mission('rich', 'Éducation', { content: { fr: '<p>Le programme complet.</p>' } }),
      mission('plain', 'Santé'),
    ]);

    await user.click(screen.getByRole('button', { name: 'Éducation' }));
    expect(within(screen.getByRole('dialog')).getByText('Le programme complet.')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Santé' }));
    expect(within(screen.getByRole('dialog')).queryByText('Le programme complet.')).toBeNull();
  });

  it('closes on Escape and gives the focus back to the card', async () => {
    const user = userEvent.setup();
    render(FIVE);

    const trigger = screen.getByRole('button', { name: 'Environnement' });
    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('offers exactly one tab stop per card', () => {
    render(FIVE);
    // The whole card is clickable through the title button's ::after overlay,
    // so a keyboard user passes through five stops, not ten.
    const stops = screen
      .getAllByRole('button')
      .filter((element) => FIVE.some((m) => element.textContent === m.title.fr));
    expect(stops).toHaveLength(5);
  });

  it('announces that the card opens a dialog', () => {
    render(FIVE);
    expect(screen.getByRole('button', { name: 'Éducation' })).toHaveAttribute(
      'aria-haspopup',
      'dialog',
    );
  });
});
