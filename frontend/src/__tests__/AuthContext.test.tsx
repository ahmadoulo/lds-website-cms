import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/api/axios', async () => {
  const actual = await vi.importActual<typeof import('../lib/api/axios')>('../lib/api/axios');
  return { ...actual, default: { get: vi.fn(), post: vi.fn() } };
});

import api, { TOKEN_KEY, REFRESH_KEY, USER_KEY } from '../lib/api/axios';
import { AuthProvider, useAuth } from '../context/AuthContext';

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

const Probe = () => {
  const { user, isAuthenticated, isBootstrapping, login, logout, can } = useAuth();

  return (
    <div>
      <span data-testid="bootstrapping">{String(isBootstrapping)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="email">{user?.email ?? 'none'}</span>
      <span data-testid="can-admin">{String(can('ADMIN'))}</span>
      <span data-testid="can-super">{String(can('SUPER_ADMIN'))}</span>
      <button onClick={() => void login('editor@lds.test', 'Password123!')}>login</button>
      <button onClick={() => void logout()}>logout</button>
    </div>
  );
};

const renderProbe = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

const LOGIN_RESPONSE = {
  data: {
    access_token: 'access-1',
    refresh_token: 'refresh-1',
    user: {
      id: '2',
      email: 'editor@lds.test',
      role: 'EDITOR',
      firstName: 'Edith',
      lastName: null,
    },
  },
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('starts unauthenticated when no token is stored', async () => {
    renderProbe();

    await waitFor(() => expect(screen.getByTestId('bootstrapping')).toHaveTextContent('false'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(mockedApi.get).not.toHaveBeenCalled();
  });

  it('re-validates a stored token against /auth/me', async () => {
    localStorage.setItem(TOKEN_KEY, 'stored-token');
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({ id: '1', email: 'stale@lds.test', role: 'EDITOR' }),
    );
    mockedApi.get.mockResolvedValue({
      data: { id: '1', email: 'fresh@lds.test', role: 'ADMIN', firstName: null, lastName: null },
    });

    renderProbe();

    await waitFor(() => expect(screen.getByTestId('bootstrapping')).toHaveTextContent('false'));
    expect(mockedApi.get).toHaveBeenCalledWith('/auth/me');
    // The server is the source of truth, not the cached copy.
    expect(screen.getByTestId('email')).toHaveTextContent('fresh@lds.test');
  });

  it('drops the session when the stored token is rejected', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-token');
    localStorage.setItem(USER_KEY, JSON.stringify({ id: '1', email: 'x@lds.test', role: 'EDITOR' }));
    mockedApi.get.mockRejectedValue({ response: { status: 401 } });

    renderProbe();

    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('false'));
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it('stores both tokens on login', async () => {
    mockedApi.post.mockResolvedValue(LOGIN_RESPONSE);

    renderProbe();
    await waitFor(() => expect(screen.getByTestId('bootstrapping')).toHaveTextContent('false'));
    await userEvent.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'));
    expect(localStorage.getItem(TOKEN_KEY)).toBe('access-1');
    expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-1');
  });

  it('clears the session on logout', async () => {
    mockedApi.post.mockResolvedValue(LOGIN_RESPONSE);

    renderProbe();
    await waitFor(() => expect(screen.getByTestId('bootstrapping')).toHaveTextContent('false'));
    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'));

    await userEvent.click(screen.getByText('logout'));

    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('false'));
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('exposes the role hierarchy through can()', async () => {
    localStorage.setItem(TOKEN_KEY, 'token');
    mockedApi.get.mockResolvedValue({
      data: { id: '1', email: 'admin@lds.test', role: 'ADMIN', firstName: null, lastName: null },
    });

    renderProbe();

    await waitFor(() => expect(screen.getByTestId('can-admin')).toHaveTextContent('true'));
    expect(screen.getByTestId('can-super')).toHaveTextContent('false');
  });
});
