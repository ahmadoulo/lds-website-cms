import React from 'react';
import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { vi } from 'vitest';

// The preview banner needs the admin auth context; it is not what is under test.
vi.mock('../components/public/PreviewBanner', () => ({ PreviewBanner: () => null }));

vi.mock('../context/SettingsContext', () => ({
  useSettings: () => ({ settings: undefined, isLoading: false, error: null }),
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { PublicLayout } from '../components/layout/PublicLayout';
import { renderWithProviders } from './testUtils';

const openMenu = async () => {
  const user = userEvent.setup();
  const button = screen.getByRole('button', { name: 'Ouvrir le menu' });
  await user.click(button);
  return { user, button };
};

describe('public layout — mobile menu', () => {
  it('gives the menu button a finger-sized target', () => {
    renderWithProviders(<PublicLayout />);
    const button = screen.getByRole('button', { name: 'Ouvrir le menu' });

    // 44px is the smallest reliable touch target; the icon alone is 24px.
    expect(button.className).toContain('h-11');
    expect(button.className).toContain('w-11');
  });

  it('announces the panel it controls', async () => {
    renderWithProviders(<PublicLayout />);
    const button = screen.getByRole('button', { name: 'Ouvrir le menu' });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await openMenu();

    const toggled = screen.getByRole('button', { name: 'Fermer le menu' });
    expect(toggled).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(toggled.getAttribute('aria-controls')!)).not.toBeNull();
  });

  it('lists every destination once the panel is open', async () => {
    renderWithProviders(<PublicLayout />);
    await openMenu();

    const panel = screen.getByRole('navigation', { name: 'Navigation mobile' });
    expect(within(panel).getByRole('link', { name: 'Accueil' })).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Contact' })).toBeInTheDocument();
  });

  it('closes on Escape and hands focus back to the button', async () => {
    renderWithProviders(<PublicLayout />);
    const { user, button } = await openMenu();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('navigation', { name: 'Navigation mobile' })).toBeNull();
    expect(button).toHaveFocus();
  });

  it('closes when the visitor taps beside it', async () => {
    renderWithProviders(<PublicLayout />);
    const { user } = await openMenu();

    await user.click(screen.getByRole('main'));

    expect(screen.queryByRole('navigation', { name: 'Navigation mobile' })).toBeNull();
  });

  it('freezes the page behind the panel and restores it on close', async () => {
    renderWithProviders(<PublicLayout />);
    const { user } = await openMenu();
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('');
  });
});

describe('public layout — language switch', () => {
  /*
    The switch used to be reachable on a phone only by opening the burger
    menu, so a visitor arriving on the site saw a French page and no sign that
    an Arabic one existed. These guard the fix: it is in the header bar, it is
    there before anything is opened, and it is not duplicated inside the panel.
  */
  const header = () => document.querySelector('header')!;

  it('offers the language switch without opening anything', () => {
    renderWithProviders(<PublicLayout />);

    const inHeader = within(header()).getByRole('navigation', { name: 'Changer de langue' });
    expect(within(inHeader).getByRole('link', { name: 'العربية' })).toBeInTheDocument();
    expect(within(inHeader).getByRole('link', { name: 'Français' })).toBeInTheDocument();
  });

  it('marks the language being read, so the control shows a state', () => {
    renderWithProviders(<PublicLayout />);

    const inHeader = within(header()).getByRole('navigation', { name: 'Changer de langue' });
    expect(within(inHeader).getByRole('link', { name: 'Français' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(within(inHeader).getByRole('link', { name: 'العربية' })).not.toHaveAttribute('aria-current');
  });

  it('gives each half a finger-sized target', () => {
    renderWithProviders(<PublicLayout />);

    const inHeader = within(header()).getByRole('navigation', { name: 'Changer de langue' });
    for (const link of within(inHeader).getAllByRole('link')) {
      expect(link.className).toContain('min-h-8');
      expect(link.className).toContain('min-w-9');
    }
  });

  it('lets the lockup give way rather than push the menu button off the gutter', () => {
    renderWithProviders(<PublicLayout />);

    // On a narrow phone the row is wider than the screen, and something has to
    // yield. Pinning this here because the symptom - a clipped burger on an
    // iPhone Pro - is invisible in jsdom and easy to reintroduce.
    // Selected structurally: the lockup is the first link in the header, and
    // its accessible name collides with the nav's own "Accueil" entry.
    const lockup = header().querySelector('a')!;
    expect(lockup.className).toContain('min-w-0');
    expect(lockup.className).toContain('shrink');
    expect(lockup.className).not.toMatch(/(^|\s)shrink-0/);
    expect(lockup.className).toContain('lg:shrink-0');
  });

  it('never lets the controls be the part that shrinks', () => {
    renderWithProviders(<PublicLayout />);

    const button = screen.getByRole('button', { name: 'Ouvrir le menu' });
    expect(button.className).toContain('shrink-0');
    expect(button.parentElement!.className).toContain('shrink-0');
  });

  it('does not repeat the switch inside the menu panel', async () => {
    renderWithProviders(<PublicLayout />);
    await openMenu();

    const panel = document.getElementById('menu-mobile')!;
    expect(within(panel).queryByRole('navigation', { name: 'Changer de langue' })).toBeNull();
  });

  it('keeps each language reachable as a real address', () => {
    renderWithProviders(<PublicLayout />);

    const inHeader = within(header()).getByRole('navigation', { name: 'Changer de langue' });
    const arabic = within(inHeader).getByRole('link', { name: 'العربية' });
    // A crawler never runs the click handler, so the href has to carry it.
    expect(arabic.getAttribute('href')).toContain('lang=ar');
    expect(arabic).toHaveAttribute('hreflang', 'ar');
  });
});
