import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiErrorMessage } from '../lib/api/axios';

describe('apiErrorMessage', () => {
  it('reads a single message from a NestJS error response', () => {
    const error = { response: { data: { message: 'Article introuvable' } } };
    expect(apiErrorMessage(error)).toBe('Article introuvable');
  });

  it('joins the array of messages returned by class-validator', () => {
    const error = {
      response: { data: { message: ['Le titre est obligatoire', 'Adresse email invalide'] } },
    };
    expect(apiErrorMessage(error)).toBe('Le titre est obligatoire · Adresse email invalide');
  });

  it('explains a network failure in plain French', () => {
    expect(apiErrorMessage({ code: 'ERR_NETWORK' })).toMatch(/Impossible de joindre le serveur/);
  });

  it('uses the supplied fallback for an unrecognised error', () => {
    expect(apiErrorMessage(new Error('boom'), 'Échec du téléversement.')).toBe(
      'Échec du téléversement.',
    );
  });
});

describe('session storage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('clearSession removes the token, refresh token and cached user', async () => {
    const { clearSession, TOKEN_KEY, REFRESH_KEY, USER_KEY } = await import('../lib/api/axios');

    localStorage.setItem(TOKEN_KEY, 'access');
    localStorage.setItem(REFRESH_KEY, 'refresh');
    localStorage.setItem(USER_KEY, '{"id":"1"}');

    clearSession();

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });
});
