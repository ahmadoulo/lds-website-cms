import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockSettings = vi.fn();

vi.mock('../context/SettingsContext', () => ({
  useSettings: () => mockSettings(),
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { SiteLogo } from '../components/public/SiteLogo';

const media = (id: string) => ({
  id,
  originalName: `${id}.png`,
  storageKey: `branding/${id}.png`,
  bucket: 'lds-media',
  folder: 'branding',
  mimeType: 'image/png',
  size: 2048,
  width: 300,
  height: 100,
  altText: null,
  url: `http://api.test/api/v1/media/${id}/file`,
  createdAt: '2026-01-01T00:00:00.000Z',
});

const withBranding = (
  branding: Record<string, unknown>,
  organization?: Record<string, unknown>,
) =>
  mockSettings.mockReturnValue({
    settings: {
      organization,
      branding: {
        logoId: null,
        logoDarkId: null,
        faviconId: null,
        wordmark: 'LDS',
        wordmarkAccent: 'Louga',
        logoHeight: 40,
        logo: null,
        logoDark: null,
        favicon: null,
        ...branding,
      },
    },
    isLoading: false,
    error: null,
  });

describe('SiteLogo', () => {
  it("falls back to the association's own mark and name", () => {
    withBranding({}, { name: 'Louga Développement Solidaire' });
    render(<SiteLogo />);

    // The supplied logo stacks its wordmark on three lines, which cannot be
    // read in a 40px bar: the mark is shown and the name is set as live text.
    expect(screen.getByText('Louga')).toBeInTheDocument();
    expect(screen.getByText('Développement Solidaire')).toBeInTheDocument();

    const mark = document.querySelector('img');
    expect(mark).toHaveAttribute('src', '/logo-mark.png');
    // Decorative: the name is already printed beside it.
    expect(mark).toHaveAttribute('alt', '');
  });

  it('still names the association when no settings have arrived', () => {
    withBranding({});
    render(<SiteLogo />);

    expect(screen.getByText('Louga')).toBeInTheDocument();
    expect(screen.getByText('Développement Solidaire')).toBeInTheDocument();
  });

  it('renders the uploaded logo, served through the API', () => {
    withBranding({ logo: media('logo-1') });
    render(<SiteLogo />);

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', 'http://api.test/api/v1/media/logo-1/file');
    // An uploaded logo replaces the whole lockup, mark included.
    expect(document.querySelectorAll('img')).toHaveLength(1);
    expect(image).toHaveAttribute('alt', 'Louga Développement Solidaire');
  });

  it('names the logo after the association, not after the wordmark', () => {
    withBranding({ logo: media('logo-1') }, { name: 'Louga Développement Solidaire' });
    render(<SiteLogo />);

    // A screen reader should hear the association's real name.
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Louga Développement Solidaire');
  });

  it('reserves the logo box so the sticky header does not jump', () => {
    withBranding({ logo: media('logo-1') });
    render(<SiteLogo />);

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('width');
    expect(image).toHaveAttribute('height');
  });

  it('caps an uploaded logo on a phone without capping the lockup', () => {
    // The ceiling protects the sticky header from a logoHeight chosen for the
    // desktop. It must not reach the text lockup, which sizes itself and would
    // simply be cut off.
    withBranding({ logo: media('logo-1') });
    const uploaded = render(<SiteLogo />);
    expect(screen.getByRole('img').className).toContain('max-h-10');
    uploaded.unmount();

    withBranding({});
    render(<SiteLogo />);
    expect(document.querySelector('img')!.className).not.toContain('max-h-10');
  });

  it('uses the dark variant on dark backgrounds', () => {
    withBranding({ logo: media('logo-1'), logoDark: media('logo-dark') });
    render(<SiteLogo variant="dark" />);

    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'http://api.test/api/v1/media/logo-dark/file',
    );
  });

  it('reuses the main logo when no dark variant exists', () => {
    withBranding({ logo: media('logo-1') });
    render(<SiteLogo variant="dark" />);

    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'http://api.test/api/v1/media/logo-1/file',
    );
  });

  it('applies the configured height', () => {
    withBranding({ logo: media('logo-1'), logoHeight: 64 });
    render(<SiteLogo />);

    expect(screen.getByRole('img')).toHaveStyle({ height: '64px' });
  });

  it('survives settings that have not loaded yet', () => {
    mockSettings.mockReturnValue({ settings: undefined, isLoading: true, error: null });
    render(<SiteLogo />);

    // The mark and the default name keep the header from collapsing mid-fetch.
    expect(screen.getByText('Louga')).toBeInTheDocument();
    expect(document.querySelector('img')).toHaveAttribute('src', '/logo-mark.png');
  });
});
