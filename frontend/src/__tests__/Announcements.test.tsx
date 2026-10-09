import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../context/SettingsContext', () => ({
  useSettings: () => ({ settings: undefined, isLoading: false, error: null }),
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// The banner reads the API as well; here only what the server wrote is tested.
vi.mock('../lib/queries/publicHooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/queries/publicHooks')>()),
  useBannerAnnouncements: () => ({ data: undefined }),
}));

import { AnnouncementBanner } from '../components/public/AnnouncementBanner';
import { ShareBar, resolveActions } from '../components/public/AnnouncementParts';
import { UpcomingAnnouncements } from '../components/public/UpcomingAnnouncements';
import {
  EMPTY_ANNOUNCEMENT,
  announcementFormValues,
  announcementPayload,
  articleStatus,
} from '../lib/announcementForm';
import { formatEventDate } from '../lib/eventDate';
import { announcementsFr } from '../lib/i18n/dictionaries/announcements';
import { captureSiteOrigin } from '../lib/siteOrigin';
import type { NewsArticle, SiteSettings } from '../lib/types';
import { renderWithProviders } from './testUtils';

const DAY = 24 * 60 * 60_000;

describe('article status', () => {
  const base = { isPublished: true, publishedAt: null, archivedAt: null };
  it('reads the four states an editor thinks in', () => {
    expect(articleStatus({ ...base, isPublished: false })).toBe('draft');
    expect(articleStatus({ ...base, publishedAt: new Date(Date.now() + DAY).toISOString() })).toBe('scheduled');
    expect(articleStatus({ ...base, publishedAt: new Date(Date.now() - DAY).toISOString() })).toBe('published');
    expect(articleStatus({ ...base, archivedAt: new Date().toISOString() })).toBe('archived');
  });
});

describe('announcement form', () => {
  it('sends both languages when editing, so an erased text is erased', () => {
    const payload = announcementPayload({ ...EMPTY_ANNOUNCEMENT, location: { fr: 'Louga' } }, true);
    expect(payload.location).toEqual({ fr: 'Louga', ar: '' });
  });

  it('sends nothing for an empty field on creation, and no date means now', () => {
    const payload = announcementPayload(EMPTY_ANNOUNCEMENT, false);
    expect(payload.location).toBeNull();
    expect(payload.eventStartsAt).toBeNull();
    expect('publishedAt' in payload).toBe(false);
  });

  it('keeps an address only on the actions that have one of their own', () => {
    const payload = announcementPayload(
      {
        ...EMPTY_ANNOUNCEMENT,
        actions: [
          { type: 'call', labelFr: '', labelAr: '', url: 'tel:+221000' },
          { type: 'page', labelFr: 'Soutenir', labelAr: '', url: '/nous-soutenir' },
        ],
      },
      false,
    );
    expect(payload.actions).toEqual([
      { type: 'call' },
      { type: 'page', label: { fr: 'Soutenir' }, url: '/nous-soutenir' },
    ]);
  });

  it('reads an article back into the form', () => {
    const values = announcementFormValues({
      actions: [{ type: 'donate', label: { ar: 'تبرّع' } }],
      contact: { phone: '+221 77 000 00 00' },
      bannerScope: 'all',
    } as NewsArticle);
    expect(values.actions[0]).toEqual({ type: 'donate', labelFr: '', labelAr: 'تبرّع', url: '' });
    expect(values.contactPhone).toBe('+221 77 000 00 00');
    expect(values.bannerScope).toBe('all');
  });
});

describe('event dates', () => {
  it('writes a day alone when no time was entered', () => {
    expect(formatEventDate('2026-10-12T00:00:00.000Z', null, 'fr')).toBe('12 octobre 2026');
  });

  it('writes a range without repeating the day, in Louga’s clock', () => {
    const text = formatEventDate('2026-10-12T09:00:00.000Z', '2026-10-12T12:00:00.000Z', 'fr');
    expect(text).toContain('12 octobre 2026');
    expect(text).toContain('09:00');
    expect(text).toContain('12:00');
    expect(text.match(/octobre/g)).toHaveLength(1);
  });

  it('keeps western digits in Arabic', () => {
    expect(formatEventDate('2026-10-12T00:00:00.000Z', null, 'ar')).toContain('2026');
  });
});

describe('announcement actions', () => {
  const settings = {
    global_contact: { phone: '', email: 'contact@ldslouga.sn', phoneSecondary: '', address: {} },
    global_social: { facebook: 'https://facebook.com/lds', instagram: '', linkedin: '', youtube: '' },
  } as unknown as SiteSettings;

  it('never makes up a number: "call" without one anywhere is left out', () => {
    const resolved = resolveActions([{ type: 'call' }], {}, settings, 'fr', announcementsFr.actions);
    expect(resolved).toEqual([]);
  });

  it('uses the announcement’s own contact first, then the association’s', () => {
    const [call, email] = resolveActions(
      [{ type: 'call' }, { type: 'email' }],
      { contact: { phone: '+221 77 000 00 00' } },
      settings,
      'fr',
      announcementsFr.actions,
    );
    expect(call).toMatchObject({ kind: 'href', href: 'tel:+221770000000', primary: true });
    expect(email).toMatchObject({ kind: 'href', href: 'mailto:contact@ldslouga.sn', primary: false });
  });

  it('lists only the networks that are configured', () => {
    const [social] = resolveActions([{ type: 'social' }], {}, settings, 'fr', announcementsFr.actions);
    expect(social.kind === 'social' && social.links.map((link) => link.label)).toEqual(['Facebook']);
  });

  it('drops a link that is not a web address or a page of the site', () => {
    const resolved = resolveActions(
      [
        { type: 'external', url: 'javascript:alert(1)' },
        { type: 'page', url: '//evil.example' },
      ],
      {},
      settings,
      'fr',
      announcementsFr.actions,
    );
    expect(resolved).toEqual([]);
  });
});

describe('site banner', () => {
  const serverBanner = (items: unknown[]) => {
    const element = document.createElement('script');
    element.type = 'application/json';
    element.id = 'lds-banner';
    element.textContent = JSON.stringify(items);
    document.head.appendChild(element);
  };

  afterEach(() => {
    document.getElementById('lds-banner')?.remove();
    window.localStorage.clear();
  });

  it('shows what the server wrote, on the first render', () => {
    serverBanner([{ id: 'a', slug: 'kits', text: 'Distribution de kits', scope: 'home' }]);
    renderWithProviders(<AnnouncementBanner />);
    expect(screen.getByRole('link', { name: /Distribution de kits/ })).toHaveAttribute('href', '/actualites/kits');
  });

  it('keeps a home-only announcement off the other pages', () => {
    serverBanner([{ id: 'a', slug: 'kits', text: 'Distribution de kits', scope: 'home' }]);
    renderWithProviders(<AnnouncementBanner />, { route: '/contact' });
    expect(screen.queryByRole('region', { name: 'Annonces' })).toBeNull();
  });

  it('stays closed once closed, and only that announcement', async () => {
    serverBanner([
      { id: 'a', slug: 'kits', text: 'Distribution de kits', scope: 'all' },
      { id: 'b', slug: 'sante', text: 'Campagne de santé', scope: 'all' },
    ]);
    const { unmount } = renderWithProviders(<AnnouncementBanner />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Fermer l’annonce' }));
    expect(screen.getByRole('link', { name: /Campagne de santé/ })).toBeInTheDocument();
    unmount();

    renderWithProviders(<AnnouncementBanner />, { route: '/galerie' });
    expect(screen.queryByText(/Distribution de kits/)).toBeNull();
    expect(screen.getByText(/Campagne de santé/)).toBeInTheDocument();
  });

  it('offers previous, next and pause when there are several', () => {
    serverBanner([
      { id: 'a', slug: 'kits', text: 'Un', scope: 'all' },
      { id: 'b', slug: 'sante', text: 'Deux', scope: 'all' },
    ]);
    renderWithProviders(<AnnouncementBanner />);
    expect(screen.getByRole('button', { name: 'Annonce suivante' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annonce précédente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mettre le défilement en pause' })).toBeInTheDocument();
  });
});

describe('sharing', () => {
  beforeAll(() => {
    // The server's canonical, on the official domain, while the page itself
    // is served from somewhere else (jsdom's localhost).
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = 'https://ldslouga.sn/actualites/kits';
    link.setAttribute('data-lds-ssr', '');
    document.head.appendChild(link);
    captureSiteOrigin();
  });

  it('shares the official address, never the host the page is served from', () => {
    renderWithProviders(<ShareBar slug="kits" title="Distribution de kits" />);
    const whatsapp = screen.getByRole('link', { name: /WhatsApp/ }).getAttribute('href')!;
    const text = decodeURIComponent(whatsapp.split('text=')[1]);
    expect(text).toBe('Distribution de kits\nhttps://ldslouga.sn/actualites/kits');
    expect(screen.getByRole('link', { name: /Facebook/ }).getAttribute('href')).toContain(
      encodeURIComponent('https://ldslouga.sn/actualites/kits'),
    );
    expect(whatsapp).not.toContain('localhost');
  });

  it('copies the link and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderWithProviders(<ShareBar slug="kits" title="Distribution de kits" />, { route: '/?lang=ar' });

    await act(async () => {
      screen.getByRole('button', { name: /نسخ الرابط/ }).click();
    });
    expect(writeText).toHaveBeenCalledWith('https://ldslouga.sn/actualites/kits?lang=ar');
    expect(screen.getAllByText('تمّ نسخ الرابط').length).toBeGreaterThan(0);
  });
});

describe('"À venir"', () => {
  it('is absent rather than empty', () => {
    renderWithProviders(<UpcomingAnnouncements articles={[]} />);
    // Not even its heading.
    expect(screen.queryByRole('heading')).toBeNull();
  });
});
