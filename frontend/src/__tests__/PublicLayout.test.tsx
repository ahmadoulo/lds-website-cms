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
