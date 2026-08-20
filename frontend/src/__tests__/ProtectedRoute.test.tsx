import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

vi.mock('../lib/api/axios', async () => {
  const actual = await vi.importActual<typeof import('../lib/api/axios')>('../lib/api/axios');
  return { ...actual, default: { get: vi.fn(), post: vi.fn() } };
});

import api, { TOKEN_KEY } from '../lib/api/axios';
import { AuthProvider } from '../context/AuthContext';
import { ProtectedRoute } from '../components/admin/ProtectedRoute';
import { createTestQueryClient } from './testUtils';

const mockedApi = api as unknown as { get: ReturnType<typeof vi.fn> };

const renderRoutes = (initialPath: string) =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[initialPath]}>
        <AuthProvider>
          <Routes>
            <Route path="/admin/login" element={<p>Page de connexion</p>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/admin/mot-de-passe" element={<p>Changer le mot de passe</p>} />
              <Route path="/admin" element={<p>Tableau de bord</p>} />
              <Route element={<ProtectedRoute minRole="SUPER_ADMIN" />}>
                <Route path="/admin/utilisateurs" element={<p>Gestion des comptes</p>} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const signedInAs = (role: string, mustChangePassword = false) => {
  localStorage.setItem(TOKEN_KEY, 'token');
  mockedApi.get.mockResolvedValue({
    data: { id: '1', email: 'user@lds.test', role, firstName: null, lastName: null, mustChangePassword },
  });
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('redirects an anonymous visitor to the login page', async () => {
    renderRoutes('/admin');
    expect(await screen.findByText('Page de connexion')).toBeInTheDocument();
  });

  it('shows a verification state while the stored session is checked', async () => {
    localStorage.setItem(TOKEN_KEY, 'token');
    mockedApi.get.mockReturnValue(new Promise(() => undefined));

    renderRoutes('/admin');

    expect(await screen.findByText(/Vérification de la session/i)).toBeInTheDocument();
    expect(screen.queryByText('Tableau de bord')).not.toBeInTheDocument();
  });

  it('lets an authenticated editor reach the dashboard', async () => {
    signedInAs('EDITOR');
    renderRoutes('/admin');

    expect(await screen.findByText('Tableau de bord')).toBeInTheDocument();
  });

  it('blocks an editor from the super-admin area', async () => {
    signedInAs('EDITOR');
    renderRoutes('/admin/utilisateurs');

    expect(await screen.findByText('Accès non autorisé')).toBeInTheDocument();
    expect(screen.queryByText('Gestion des comptes')).not.toBeInTheDocument();
  });

  it('lets a super administrator into the super-admin area', async () => {
    signedInAs('SUPER_ADMIN');
    renderRoutes('/admin/utilisateurs');

    expect(await screen.findByText('Gestion des comptes')).toBeInTheDocument();
  });

  it('forces a first-login password change before anything else', async () => {
    signedInAs('ADMIN', true);
    renderRoutes('/admin');

    expect(await screen.findByText('Changer le mot de passe')).toBeInTheDocument();
  });

  it('sends an expired session back to the login page', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired');
    mockedApi.get.mockRejectedValue({ response: { status: 401 } });

    renderRoutes('/admin');

    await waitFor(() => expect(screen.getByText('Page de connexion')).toBeInTheDocument());
  });
});
