import { describe, expect, it } from 'vitest';
import { apiErrorMessage } from '../lib/api/axios';

const httpError = (status: number, data: unknown = '') => ({
  response: { status, data },
});

const LOGIN_FALLBACK = 'Connexion impossible. Vérifiez vos identifiants.';

describe('apiErrorMessage', () => {
  it('prefers the message the API sent', () => {
    expect(apiErrorMessage(httpError(401, { message: 'Identifiants invalides' }))).toBe(
      'Identifiants invalides',
    );
  });

  it('joins the list of validation errors', () => {
    expect(
      apiErrorMessage(httpError(400, { message: ['Email invalide', 'Mot de passe requis'] })),
    ).toBe('Email invalide · Mot de passe requis');
  });

  it('does not blame the credentials when the server is down', () => {
    // nginx answers a 502 with an HTML body, so there is no `message` to read.
    const message = apiErrorMessage(httpError(502, '<html>502 Bad Gateway</html>'), LOGIN_FALLBACK);

    expect(message).toMatch(/indisponible/i);
    expect(message).not.toMatch(/identifiants/i);
  });

  it('treats 503 and 504 the same way', () => {
    expect(apiErrorMessage(httpError(503), LOGIN_FALLBACK)).toMatch(/indisponible/i);
    expect(apiErrorMessage(httpError(504), LOGIN_FALLBACK)).toMatch(/indisponible/i);
  });

  it('names rate limiting rather than a wrong password', () => {
    const message = apiErrorMessage(httpError(429), LOGIN_FALLBACK);

    expect(message).toMatch(/tentatives/i);
    expect(message).not.toMatch(/identifiants/i);
  });

  it('reports a generic server error for other 5xx', () => {
    expect(apiErrorMessage(httpError(500), LOGIN_FALLBACK)).toMatch(/côté serveur/i);
  });

  it('reports an unreachable network', () => {
    expect(apiErrorMessage({ code: 'ERR_NETWORK' })).toMatch(/joindre le serveur/i);
  });

  it('keeps the caller fallback for a plain 401 with no body', () => {
    expect(apiErrorMessage(httpError(401), LOGIN_FALLBACK)).toBe(LOGIN_FALLBACK);
  });

  it('ignores an empty message from the API', () => {
    expect(apiErrorMessage(httpError(401, { message: '   ' }), LOGIN_FALLBACK)).toBe(LOGIN_FALLBACK);
  });
});
