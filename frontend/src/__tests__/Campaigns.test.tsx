import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api/axios', async () => {
  const actual = await vi.importActual<typeof import('../lib/api/axios')>('../lib/api/axios');
  return {
    ...actual,
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      defaults: { baseURL: '/api/v1' },
    },
  };
});

import api from '../lib/api/axios';
import { CampaignsAdmin } from '../pages/admin/communication/CampaignsAdmin';
import { NotificationsAdmin } from '../pages/admin/communication/NotificationsAdmin';
import { BlockEditor } from '../components/admin/email/BlockEditor';
import { renderWithProviders } from './testUtils';
import type { Campaign, CampaignBlock, EmailSettings, EmailTemplate } from '../lib/types';

const mockedApi = api as unknown as Record<'get' | 'post' | 'put' | 'delete', ReturnType<typeof vi.fn>>;

const SETTINGS = {
  enabled: true,
  encryptionReady: true,
  siteUrl: 'https://ldslouga.sn',
  siteUrlFromEnvironment: null,
  fromName: 'Louga Développement Solidaire',
  fromEmail: 'contact@ldslouga.sn',
  username: 'contact@ldslouga.sn',
  identities: {},
  contactInbox: 'equipe@ldslouga.sn',
  adminInbox: null,
} as unknown as EmailSettings;

const CAMPAIGN: Campaign = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Rentrée',
  subject: 'Nos nouvelles',
  preheader: null,
  blocks: [{ type: 'paragraph', text: 'Bonjour' }],
  locale: 'fr',
  audience: { segment: 'all' },
  fromName: null,
  replyTo: null,
  includeSignature: true,
  status: 'DRAFT',
  scheduledAt: null,
  startedAt: null,
  completedAt: null,
  recipientCount: null,
  createdAt: '2026-10-10T10:00:00.000Z',
  updatedAt: '2026-10-10T10:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockImplementation((url: string) => {
    if (url === '/email/settings') return Promise.resolve({ data: SETTINGS });
    if (url.startsWith('/campaigns/')) return Promise.resolve({ data: CAMPAIGN });
    return Promise.resolve({ data: { data: [], meta: { page: 1, totalPages: 1, total: 0 } } });
  });
  mockedApi.post.mockImplementation((url: string) => {
    if (url === '/campaigns/audience') return Promise.resolve({ data: { recipients: 3 } });
    if (url.endsWith('/preview')) {
      return Promise.resolve({ data: { subject: 'Nos nouvelles', html: '<p>x</p>', text: 'x' } });
    }
    return Promise.resolve({ data: {} });
  });
});

const openEditor = () =>
  renderWithProviders(<CampaignsAdmin />, { route: `/admin/emails/campagnes?id=${CAMPAIGN.id}` });

describe('campaign sending', () => {
  it('asks for an explicit confirmation naming the number of recipients', async () => {
    const user = userEvent.setup();
    openEditor();
    await user.click(await screen.findByRole('button', { name: /Envoyer…/ }));

    const dialog = await screen.findByRole('dialog');
    const go = within(dialog).getByRole('button', { name: /Lancer l’envoi/ });
    expect(go).toBeDisabled();

    await user.click(within(dialog).getByRole('checkbox', { name: /à 3 destinataires/ }));
    expect(go).toBeEnabled();
  });

  it('sends the count that was confirmed, and stops if the audience changed', async () => {
    const user = userEvent.setup();
    openEditor();
    await user.click(await screen.findByRole('button', { name: /Envoyer…/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('checkbox', { name: /à 3 destinataires/ }));

    mockedApi.post.mockImplementation((url: string) => {
      if (url.endsWith('/schedule')) return Promise.reject({ response: { status: 409 } });
      if (url === '/campaigns/audience') return Promise.resolve({ data: { recipients: 4 } });
      return Promise.resolve({ data: {} });
    });
    await user.click(within(dialog).getByRole('button', { name: /Lancer l’envoi/ }));

    const schedule = mockedApi.post.mock.calls.find(([url]) => String(url).endsWith('/schedule'));
    expect(schedule?.[1]).toMatchObject({ expectedRecipients: 3 });
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/L’audience a changé/);
    // The confirmation is withdrawn: it was given for a number that is no longer true.
    await waitFor(() =>
      expect(within(dialog).getByRole('checkbox', { name: /à 4 destinataires/ })).not.toBeChecked(),
    );
  });

  it('cannot be sent with unsaved changes', async () => {
    const user = userEvent.setup();
    openEditor();
    const subject = await screen.findByLabelText(/^Objet/);
    await user.type(subject, ' !');
    expect(screen.getByRole('button', { name: /Envoyer…/ })).toBeDisabled();
  });

  it('says plainly when sending is not operational, and offers no send button that works', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/email/settings') return Promise.resolve({ data: { ...SETTINGS, enabled: false } });
      return Promise.resolve({ data: CAMPAIGN });
    });
    openEditor();
    expect(await screen.findByText(/L’envoi n’est pas opérationnel/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Envoyer…/ })).toBeDisabled();
  });
});

describe('block editor', () => {
  const Harness = ({ initial }: { initial: CampaignBlock[] }) => {
    const [blocks, setBlocks] = React.useState(initial);
    return (
      <>
        <BlockEditor blocks={blocks} onChange={setBlocks} dir="ltr" />
        <output data-testid="blocks">{JSON.stringify(blocks)}</output>
      </>
    );
  };
  const current = () => JSON.parse(screen.getByTestId('blocks').textContent!) as CampaignBlock[];

  it('adds, reorders and removes blocks', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness initial={[{ type: 'heading', text: 'Titre' }]} />);

    await user.click(screen.getByRole('button', { name: 'Paragraphe' }));
    expect(current().map((b) => b.type)).toEqual(['heading', 'paragraph']);

    await user.click(screen.getAllByRole('button', { name: 'Monter' })[1]);
    expect(current().map((b) => b.type)).toEqual(['paragraph', 'heading']);

    await user.click(screen.getAllByRole('button', { name: 'Retirer le bloc' })[0]);
    expect(current().map((b) => b.type)).toEqual(['heading']);
  });

  it('wraps the selected words in bold', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness initial={[{ type: 'paragraph', text: 'Un grand merci' }]} />);
    const area = screen.getByLabelText('Paragraphe') as HTMLTextAreaElement;
    area.setSelectionRange(3, 8);
    await user.click(screen.getByRole('button', { name: 'Gras' }));
    expect(current()[0]).toEqual({ type: 'paragraph', text: 'Un **grand** merci' });
  });
});

describe('notifications screen', () => {
  const TEMPLATES = [
    { key: 'contact_ack', name: 'Accusé', audience: 'visitor', isActive: true, required: false },
    { key: 'contact_notify', name: 'Notification', audience: 'team', isActive: true, required: false },
    { key: 'newsletter_confirm', name: 'Confirmation', audience: 'visitor', isActive: true, required: true },
    { key: 'campaign_completed', name: 'Campagne terminée', audience: 'team', isActive: true, required: false },
  ] as unknown as EmailTemplate[];

  beforeEach(() => {
    mockedApi.get.mockImplementation((url: string) =>
      Promise.resolve({ data: url === '/email/templates' ? TEMPLATES : SETTINGS }),
    );
  });

  it('shows the confirmation email as always sent, with no switch', async () => {
    renderWithProviders(<NotificationsAdmin />);
    expect(await screen.findByText('Toujours envoyé')).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /Confirmation/ })).toBeNull();
  });

  it('switches a notification off', async () => {
    const user = userEvent.setup();
    mockedApi.put.mockResolvedValue({ data: {} });
    renderWithProviders(<NotificationsAdmin />);
    await user.click(await screen.findByRole('switch', { name: /Accusé/ }));
    expect(mockedApi.put).toHaveBeenCalledWith('/email/templates/contact_ack', { isActive: false });
  });

  it('says when a team email has nowhere to go', async () => {
    renderWithProviders(<NotificationsAdmin />);
    // No alert inbox, but the contact inbox is the fallback, so it is shown.
    expect(await screen.findAllByText('equipe@ldslouga.sn')).not.toHaveLength(0);
  });
});
