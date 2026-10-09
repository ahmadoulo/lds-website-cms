import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api/axios', async () => {
  const actual = await vi.importActual<typeof import('../lib/api/axios')>('../lib/api/axios');
  return {
    ...actual,
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  };
});

import api from '../lib/api/axios';
import { EmailSettingsAdmin } from '../pages/admin/communication/EmailSettingsAdmin';
import { CommunicationOverview } from '../pages/admin/communication/CommunicationOverview';
import { EmailTemplatesAdmin } from '../pages/admin/communication/EmailTemplatesAdmin';
import { NAV_GROUPS } from '../components/admin/layout/navigation';
import { NewsletterAvailability } from '../components/admin/email/EmailParts';
import { renderWithProviders } from './testUtils';
import type { EmailOverview, EmailSettings, EmailTemplate } from '../lib/types';

const mockedApi = api as unknown as Record<
  'get' | 'post' | 'put' | 'patch' | 'delete',
  ReturnType<typeof vi.fn>
>;

const SETTINGS: EmailSettings = {
  enabled: false,
  host: 'smtp.example.com',
  port: 587,
  security: 'starttls',
  username: 'contact@ldslouga.sn',
  hasPassword: true,
  fromName: 'Louga Développement Solidaire',
  fromEmail: 'contact@ldslouga.sn',
  replyToName: null,
  replyToEmail: null,
  contactInbox: 'equipe@ldslouga.sn',
  adminInbox: null,
  identities: {},
  batchSize: 20,
  ratePerMinute: 60,
  siteUrl: 'https://ldslouga.sn',
  siteUrlFromEnvironment: null,
  signature: {},
  privacyPolicyUrl: null,
  lastTestAt: null,
  lastTestOk: null,
  lastTestError: null,
  encryptionReady: true,
  warnings: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

/* ------------------------------------------------------------- settings */

describe('Email settings screen', () => {
  const setup = (settings: Partial<EmailSettings> = {}) => {
    mockedApi.get.mockResolvedValue({ data: { ...SETTINGS, ...settings } });
    mockedApi.put.mockImplementation((_url: string, body: unknown) =>
      Promise.resolve({ data: { ...SETTINGS, ...(body as object) } }),
    );
    return renderWithProviders(<EmailSettingsAdmin />);
  };

  it('never shows the stored password, only that there is one', async () => {
    setup();
    const field = await screen.findByLabelText('Mot de passe');

    expect(field).toHaveValue('');
    expect(field).toHaveAttribute('type', 'password');
    expect(screen.getByText(/Un mot de passe est enregistré/)).toBeInTheDocument();
  });

  it('keeps the stored password when the form is saved without typing one', async () => {
    // The form never receives the password, so leaving the field empty has to
    // mean "unchanged" - and must not send an empty one, which means "remove".
    const user = userEvent.setup();
    setup();
    // The default sender comes first; the three per-purpose fields that share
    // its label sit in fieldsets whose legend names them for assistive tech.
    const [name] = await screen.findAllByLabelText('Nom de l’expéditeur');
    await user.clear(name);
    await user.type(name, 'Équipe LDS');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(mockedApi.put).toHaveBeenCalled());
    const body = mockedApi.put.mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('password');
    expect(body.fromName).toBe('Équipe LDS');
  });

  it('sends an empty password only when removal was asked for', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(await screen.findByLabelText('Supprimer le mot de passe enregistré'));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(mockedApi.put).toHaveBeenCalled());
    expect((mockedApi.put.mock.calls[0][1] as Record<string, unknown>).password).toBe('');
  });

  it('refuses to test a configuration that has not been saved', async () => {
    // The test runs against what is stored; testing while the screen shows
    // something else would report on a configuration nobody is looking at.
    const user = userEvent.setup();
    setup();
    const host = await screen.findByLabelText('Serveur');
    await user.type(host, 'x');

    expect(screen.getByRole('button', { name: /Tester la connexion/ })).toBeDisabled();
    expect(screen.getAllByText(/Enregistrez d’abord/).length).toBeGreaterThan(0);
  });

  it('says a failed test failed, in its own words', async () => {
    const user = userEvent.setup();
    setup();
    mockedApi.post.mockResolvedValue({
      data: { ok: false, message: 'Identifiant ou mot de passe refusé par le serveur.' },
    });

    await user.click(await screen.findByRole('button', { name: /Tester la connexion/ }));

    expect(
      await screen.findByText('Identifiant ou mot de passe refusé par le serveur.'),
    ).toBeInTheDocument();
  });

  it('offers the address in use when no site address is saved, without saving it', async () => {
    setup({ siteUrl: null, detectedSiteUrl: 'https://ldslouga.sn' });
    const field = await screen.findByLabelText('Adresse publique du site');
    expect(field).toHaveValue('https://ldslouga.sn');
    // A suggestion is a change waiting to be confirmed, not a saved value.
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeEnabled();
    expect(mockedApi.put).not.toHaveBeenCalled();
  });

  it('shows the deployment’s address read-only when it overrides the field', async () => {
    setup({ siteUrlFromEnvironment: 'https://ldslouga.sn' });
    const field = await screen.findByLabelText('Adresse publique du site');
    expect(field).toBeDisabled();
    expect(screen.getByText(/PUBLIC_SITE_URL/)).toBeInTheDocument();
  });

  it('shows the warnings the API found', async () => {
    setup({ warnings: ['La connexion SMTP n’est pas chiffrée.'] });
    expect(await screen.findByText('La connexion SMTP n’est pas chiffrée.')).toBeInTheDocument();
  });

  it('says plainly when the server cannot store a password at all', async () => {
    setup({ encryptionReady: false });
    expect(await screen.findByText(/EMAIL_ENCRYPTION_KEY/)).toBeInTheDocument();
  });
});

/* -------------------------------------------------------------- overview */

describe('Communication overview', () => {
  const OVERVIEW: EmailOverview = {
    smtp: {
      configured: true,
      enabled: true,
      lastTestAt: '2026-10-09T10:00:00.000Z',
      lastTestOk: true,
      warnings: [],
      encryptionReady: true,
    },
    periodDays: 30,
    counts: { PENDING: 2, SENDING: 0, SENT: 41, FAILED: 0, CANCELLED: 0 },
    failureRate: null,
    oldestPendingAt: null,
    recentFailures: [],
    contacts: { unread: 0, recent: [] },
    subscribers: { PENDING: 1, ACTIVE: 12, UNSUBSCRIBED: 0 },
    campaigns: [],
  };

  it('shows the real counts, and no rate when nothing was attempted', async () => {
    // "No failures" and "nothing to fail" are different statements: a rate
    // over zero attempts is shown as a dash, never as 0 %.
    mockedApi.get.mockResolvedValue({ data: OVERVIEW });
    renderWithProviders(<CommunicationOverview />);

    expect(await screen.findByText('41')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText(/0\s?%/)).not.toBeInTheDocument();
  });

  it('never calls an accepted email a delivered one', async () => {
    mockedApi.get.mockResolvedValue({ data: OVERVIEW });
    renderWithProviders(<CommunicationOverview />);

    expect(await screen.findByText('Acceptés par le serveur')).toBeInTheDocument();
    expect(screen.getByText(/Accepté ne veut pas dire arrivé/)).toBeInTheDocument();
    expect(screen.queryByText(/livré|délivré/i)).not.toBeInTheDocument();
  });

  it('says when the site sends nothing at all', async () => {
    mockedApi.get.mockResolvedValue({
      data: { ...OVERVIEW, smtp: { ...OVERVIEW.smtp, configured: false, enabled: false } },
    });
    renderWithProviders(<CommunicationOverview />);
    expect(await screen.findByText(/le site n’envoie aucun email/)).toBeInTheDocument();
  });
});

/* ----------------------------------------------------------- availability */

describe('newsletter availability', () => {
  it('names exactly what keeps the signup form off the site', async () => {
    mockedApi.get.mockResolvedValue({ data: { available: false, missing: ['enabled', 'siteUrl'] } });
    renderWithProviders(<NewsletterAvailability />);

    expect(await screen.findByText(/n’est pas affiché sur le site/)).toBeInTheDocument();
    expect(screen.getByText(/L’envoi des emails n’est pas activé/)).toBeInTheDocument();
    expect(screen.getByText(/L’adresse publique du site n’est pas renseignée/)).toBeInTheDocument();
    expect(screen.queryByText(/EMAIL_ENCRYPTION_KEY/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Ouvrir la configuration email' })).toHaveAttribute(
      'href',
      '/admin/emails/configuration',
    );
  });

  it('says so when the form is live', async () => {
    mockedApi.get.mockResolvedValue({ data: { available: true, missing: [] } });
    renderWithProviders(<NewsletterAvailability />);
    expect(await screen.findByText(/est affiché sur le site/)).toBeInTheDocument();
  });
});

/* ------------------------------------------------------------- templates */

describe('Email templates editor', () => {
  const TEMPLATE: EmailTemplate = {
    key: 'contact_ack',
    name: 'Accusé de réception — formulaire de contact',
    audience: 'visitor',
    variables: { firstName: 'Le prénom', siteName: 'Le nom de l’association' },
    subject: { fr: 'Nous avons bien reçu votre message', ar: 'لقد تلقّينا رسالتك' },
    html: { fr: '<p>Bonjour {{firstName}}</p>', ar: '<p>مرحبًا {{firstName}}</p>' },
    text: { fr: 'Bonjour {{firstName}}', ar: 'مرحبًا {{firstName}}' },
    isActive: true,
    required: false,
    updatedAt: null,
    unknownVariables: [],
  };

  const open = () => {
    mockedApi.get.mockResolvedValue({ data: TEMPLATE });
    mockedApi.post.mockResolvedValue({
      data: { subject: 'Sujet', html: '<p>Aperçu</p>', text: 'Aperçu' },
    });
    return renderWithProviders(<EmailTemplatesAdmin />, { route: '/admin/emails/modeles?key=contact_ack' });
  };

  it('warns about a variable the template does not provide, before saving', async () => {
    const user = userEvent.setup();
    open();
    const html = await screen.findByLabelText('Contenu');
    await user.type(html, ' {{{{frstName}}');

    expect(await screen.findByText(/Variables inconnues/)).toHaveTextContent('frstName');
  });

  it('edits Arabic right to left, whatever the language of the back-office', async () => {
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole('tab', { name: 'العربية' }));

    expect(screen.getByLabelText('Objet')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByLabelText('Objet')).toHaveValue('لقد تلقّينا رسالتك');
  });

  it('renders the preview in a sandbox that can run nothing', async () => {
    open();
    const frame = await screen.findByTitle(TEMPLATE.name);
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute('sandbox', '');
  });
});

/* ------------------------------------------------------------ navigation */

describe('Communication navigation', () => {
  const group = NAV_GROUPS.find((candidate) => candidate.title === 'Communication');

  it('lists the communication screens in the order the work happens', () => {
    expect(group?.items.map((item) => item.href)).toEqual([
      '/admin/communication',
      '/admin/emails/configuration',
      '/admin/emails/notifications',
      '/admin/emails/modeles',
      '/admin/emails/abonnes',
      '/admin/emails/campagnes',
      '/admin/emails/historique',
    ]);
  });

  it('is kept from editors, like the contact messages it is about', () => {
    for (const item of group?.items ?? []) expect(item.minRole).toBe('ADMIN');
  });

  it('has no entry that is a prefix of another, so only one is ever active', () => {
    const paths = (group?.items ?? []).map((item) => item.href);
    for (const a of paths) {
      for (const b of paths) {
        if (a !== b) expect(b.startsWith(`${a}/`)).toBe(false);
      }
    }
  });
});
