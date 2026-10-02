import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../context/SettingsContext', () => ({
  useSettings: () => ({
    settings: { seo: { title: 'Louga Développement Solidaire', description: 'Association.' } },
    isLoading: false,
    error: null,
  }),
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { Seo } from '../components/seo/Seo';
import { LocaleProvider } from '../context/LocaleContext';

const head = (selector: string) => document.head.querySelector(selector);

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <LocaleProvider>
        <Seo title="À propos" description="Qui sommes-nous." />
      </LocaleProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  document.head.innerHTML = '';
  document.documentElement.removeAttribute('lang');
  document.documentElement.removeAttribute('dir');
  window.localStorage.clear();
});

describe('what a crawler reads', () => {
  it('declares French and left-to-right on a French page', async () => {
    renderAt('/a-propos');
    await waitFor(() => expect(document.documentElement.getAttribute('lang')).toBe('fr'));
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
  });

  it('declares Arabic and right-to-left on an Arabic page', async () => {
    renderAt('/a-propos?lang=ar');
    await waitFor(() => expect(document.documentElement.getAttribute('lang')).toBe('ar'));
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  });

  it('points each language at its own address', async () => {
    renderAt('/a-propos?lang=ar');

    await waitFor(() => expect(head('link[rel="alternate"][hreflang="ar"]')).not.toBeNull());
    const french = head('link[rel="alternate"][hreflang="fr"]')!.getAttribute('href')!;
    const arabic = head('link[rel="alternate"][hreflang="ar"]')!.getAttribute('href')!;

    // French keeps the address it has always had; Arabic gets one of its own,
    // which is the whole reason the language travels in the query string.
    expect(french).toContain('/a-propos');
    expect(french).not.toContain('lang=');
    expect(arabic).toContain('lang=ar');
  });

  it('sends an unknown language to the French page', async () => {
    renderAt('/a-propos?lang=ar');
    await waitFor(() => expect(head('link[rel="alternate"][hreflang="x-default"]')).not.toBeNull());

    const fallback = head('link[rel="alternate"][hreflang="x-default"]')!.getAttribute('href')!;
    expect(fallback).not.toContain('lang=');
  });

  it('makes the canonical follow the language being read', async () => {
    renderAt('/a-propos?lang=ar');
    await waitFor(() => expect(head('link[rel="canonical"]')).not.toBeNull());
    expect(head('link[rel="canonical"]')!.getAttribute('href')).toContain('lang=ar');
  });

  it('leaves a French canonical free of any language parameter', async () => {
    renderAt('/a-propos');
    await waitFor(() => expect(head('link[rel="canonical"]')).not.toBeNull());
    expect(head('link[rel="canonical"]')!.getAttribute('href')).not.toContain('lang=');
  });

  it('declares the locale to Open Graph', async () => {
    renderAt('/a-propos?lang=ar');
    // Open Graph wants language_TERRITORY, not a bare language tag.
    await waitFor(() =>
      expect(head('meta[property="og:locale"]')?.getAttribute('content')).toBe('ar_AR'),
    );
  });
});
