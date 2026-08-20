import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api/axios', async () => {
  const actual = await vi.importActual<typeof import('../lib/api/axios')>('../lib/api/axios');
  return { ...actual, default: { get: vi.fn(), post: vi.fn() } };
});

vi.mock('../context/SettingsContext', () => ({
  useSettings: () => ({
    settings: {
      global_contact: {
        email: 'lougasolidaire@gmail.com',
        phone: '+221 77 472 33 64',
        phoneSecondary: '',
        address: 'Louga, Sénégal',
      },
      seo: { title: 'LDS', description: '', keywords: '', ogImageId: null },
    },
    isLoading: false,
    error: null,
  }),
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import api from '../lib/api/axios';
import { ContactPage } from '../pages/public/ContactPage';
import { renderWithProviders } from './testUtils';

const mockedApi = api as unknown as { post: ReturnType<typeof vi.fn> };

describe('ContactPage', () => {
  beforeEach(() => vi.clearAllMocks());

  const fillValidForm = async () => {
    await userEvent.type(screen.getByLabelText(/Prénom et nom/i), 'Aïssatou Diop');
    await userEvent.type(screen.getByLabelText(/^Email/i), 'aissatou@example.com');
    await userEvent.type(screen.getByLabelText(/Sujet/i), 'Bénévolat');
    await userEvent.type(
      screen.getByLabelText(/Message/i),
      'Je souhaite rejoindre votre équipe de bénévoles.',
    );
  };

  it('shows the association coordinates from the settings', () => {
    renderWithProviders(<ContactPage />);

    expect(screen.getByText('lougasolidaire@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('+221 77 472 33 64')).toBeInTheDocument();
    expect(screen.getByText('Louga, Sénégal')).toBeInTheDocument();
  });

  it('blocks submission and reports errors when required fields are empty', async () => {
    renderWithProviders(<ContactPage />);

    await userEvent.click(screen.getByRole('button', { name: /Envoyer le message/i }));

    expect(await screen.findByText("Merci d'indiquer votre nom")).toBeInTheDocument();
    expect(screen.getByText("L'adresse email est obligatoire")).toBeInTheDocument();
    // No request must leave the browser when the form is invalid.
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('rejects a malformed email before calling the API', async () => {
    renderWithProviders(<ContactPage />);

    await userEvent.type(screen.getByLabelText(/^Email/i), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: /Envoyer le message/i }));

    expect(await screen.findByText('Adresse email invalide')).toBeInTheDocument();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('posts the message to the API and confirms success', async () => {
    mockedApi.post.mockResolvedValue({ data: { success: true } });

    renderWithProviders(<ContactPage />);
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /Envoyer le message/i }));

    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith('/contact', {
        name: 'Aïssatou Diop',
        email: 'aissatou@example.com',
        subject: 'Bénévolat',
        message: 'Je souhaite rejoindre votre équipe de bénévoles.',
      }),
    );

    expect(await screen.findByText('Message envoyé !')).toBeInTheDocument();
  });

  it('surfaces the server error instead of pretending it worked', async () => {
    mockedApi.post.mockRejectedValue({
      response: { data: { message: 'Trop de messages envoyés. Réessayez plus tard.' } },
    });

    renderWithProviders(<ContactPage />);
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /Envoyer le message/i }));

    expect(
      await screen.findByText('Trop de messages envoyés. Réessayez plus tard.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Message envoyé !')).not.toBeInTheDocument();
  });
});
