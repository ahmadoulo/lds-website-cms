import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api/axios', async () => {
  const actual = await vi.importActual<typeof import('../lib/api/axios')>('../lib/api/axios');
  return { ...actual, default: { get: vi.fn(), post: vi.fn() } };
});

vi.mock('../context/SettingsContext', () => ({
  useSettings: () => ({ settings: undefined, isLoading: false, error: null }),
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import api from '../lib/api/axios';
import { NewsletterSignup } from '../components/public/NewsletterSignup';
import { NewsletterConfirmPage, NewsletterUnsubscribePage } from '../pages/public/NewsletterPages';
import { renderWithProviders } from './testUtils';

const mockedApi = api as unknown as Record<'get' | 'post', ReturnType<typeof vi.fn>>;

const STATUS = {
  available: true,
  privacyPolicyUrl: 'https://ldslouga.sn/confidentialite',
  consentText: {
    fr: "J'accepte de recevoir par email les nouvelles de LDS.",
    ar: 'أوافق على تلقّي أخبار الجمعية.',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockResolvedValue({ data: STATUS });
});

describe('newsletter signup form', () => {
  it('is not there at all when the API says signing up would not work', async () => {
    mockedApi.get.mockResolvedValue({ data: { ...STATUS, available: false } });
    renderWithProviders(<NewsletterSignup source="footer" />);
    await waitFor(() => expect(mockedApi.get).toHaveBeenCalled());
    // Let the status resolve, then check nothing of the form was drawn.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows the server’s own consent sentence, and the privacy link', async () => {
    renderWithProviders(<NewsletterSignup source="footer" />);
    expect(await screen.findByText(/J'accepte de recevoir par email/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Politique de confidentialité' })).toHaveAttribute(
      'href',
      STATUS.privacyPolicyUrl,
    );
  });

  it('refuses to send without the box ticked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NewsletterSignup source="footer" />);
    await user.type(await screen.findByLabelText('Votre adresse email'), 'awa@example.com');
    await user.click(screen.getByRole('button', { name: 'S’inscrire' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Cochez la case/);
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('sends the address, the consent and the language, and says what happens next', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValue({ data: { ok: true } });
    renderWithProviders(<NewsletterSignup source="footer" />);

    await user.type(await screen.findByLabelText('Votre adresse email'), 'awa@example.com');
    await user.click(screen.getByRole('checkbox', { name: /J'accepte/ }));
    await user.click(screen.getByRole('button', { name: 'S’inscrire' }));

    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith('/newsletter/subscribe', {
        email: 'awa@example.com',
        consent: true,
        locale: 'fr',
        source: 'footer',
      }),
    );
    // Worded to be true whether or not the address was already on the list.
    expect(await screen.findByRole('status')).toHaveTextContent(/si cette adresse n’est pas déjà inscrite/);
  });

  it('says so plainly when there have been too many attempts', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockRejectedValue({ response: { status: 429 } });
    renderWithProviders(<NewsletterSignup source="footer" />);
    await user.type(await screen.findByLabelText('Votre adresse email'), 'awa@example.com');
    await user.click(screen.getByRole('checkbox', { name: /J'accepte/ }));
    await user.click(screen.getByRole('button', { name: 'S’inscrire' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Trop de tentatives/);
  });
});

describe('confirmation page', () => {
  it('confirms on a click, never on arrival', async () => {
    // Mail scanners open links before people do. Arriving must change nothing.
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValue({ data: { result: 'confirmed' } });
    renderWithProviders(<NewsletterConfirmPage />, { route: '/newsletter/confirmation?token=abc' });

    const button = await screen.findByRole('button', { name: 'Confirmer mon inscription' });
    expect(mockedApi.post).not.toHaveBeenCalled();

    await user.click(button);
    expect(mockedApi.post).toHaveBeenCalledWith('/newsletter/confirm', { token: 'abc' });
    expect(await screen.findByText(/Votre inscription est confirmée/)).toBeInTheDocument();
  });

  it('explains an expired link and offers a way back', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValue({ data: { result: 'expired' } });
    renderWithProviders(<NewsletterConfirmPage />, { route: '/newsletter/confirmation?token=abc' });
    await user.click(await screen.findByRole('button', { name: 'Confirmer mon inscription' }));
    expect(await screen.findByText(/Ce lien a expiré/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'S’inscrire de nouveau' })).toHaveAttribute('href', '/newsletter');
  });
});

describe('unsubscribe page', () => {
  it('unsubscribes on a click, never on arrival', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValue({ data: { ok: true } });
    renderWithProviders(<NewsletterUnsubscribePage />, {
      route: '/newsletter/desinscription?s=sub-1&t=tok&c=camp-1',
    });

    const button = await screen.findByRole('button', { name: 'Me désinscrire' });
    expect(mockedApi.post).not.toHaveBeenCalled();
    await user.click(button);

    expect(mockedApi.post).toHaveBeenCalledWith('/newsletter/unsubscribe', {
      s: 'sub-1',
      t: 'tok',
      c: 'camp-1',
    });
    expect(await screen.findByText(/vous êtes désinscrit/)).toBeInTheDocument();
  });

  it('says a link without its token is not valid, instead of offering a button that cannot work', async () => {
    renderWithProviders(<NewsletterUnsubscribePage />, { route: '/newsletter/desinscription?s=sub-1' });
    expect(await screen.findByText(/n’est pas valide/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Me désinscrire' })).not.toBeInTheDocument();
  });
});
