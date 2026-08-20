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

const withBranding = (branding: Record<string, unknown>) =>
  mockSettings.mockReturnValue({
    settings: {
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
  it('falls back to the wordmark when no logo is uploaded', () => {
    withBranding({});
    render(<SiteLogo />);

    expect(screen.getByText('LDS')).toBeInTheDocument();
    expect(screen.getByText('Louga')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders the uploaded logo, served through the API', () => {
    withBranding({ logo: media('logo-1') });
    render(<SiteLogo />);

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', 'http://api.test/api/v1/media/logo-1/file');
    expect(image).toHaveAttribute('alt', 'LDS Louga');
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

    // The default wordmark keeps the header from collapsing during the fetch.
    expect(screen.getByText('LDS')).toBeInTheDocument();
  });
});
