import {
  open,
  redact,
  seal,
  hasEncryptionKey,
  SecretKeyMissingError,
} from './secret-box';
import {
  assertHeaderSafe,
  escapeHtml,
  fill,
  fillSubject,
  frame,
  HeaderInjectionError,
  isPlausibleEmail,
  variablesIn,
} from './render';

const KEY = 'test-key-that-is-long-enough-for-aes';

describe('secret box', () => {
  const previous = process.env.EMAIL_ENCRYPTION_KEY;
  beforeEach(() => {
    process.env.EMAIL_ENCRYPTION_KEY = KEY;
  });
  afterAll(() => {
    process.env.EMAIL_ENCRYPTION_KEY = previous;
  });

  it('round-trips a password', () => {
    expect(open(seal('mot-de-passe-smtp'))).toBe('mot-de-passe-smtp');
  });

  it('never stores the password recognisably', () => {
    const sealed = seal('mot-de-passe-smtp');
    expect(sealed).not.toContain('mot-de-passe-smtp');
    expect(sealed).not.toContain(
      Buffer.from('mot-de-passe-smtp').toString('base64'),
    );
  });

  it('gives a different ciphertext every time', () => {
    // A fixed IV would let anyone see that two stored passwords are equal.
    expect(seal('same')).not.toBe(seal('same'));
  });

  it('refuses a tampered value instead of decrypting it to something else', () => {
    const [version, iv, tag, body] = seal('mot-de-passe-smtp').split(':');
    const flipped = Buffer.from(body, 'base64');
    flipped[0] ^= 0xff;
    expect(() =>
      open([version, iv, tag, flipped.toString('base64')].join(':')),
    ).toThrow();
  });

  it('cannot be opened with another key', () => {
    const sealed = seal('mot-de-passe-smtp');
    process.env.EMAIL_ENCRYPTION_KEY = 'a-completely-different-long-key';
    expect(() => open(sealed)).toThrow();
  });

  it('refuses to work without a key rather than storing in clear', () => {
    delete process.env.EMAIL_ENCRYPTION_KEY;
    expect(hasEncryptionKey()).toBe(false);
    expect(() => seal('x')).toThrow(SecretKeyMissingError);
  });
});

describe('redact', () => {
  it('removes the password and its base64 form from a provider error', () => {
    // The AUTH exchange sends credentials base64-encoded, and some providers
    // quote it back in the error.
    const b64 = Buffer.from('s3cr3t-pass').toString('base64');
    const message = redact(
      `Invalid login: 535 AUTH PLAIN ${b64} rejected for s3cr3t-pass`,
      ['s3cr3t-pass'],
    );
    expect(message).not.toContain('s3cr3t-pass');
    expect(message).not.toContain(b64);
  });

  it('removes credentials from a connection string', () => {
    expect(
      redact('connect smtp://user:hunter22@mail.example.com failed'),
    ).not.toContain('hunter22');
  });

  it('removes password=... style fragments', () => {
    expect(redact('bad config password=hunter22 host=x')).not.toContain(
      'hunter22',
    );
  });

  it('keeps errors short enough to belong in a history', () => {
    expect(redact('x'.repeat(5000)).length).toBeLessThanOrEqual(500);
  });
});

describe('header injection', () => {
  it('refuses a line break in a header value', () => {
    // "Subject\r\nBcc: everyone@..." is how one email becomes a spam run.
    expect(() =>
      assertHeaderSafe('subject', 'Bonjour\r\nBcc: victim@example.com'),
    ).toThrow(HeaderInjectionError);
    expect(() => assertHeaderSafe('subject', 'Bonjour\nBcc: x@y.z')).toThrow(
      HeaderInjectionError,
    );
  });

  it('refuses a subject that becomes multi-line once a visitor value is filled in', () => {
    expect(() =>
      fillSubject('Message : {{subject}}', { subject: 'a\r\nBcc: x@y.z' }),
    ).toThrow(HeaderInjectionError);
  });

  it('accepts an ordinary subject', () => {
    expect(
      fillSubject('Nouveau message : {{subject}}', { subject: 'Bénévolat' }),
    ).toBe('Nouveau message : Bénévolat');
  });
});

describe('addresses', () => {
  it('accepts ordinary addresses', () => {
    for (const ok of ['contact@ldslouga.sn', 'a.b+tag@mail.example.org']) {
      expect(isPlausibleEmail(ok)).toBe(true);
    }
  });

  it('refuses what would certainly fail or inject', () => {
    for (const bad of [
      '',
      'no-at-sign',
      'a@b',
      'two@@example.com',
      'with space@example.com',
      'x@example.com\r\nBcc: y@z.com',
      'a@b.c, d@e.f',
      null,
      undefined,
    ]) {
      expect(isPlausibleEmail(bad)).toBe(false);
    }
  });
});

describe('template rendering', () => {
  it('escapes a visitor value into HTML', () => {
    const html = fill(
      '<p>{{message}}</p>',
      { message: '<script>alert(1)</script>' },
      'html',
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('does not escape plain text, where there is no markup to break', () => {
    // Escaping here would print "&amp;" into the email.
    expect(fill('{{name}}', { name: 'Diop & Fils' }, 'text')).toBe(
      'Diop & Fils',
    );
  });

  it('leaves an unknown variable visible so a typo shows in the preview', () => {
    expect(fill('Bonjour {{frstName}}', { firstName: 'Awa' }, 'html')).toBe(
      'Bonjour {{frstName}}',
    );
  });

  it('keeps the administrator’s own markup', () => {
    expect(fill('<strong>{{name}}</strong>', { name: 'Awa' }, 'html')).toBe(
      '<strong>Awa</strong>',
    );
  });

  it('lists the variables a template uses', () => {
    expect(variablesIn('{{a}} {{ b }} {{a}}').sort()).toEqual(['a', 'b']);
  });

  it('cannot be used to inject markup through a site value either', () => {
    expect(escapeHtml('"><img src=x>')).toBe('&quot;&gt;&lt;img src=x&gt;');
  });
});

describe('frame', () => {
  const layout = {
    siteName: 'Louga Développement Solidaire',
    siteUrl: 'https://ldslouga.sn',
    logoUrl: 'https://ldslouga.sn/logo-mark.png',
    address: 'Louga, Sénégal',
  };

  it('lays Arabic out right to left on the cells, where clients honour it', () => {
    const html = frame('<p>مرحبًا</p>', { ...layout, locale: 'ar' });
    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html).toContain('<td dir="rtl"');
  });

  it('uses tables and inline styles, not CSS an email client would drop', () => {
    const html = frame('<p>x</p>', { ...layout, locale: 'fr' });
    expect(html).toContain('role="presentation"');
    expect(html).not.toContain('<style');
    expect(html).not.toMatch(/display:\s*(flex|grid)/);
  });

  it('only offers an unsubscribe link on mail a person can stop receiving', () => {
    expect(frame('x', { ...layout, locale: 'fr' })).not.toContain(
      'Se désinscrire',
    );
    expect(
      frame('x', {
        ...layout,
        locale: 'fr',
        unsubscribeUrl: 'https://ldslouga.sn/u/t',
      }),
    ).toContain('Se désinscrire');
  });
});
