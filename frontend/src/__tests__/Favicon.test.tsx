import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

let mockSettings: any;
vi.mock('../context/SettingsContext', () => ({
  useSettings: () => ({ settings: mockSettings, isLoading: false, error: null }),
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { Favicon } from '../components/seo/Favicon';

const media = (over: Record<string, unknown> = {}) => ({
  id: 'f1',
  url: 'http://api.test/api/v1/media/f1/file',
  mimeType: 'image/png',
  width: 512,
  height: 512,
  ...over,
});

const link = (rel: string) => document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

beforeEach(() => {
  document.head.innerHTML = '<link rel="icon" type="image/png" href="/logo-mark.png">';
  mockSettings = undefined;
});

describe('favicon', () => {
  it('leaves the shipped icon alone until one is uploaded', () => {
    render(<Favicon />);
    expect(link('icon')?.getAttribute('href')).toBe('/logo-mark.png');
  });

  it('uses the uploaded icon and declares its size', () => {
    mockSettings = { branding: { favicon: media() } };
    render(<Favicon />);

    expect(link('icon')?.getAttribute('href')).toContain('/media/f1/file');
    expect(link('icon')?.getAttribute('sizes')).toBe('512x512');
    // Exactly one: a leftover link would win over the new one.
    expect(document.head.querySelectorAll('link[rel="icon"]')).toHaveLength(1);
  });

  it('offers an iOS home-screen icon only for a format Safari accepts', () => {
    mockSettings = { branding: { favicon: media() } };
    const { unmount } = render(<Favicon />);
    expect(link('apple-touch-icon')?.getAttribute('href')).toContain('/media/f1/file');
    unmount();

    // A .ico is a valid favicon but Safari ignores it on the home screen.
    document.head.innerHTML = '';
    mockSettings = { branding: { favicon: media({ mimeType: 'image/x-icon', width: null, height: null }) } };
    render(<Favicon />);
    expect(link('apple-touch-icon')).toBeNull();
  });

  it('drops a stale home-screen icon when the favicon is replaced by an .ico', () => {
    mockSettings = { branding: { favicon: media() } };
    const first = render(<Favicon />);
    expect(link('apple-touch-icon')).not.toBeNull();
    first.unmount();

    mockSettings = { branding: { favicon: media({ id: 'f2', mimeType: 'image/x-icon' }) } };
    render(<Favicon />);
    expect(link('apple-touch-icon')).toBeNull();
  });

  it('puts the shipped icon back when the administrator removes the favicon', () => {
    mockSettings = { branding: { favicon: media() } };
    const first = render(<Favicon />);
    first.unmount();

    mockSettings = { branding: { favicon: null } };
    render(<Favicon />);
    expect(link('icon')?.getAttribute('href')).toBe('/logo-mark.png');
  });
});
