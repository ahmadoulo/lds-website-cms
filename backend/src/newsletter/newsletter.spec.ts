import type { PrismaService } from '../prisma/prisma.service';
import type { EmailSettingsService } from '../email/email-settings.service';
import type { EmailQueueService } from '../email/email-queue.service';
import type { TemplatesService } from '../email/templates.service';
import {
  NewsletterService,
  RESEND_INTERVAL_MS,
  csvCell,
} from './newsletter.service';
import { hashToken, unsubscribeToken, verifyUnsubscribeToken } from './tokens';

const KEY = 'newsletter-test-key-long-enough-for-aes';

type Row = Record<string, any>;

/** Just the subscriber table and the email queue rows these paths touch. */
function setup(options: { available?: boolean } = {}) {
  const subscribers: Row[] = [];
  const messages: Row[] = [];
  let next = 1;

  const prisma = {
    newsletterSubscriber: {
      findUnique: jest.fn(({ where }: any) =>
        Promise.resolve(
          subscribers.find((row) =>
            Object.entries(where).every(([key, value]) => row[key] === value),
          ) ?? null,
        ),
      ),
      findMany: jest.fn(({ where }: any) =>
        Promise.resolve(
          subscribers.filter((row) => where.email.in.includes(row.email)),
        ),
      ),
      create: jest.fn(({ data }: any) => {
        const row = {
          id: `00000000-0000-4000-8000-00000000000${next++}`,
          ...data,
        };
        subscribers.push(row);
        return Promise.resolve(row);
      }),
      createMany: jest.fn(({ data }: any) => {
        for (const item of data)
          subscribers.push({ id: `imported-${next++}`, ...item });
        return Promise.resolve({ count: data.length });
      }),
      update: jest.fn(({ where, data }: any) => {
        const row = subscribers.find((candidate) => candidate.id === where.id)!;
        Object.assign(row, data);
        return Promise.resolve(row);
      }),
      delete: jest.fn(),
    },
    emailMessage: {
      updateMany: jest.fn(({ where, data }: any) => {
        const rows = messages.filter(
          (row) =>
            row.subscriberId === where.subscriberId &&
            row.status === where.status,
        );
        rows.forEach((row) => Object.assign(row, data));
        return Promise.resolve({ count: rows.length });
      }),
    },
    campaign: { findUnique: jest.fn(() => Promise.resolve(null)) },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };

  const settings = {
    isEnabled: jest.fn(() => Promise.resolve(options.available ?? true)),
    siteUrl: jest.fn(() => Promise.resolve('https://ldslouga.sn')),
    requireSiteUrl: jest.fn(() => Promise.resolve('https://ldslouga.sn')),
    identityFor: jest.fn(() =>
      Promise.resolve({
        fromName: 'LDS',
        fromEmail: 'contact@ldslouga.sn',
        replyTo: null,
      }),
    ),
    adminInbox: jest.fn(() => Promise.resolve('equipe@ldslouga.sn')),
  };

  const queued: Row[] = [];
  const queue = {
    enqueue: jest.fn((input: Row) => {
      queued.push(input);
      return Promise.resolve({ id: `msg-${queued.length}` });
    }),
  };

  const rendered: Array<{ key: string; values: Row; options?: Row }> = [];
  const templates = {
    get: jest.fn(() => Promise.resolve({ isActive: true })),
    render: jest.fn(
      (key: string, _locale: string, values: Row, options?: Row) => {
        rendered.push({ key, values, options });
        return Promise.resolve({
          subject: key,
          html: `<a href="${values.confirmUrl}">`,
          text: '',
        });
      },
    ),
  };

  const service = new NewsletterService(
    prisma as unknown as PrismaService,
    settings as unknown as EmailSettingsService,
    queue as unknown as EmailQueueService,
    templates as unknown as TemplatesService,
  );

  /** The raw token, as only the email holds it. */
  const tokenFromLastEmail = () => {
    const url = new URL(
      rendered.filter((r) => r.key === 'newsletter_confirm').at(-1)!.values
        .confirmUrl,
    );
    return url.searchParams.get('token')!;
  };

  return {
    service,
    subscribers,
    messages,
    queued,
    rendered,
    templates,
    tokenFromLastEmail,
  };
}

const SUBSCRIBE = {
  email: 'awa@example.com',
  consent: true,
  locale: 'fr' as const,
  source: 'footer' as const,
};

describe('NewsletterService', () => {
  const previous = process.env.EMAIL_ENCRYPTION_KEY;
  beforeEach(() => {
    process.env.EMAIL_ENCRYPTION_KEY = KEY;
  });
  afterAll(() => {
    process.env.EMAIL_ENCRYPTION_KEY = previous;
  });

  describe('subscribing', () => {
    it('creates a pending subscriber and sends a confirmation, never an active one', async () => {
      const { service, subscribers, queued } = setup();
      await service.subscribe(SUBSCRIBE);

      expect(subscribers).toHaveLength(1);
      expect(subscribers[0].status).toBe('PENDING');
      expect(queued.map((q) => q.kind)).toEqual(['newsletter_confirm']);
    });

    it('records the consent as worded by the server, not by the browser', async () => {
      const { service, subscribers } = setup();
      await service.subscribe({ ...SUBSCRIBE, locale: 'ar' });
      expect(subscribers[0].consentText).toMatch(/أوافق/);
      expect(subscribers[0].consentAt).toBeInstanceOf(Date);
    });

    it('stores only a hash of the confirmation token', async () => {
      const { service, subscribers, tokenFromLastEmail } = setup();
      await service.subscribe(SUBSCRIBE);
      const token = tokenFromLastEmail();

      expect(subscribers[0].confirmTokenHash).toBe(hashToken(token));
      expect(JSON.stringify(subscribers[0])).not.toContain(token);
    });

    it('ignores a form a bot filled in', async () => {
      const { service, subscribers, queued } = setup();
      await service.subscribe({ ...SUBSCRIBE, website: 'http://spam.example' });
      expect(subscribers).toHaveLength(0);
      expect(queued).toHaveLength(0);
    });

    it('sends nothing to an address that is already subscribed', async () => {
      // "You are already subscribed" by email would make the form a way to
      // mail anyone at will.
      const { service, subscribers, queued } = setup();
      subscribers.push({ id: 'a', email: 'awa@example.com', status: 'ACTIVE' });
      await service.subscribe(SUBSCRIBE);
      expect(queued).toHaveLength(0);
      expect(subscribers[0].status).toBe('ACTIVE');
    });

    it('does not resend a confirmation within ten minutes', async () => {
      const { service, subscribers, queued } = setup();
      subscribers.push({
        id: 'a',
        email: 'awa@example.com',
        status: 'PENDING',
        confirmSentAt: new Date(Date.now() - 60_000),
      });
      await service.subscribe(SUBSCRIBE);
      expect(queued).toHaveLength(0);
    });

    it('resends with a fresh token once the interval has passed', async () => {
      const { service, subscribers, queued } = setup();
      subscribers.push({
        id: 'a',
        email: 'awa@example.com',
        status: 'PENDING',
        confirmTokenHash: 'old',
        confirmSentAt: new Date(Date.now() - RESEND_INTERVAL_MS - 1000),
      });
      await service.subscribe(SUBSCRIBE);
      expect(queued).toHaveLength(1);
      expect(subscribers[0].confirmTokenHash).not.toBe('old');
    });

    it('puts someone who left back through confirmation, never straight to active', async () => {
      const { service, subscribers } = setup();
      subscribers.push({
        id: 'a',
        email: 'awa@example.com',
        status: 'UNSUBSCRIBED',
      });
      await service.subscribe(SUBSCRIBE);
      expect(subscribers[0].status).toBe('PENDING');
    });

    it('refuses when sending is not operational, so no request falls into a void', async () => {
      const { service } = setup({ available: false });
      await expect(service.subscribe(SUBSCRIBE)).rejects.toThrow();
    });

    it('is unavailable without the key that signs unsubscribe links', async () => {
      delete process.env.EMAIL_ENCRYPTION_KEY;
      expect(await setup().service.isAvailable()).toBe(false);
    });
  });

  describe('confirming', () => {
    it('activates the subscriber and spends the token', async () => {
      const { service, subscribers, tokenFromLastEmail } = setup();
      await service.subscribe(SUBSCRIBE);
      const token = tokenFromLastEmail();

      expect(await service.confirm(token)).toBe('confirmed');
      expect(subscribers[0].status).toBe('ACTIVE');
      expect(subscribers[0].confirmTokenHash).toBeNull();
      // Single use.
      expect(await service.confirm(token)).toBe('invalid');
    });

    it('says an expired link is expired, and confirms nothing', async () => {
      const { service, subscribers, tokenFromLastEmail } = setup();
      await service.subscribe(SUBSCRIBE);
      subscribers[0].confirmTokenExpiresAt = new Date(Date.now() - 1000);

      expect(await service.confirm(tokenFromLastEmail())).toBe('expired');
      expect(subscribers[0].status).toBe('PENDING');
    });

    it('treats a made-up token as invalid', async () => {
      expect(await setup().service.confirm('not-a-token')).toBe('invalid');
    });
  });

  describe('leaving', () => {
    it('refuses a token that was not signed for this subscriber', async () => {
      const { service, subscribers } = setup();
      subscribers.push({ id: 'a', email: 'a@example.com', status: 'ACTIVE' });
      expect(await service.unsubscribe('a', unsubscribeToken('b'))).toBe(false);
      expect(subscribers[0].status).toBe('ACTIVE');
    });

    it('unsubscribes, and cancels the campaign copies still waiting', async () => {
      const { service, subscribers, messages } = setup();
      subscribers.push({ id: 'a', email: 'a@example.com', status: 'ACTIVE' });
      messages.push({ subscriberId: 'a', status: 'PENDING' });

      expect(await service.unsubscribe('a', unsubscribeToken('a'))).toBe(true);
      expect(subscribers[0].status).toBe('UNSUBSCRIBED');
      expect(messages[0].status).toBe('CANCELLED');
    });

    it('is idempotent', async () => {
      const { service, subscribers } = setup();
      subscribers.push({
        id: 'a',
        email: 'a@example.com',
        status: 'UNSUBSCRIBED',
      });
      expect(await service.unsubscribe('a', unsubscribeToken('a'))).toBe(true);
    });

    it('offers both a page link and RFC 8058 one-click headers', async () => {
      const links = await setup().service.unsubscribeLinks(
        'a',
        'fr',
        'campaign-1',
      );
      expect(links.page).toMatch(
        /^https:\/\/ldslouga\.sn\/newsletter\/desinscription\?/,
      );
      expect(links.headers['List-Unsubscribe']).toMatch(
        /^<https:\/\/ldslouga\.sn\/api\/v1\/newsletter\/unsubscribe\/one-click\?/,
      );
      expect(links.headers['List-Unsubscribe-Post']).toBe(
        'List-Unsubscribe=One-Click',
      );
    });
  });

  describe('importing', () => {
    it('adds new addresses, and never touches one that exists, whatever its status', async () => {
      const { service, subscribers } = setup();
      subscribers.push({
        id: 'x',
        email: 'left@example.com',
        status: 'UNSUBSCRIBED',
      });

      const result = await service.import(
        [
          'email;langue',
          'new@example.com;ar',
          'left@example.com',
          'NEW@example.com',
          'not-an-address',
        ].join('\n'),
        'admin-1',
      );

      expect(result).toEqual({
        added: 1,
        existing: 1,
        invalid: 1,
        duplicates: 1,
      });
      expect(
        subscribers.find((row) => row.email === 'left@example.com')!.status,
      ).toBe('UNSUBSCRIBED');
      expect(
        subscribers.find((row) => row.email === 'new@example.com'),
      ).toMatchObject({
        status: 'ACTIVE',
        locale: 'ar',
        source: 'import',
      });
    });
  });
});

describe('unsubscribe tokens', () => {
  beforeEach(() => {
    process.env.EMAIL_ENCRYPTION_KEY = KEY;
  });

  it('verify only for the subscriber they were signed for', () => {
    expect(verifyUnsubscribeToken('a', unsubscribeToken('a'))).toBe(true);
    expect(verifyUnsubscribeToken('b', unsubscribeToken('a'))).toBe(false);
    expect(verifyUnsubscribeToken('a', 'x')).toBe(false);
    expect(verifyUnsubscribeToken('a', '')).toBe(false);
  });

  it('stop verifying when the key changes', () => {
    const token = unsubscribeToken('a');
    process.env.EMAIL_ENCRYPTION_KEY = 'a-completely-different-key-123456';
    expect(verifyUnsubscribeToken('a', token)).toBe(false);
  });
});

describe('csvCell', () => {
  it('defuses a value a spreadsheet would run as a formula', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe(
      `"'=HYPERLINK(""http://x"")"`,
    );
    expect(csvCell('+33')).toBe(`"'+33"`);
    expect(csvCell('awa@example.com')).toBe('"awa@example.com"');
  });
});
