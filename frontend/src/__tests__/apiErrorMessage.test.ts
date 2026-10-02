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

  it('answers in French when no locale is given', () => {
    expect(apiErrorMessage(httpError(401))).toBe('Une erreur est survenue.');
  });

  /*
    The Arabic half. The cases above are repeated rather than parameterised,
    because what matters is that each situation produces a sentence in the right
    language - not that the two tables happen to have the same shape.
  */
  describe('in Arabic', () => {
    const AR_LOGIN_FALLBACK = 'تعذّر تسجيل الدخول. تحقّق من بيانات الدخول.';

    it('still prefers the message the API sent', () => {
      // The backend knows which field was wrong; this function must not overrule it.
      expect(apiErrorMessage(httpError(401, { message: 'بيانات الدخول غير صحيحة' }), undefined, 'ar')).toBe(
        'بيانات الدخول غير صحيحة',
      );
    });

    it('joins the list of validation errors with the same separator', () => {
      expect(
        apiErrorMessage(
          httpError(400, { message: ['بريد إلكتروني غير صالح', 'كلمة المرور إلزامية'] }),
          undefined,
          'ar',
        ),
      ).toBe('بريد إلكتروني غير صالح · كلمة المرور إلزامية');
    });

    it('does not blame the credentials when the server is down', () => {
      const message = apiErrorMessage(
        httpError(502, '<html>502 Bad Gateway</html>'),
        AR_LOGIN_FALLBACK,
        'ar',
      );

      expect(message).toBe('الخادم غير متاح مؤقّتًا. أعد المحاولة بعد لحظات.');
      expect(message).not.toBe(AR_LOGIN_FALLBACK);
    });

    it('treats 503 and 504 the same way', () => {
      const expected = 'الخادم غير متاح مؤقّتًا. أعد المحاولة بعد لحظات.';
      expect(apiErrorMessage(httpError(503), AR_LOGIN_FALLBACK, 'ar')).toBe(expected);
      expect(apiErrorMessage(httpError(504), AR_LOGIN_FALLBACK, 'ar')).toBe(expected);
    });

    it('names rate limiting rather than a wrong password', () => {
      const message = apiErrorMessage(httpError(429), AR_LOGIN_FALLBACK, 'ar');

      expect(message).toBe('محاولات كثيرة جدًا. انتظر دقيقة قبل إعادة المحاولة.');
      expect(message).not.toBe(AR_LOGIN_FALLBACK);
    });

    it('reports a generic server error for other 5xx', () => {
      expect(apiErrorMessage(httpError(500), AR_LOGIN_FALLBACK, 'ar')).toBe(
        'حدث خطأ في الخادم. أعد المحاولة بعد لحظات.',
      );
    });

    it('reports an unreachable network', () => {
      expect(apiErrorMessage({ code: 'ERR_NETWORK' }, undefined, 'ar')).toBe(
        'تعذّر الوصول إلى الخادم. تحقّق من اتصالك.',
      );
    });

    it('keeps the caller fallback for a plain 401 with no body', () => {
      expect(apiErrorMessage(httpError(401), AR_LOGIN_FALLBACK, 'ar')).toBe(AR_LOGIN_FALLBACK);
    });

    it('falls back to the Arabic generic message when the caller gives none', () => {
      expect(apiErrorMessage(httpError(401), undefined, 'ar')).toBe('حدث خطأ.');
    });

    it('never leaks a French sentence into an Arabic answer', () => {
      const cases = [
        httpError(401),
        httpError(429),
        httpError(500),
        httpError(502),
        { code: 'ERR_NETWORK' },
      ];

      for (const error of cases) {
        // A Latin letter here would mean a French string reached an Arabic screen.
        expect(apiErrorMessage(error, undefined, 'ar')).not.toMatch(/[A-Za-z]/);
      }
    });
  });
});
