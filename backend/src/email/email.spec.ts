import { Prisma, type EmailMessage } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { EmailSettingsService } from './email-settings.service';
import {
  EmailQueueService,
  ACK_TTL_MS,
  BACKOFF_MS,
  MAX_ATTEMPTS,
} from './email-queue.service';
import { ContactMailService, firstNameOf } from './contact-mail.service';
import { seal } from './secret-box';
import type { TransportService } from './transport.service';
import type { TemplatesService } from './templates.service';

const KEY = 'test-key-that-is-long-enough-for-aes';

/* ------------------------------------------------------------------ fakes */

/** One settings row and a list of messages, which is all these services touch. */
function fakePrisma(
  initial: { settings?: Record<string, unknown> | null } = {},
) {
  let settings: Record<string, any> | null = initial.settings ?? null;
  const messages: EmailMessage[] = [];

  const prisma = {
    emailSettings: {
      findUnique: jest.fn(() => Promise.resolve(settings)),
      upsert: jest.fn(({ create, update }: any) => {
        settings = settings ? { ...settings, ...update } : { ...create };
        return Promise.resolve(settings);
      }),
    },
    emailMessage: {
      create: jest.fn(({ data }: any) => {
        if (
          data.contactMessageId &&
          messages.some(
            (m) =>
              m.contactMessageId === data.contactMessageId &&
              m.kind === data.kind,
          )
        ) {
          return Promise.reject(
            new Prisma.PrismaClientKnownRequestError('Unique constraint', {
              code: 'P2002',
              clientVersion: 'test',
            }),
          );
        }
        const row = {
          id: `m${messages.length + 1}`,
          status: 'PENDING',
          attempts: 0,
          lockedAt: null,
          error: null,
          sentAt: null,
          nextAttemptAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          contactMessageId: null,
          ...data,
        } as EmailMessage;
        messages.push(row);
        return Promise.resolve(row);
      }),
      update: jest.fn(({ where, data }: any) => {
        const row = messages.find((m) => m.id === where.id)!;
        Object.assign(row, data);
        return Promise.resolve(row);
      }),
      updateMany: jest.fn(({ where, data }: any) => {
        const rows = messages.filter(
          (m) =>
            (!where.id || m.id === where.id) &&
            (!where.status || m.status === where.status) &&
            (!where.lockedAt || (m.lockedAt && m.lockedAt < where.lockedAt.lt)),
        );
        rows.forEach((row) => Object.assign(row, data));
        return Promise.resolve({ count: rows.length });
      }),
      findUnique: jest.fn(({ where }: any) =>
        Promise.resolve(messages.find((m) => m.id === where.id) ?? null),
      ),
    },
    $queryRaw: jest.fn(() => Promise.resolve([])),
  };

  return { prisma: prisma as unknown as PrismaService, messages, raw: prisma };
}

const CONFIGURED = {
  id: 'default',
  enabled: true,
  host: 'smtp.example.com',
  port: 587,
  security: 'starttls',
  username: 'contact@ldslouga.sn',
  passwordCipher: null,
  fromName: 'Louga Développement Solidaire',
  fromEmail: 'contact@ldslouga.sn',
  replyToName: null,
  replyToEmail: null,
  contactInbox: 'equipe@ldslouga.sn',
  adminInbox: null,
  identities: null,
  batchSize: 20,
  ratePerMinute: 6000,
  siteUrl: 'https://ldslouga.sn',
  signature: null,
  privacyPolicyUrl: null,
  lastTestAt: null,
  lastTestOk: true,
  lastTestError: null,
};

const RENDERED = { subject: 'Sujet', html: '<p>Corps</p>', text: 'Corps' };

function smtpError(responseCode?: number, code?: string) {
  return Object.assign(new Error(`SMTP ${responseCode ?? code}`), {
    responseCode,
    code,
  });
}

/* --------------------------------------------------------------- settings */

describe('EmailSettingsService', () => {
  const previous = process.env.EMAIL_ENCRYPTION_KEY;
  beforeEach(() => {
    process.env.EMAIL_ENCRYPTION_KEY = KEY;
  });
  afterAll(() => {
    process.env.EMAIL_ENCRYPTION_KEY = previous;
  });

  it('never returns the password, only whether there is one', async () => {
    const { prisma } = fakePrisma();
    const service = new EmailSettingsService(prisma);

    const saved = await service.update({ ...minimal(), password: 'hunter22' });

    expect(saved.hasPassword).toBe(true);
    expect(JSON.stringify(saved)).not.toContain('hunter22');
    expect(saved).not.toHaveProperty('password');
    expect(saved).not.toHaveProperty('passwordCipher');
  });

  it('stores the password encrypted, and only the transport can read it', async () => {
    const { prisma, raw } = fakePrisma();
    const service = new EmailSettingsService(prisma);
    await service.update({ ...minimal(), password: 'hunter22' });

    const stored =
      raw.emailSettings.upsert.mock.calls[0][0].create.passwordCipher;
    expect(stored).not.toContain('hunter22');
    expect((await service.transportConfig())?.password).toBe('hunter22');
  });

  it('keeps the stored password when the form sends none', async () => {
    // The form never receives the current password, so "unchanged" has to be
    // expressible without sending it back.
    const { prisma } = fakePrisma();
    const service = new EmailSettingsService(prisma);
    await service.update({ ...minimal(), password: 'hunter22' });
    await service.update({ fromName: 'Équipe LDS' });

    expect((await service.transportConfig())?.password).toBe('hunter22');
  });

  it('removes the password when the form sends an empty one', async () => {
    const { prisma } = fakePrisma();
    const service = new EmailSettingsService(prisma);
    await service.update({ ...minimal(), password: 'hunter22' });
    const saved = await service.update({ password: '' });

    expect(saved.hasPassword).toBe(false);
  });

  it('refuses to store a password in clear when no key is configured', async () => {
    delete process.env.EMAIL_ENCRYPTION_KEY;
    const service = new EmailSettingsService(fakePrisma().prisma);
    await expect(
      service.update({ ...minimal(), password: 'hunter22' }),
    ).rejects.toThrow(/EMAIL_ENCRYPTION_KEY/);
  });

  it('refuses to switch sending on without a server and a sender', async () => {
    // A visitor would be promised an acknowledgement that can never leave.
    const service = new EmailSettingsService(fakePrisma().prisma);
    await expect(service.update({ enabled: true })).rejects.toThrow();
  });

  it('refuses an address that would break or inject a header', async () => {
    const service = new EmailSettingsService(fakePrisma().prisma);
    await expect(
      service.update({
        ...minimal(),
        fromEmail: 'x@example.com\r\nBcc: y@z.com',
      }),
    ).rejects.toThrow();
    await expect(
      service.update({ ...minimal(), fromName: 'LDS\r\nBcc: y@z.com' }),
    ).rejects.toThrow();
    await expect(
      service.update({ ...minimal(), contactInbox: 'pas-une-adresse' }),
    ).rejects.toThrow();
  });

  it('forgets the last test when the connection settings change', async () => {
    const { prisma } = fakePrisma({
      settings: { ...CONFIGURED, lastTestOk: true },
    });
    const saved = await new EmailSettingsService(prisma).update({
      host: 'smtp.other.com',
    });
    expect(saved.lastTestOk).toBeNull();
  });

  it('warns about a sender on another domain than the SMTP account', async () => {
    const { prisma } = fakePrisma({
      settings: { ...CONFIGURED, fromEmail: 'lougasolidaire@gmail.com' },
    });
    const { warnings } = await new EmailSettingsService(prisma).get();
    expect(warnings.join(' ')).toMatch(/même domaine/);
    expect(warnings.join(' ')).toMatch(/DMARC/);
  });

  it('resolves the sender: purpose first, then global, then the SMTP login', async () => {
    const { prisma } = fakePrisma({
      settings: {
        ...CONFIGURED,
        identities: { newsletter: { fromName: 'Actualités LDS' } },
      },
    });
    const service = new EmailSettingsService(prisma);

    expect((await service.identityFor('newsletter')).fromName).toBe(
      'Actualités LDS',
    );
    expect((await service.identityFor('newsletter')).fromEmail).toBe(
      'contact@ldslouga.sn',
    );
    expect((await service.identityFor('contact')).fromName).toBe(
      'Louga Développement Solidaire',
    );
  });

  function minimal() {
    return {
      host: 'smtp.example.com',
      port: 587,
      username: 'contact@ldslouga.sn',
      fromEmail: 'contact@ldslouga.sn',
    };
  }
});

/* ------------------------------------------------------------------ queue */

describe('EmailQueueService', () => {
  function setup(settings: Record<string, unknown> | null = CONFIGURED) {
    const fake = fakePrisma({ settings });
    const transport = {
      send: jest.fn(() => Promise.resolve({ messageId: 'x' })),
    };
    const settingsService = new EmailSettingsService(fake.prisma);
    const queue = new EmailQueueService(
      fake.prisma,
      settingsService,
      transport as unknown as TransportService,
    );
    return { ...fake, transport, queue };
  }

  const enqueue = (
    queue: EmailQueueService,
    contactMessageId: string | null = null,
  ) =>
    queue.enqueue({
      kind: 'contact_ack',
      purpose: 'contact',
      to: 'visiteur@example.com',
      email: RENDERED,
      contactMessageId,
    });

  it('stores one acknowledgement per contact request, whatever happens upstream', async () => {
    // A retried POST, a double click: the second call must not queue a second email.
    const { queue, messages } = setup();
    await enqueue(queue, 'contact-1');
    const second = await enqueue(queue, 'contact-1');

    expect(second).toBeNull();
    expect(messages).toHaveLength(1);
  });

  it('queues nothing before email has ever been configured', async () => {
    const { queue, messages } = setup(null);
    expect(await enqueue(queue, 'contact-1')).toBeNull();
    expect(messages).toHaveLength(0);
  });

  it('marks a message sent once the SMTP server has accepted it', async () => {
    const { queue, messages } = setup();
    const message = (await enqueue(queue))!;
    message.attempts = 1;

    await queue.deliver(message);

    expect(messages[0].status).toBe('SENT');
    expect(messages[0].sentAt).toBeInstanceOf(Date);
  });

  it('retries a temporary failure later, not immediately', async () => {
    const { queue, messages, transport } = setup();
    transport.send.mockRejectedValueOnce(smtpError(421));
    const message = (await enqueue(queue))!;
    message.attempts = 1;

    const before = Date.now();
    await queue.deliver(message);

    expect(messages[0].status).toBe('PENDING');
    expect(messages[0].nextAttemptAt.getTime()).toBeGreaterThanOrEqual(
      before + BACKOFF_MS[0],
    );
  });

  it('does not retry a permanent rejection', async () => {
    // Retrying a 5xx only teaches the provider that this account sends junk.
    const { queue, messages, transport } = setup();
    transport.send.mockRejectedValueOnce(smtpError(550));
    const message = (await enqueue(queue))!;
    message.attempts = 1;

    await queue.deliver(message);
    expect(messages[0].status).toBe('FAILED');
  });

  it('gives up after the last attempt instead of retrying forever', async () => {
    const { queue, messages, transport } = setup();
    transport.send.mockRejectedValueOnce(smtpError(421));
    const message = (await enqueue(queue))!;
    message.attempts = MAX_ATTEMPTS;

    await queue.deliver(message);
    expect(messages[0].status).toBe('FAILED');
  });

  it('never records the password in the error it keeps', async () => {
    process.env.EMAIL_ENCRYPTION_KEY = KEY;
    const { queue, messages, transport } = setup({
      ...CONFIGURED,
      passwordCipher: seal('hunter22'),
    });
    // Some providers quote the credentials they rejected.
    transport.send.mockRejectedValueOnce(
      Object.assign(new Error('535 Invalid login: hunter22'), {
        responseCode: 535,
      }),
    );
    const message = (await enqueue(queue))!;
    message.attempts = 1;

    await queue.deliver(message);

    expect(messages[0].status).toBe('FAILED');
    expect(messages[0].error).not.toContain('hunter22');
  });

  it('cancels an acknowledgement that has become too old to be useful', async () => {
    const { queue, messages, transport } = setup();
    const message = (await enqueue(queue))!;
    message.createdAt = new Date(Date.now() - ACK_TTL_MS - 1000);

    await queue.deliver(message);

    expect(transport.send).not.toHaveBeenCalled();
    expect(messages[0].status).toBe('CANCELLED');
  });

  it('claims nothing while sending is switched off, and loses nothing', async () => {
    const { queue, raw, messages } = setup({ ...CONFIGURED, enabled: false });
    await enqueue(queue);

    expect(await queue.processBatch()).toBe(0);
    expect(raw.$queryRaw).not.toHaveBeenCalled();
    expect(messages[0].status).toBe('PENDING');
  });

  it('does not resend a message a crashed worker may already have delivered', async () => {
    // The process may have died after the SMTP server accepted it. Sending it
    // again risks a duplicate; it is surfaced instead.
    const { queue, messages } = setup();
    const message = (await enqueue(queue))!;
    message.status = 'SENDING';
    message.lockedAt = new Date(Date.now() - 60 * 60_000);

    await queue.releaseStale();

    expect(messages[0].status).toBe('FAILED');
    expect(messages[0].error).toMatch(/doublon/);
  });

  it('retries a failed message on request, with a fresh schedule', async () => {
    const { queue, messages } = setup();
    const message = (await enqueue(queue))!;
    Object.assign(message, { status: 'FAILED', attempts: MAX_ATTEMPTS });

    await queue.retry(message.id);
    expect(messages[0]).toMatchObject({ status: 'PENDING', attempts: 0 });
  });

  it('will not retry a message that was sent', async () => {
    const { queue } = setup();
    const message = (await enqueue(queue))!;
    message.status = 'SENT';
    await expect(queue.retry(message.id)).rejects.toThrow();
  });

  it('only cancels what has not been sent yet', async () => {
    const { queue } = setup();
    const message = (await enqueue(queue))!;
    message.status = 'SENT';
    await expect(queue.cancel(message.id)).rejects.toThrow();
  });
});

/* ---------------------------------------------------------------- contact */

describe('ContactMailService', () => {
  const CONTACT = {
    id: 'contact-1',
    name: 'Awa Diop',
    email: 'awa@example.com',
    subject: 'Bénévolat',
    message: 'Bonjour, je souhaite aider.',
    isRead: false,
    readAt: null,
    createdAt: new Date('2026-10-09T10:00:00Z'),
  };

  function setup(
    settings: Record<string, unknown> = CONFIGURED,
    active = true,
  ) {
    const fake = fakePrisma({ settings });
    const settingsService = new EmailSettingsService(fake.prisma);
    const queue = new EmailQueueService(
      fake.prisma,
      settingsService,
      {} as TransportService,
    );
    const templates = {
      get: jest.fn(() => Promise.resolve({ isActive: active })),
      render: jest.fn(() => Promise.resolve(RENDERED)),
      siteValues: jest.fn(() =>
        Promise.resolve({
          siteName: 'LDS',
          siteUrl: 'https://ldslouga.sn',
          address: null,
          logoUrl: null,
        }),
      ),
    };
    const service = new ContactMailService(
      settingsService,
      queue,
      templates as unknown as TemplatesService,
    );
    return { ...fake, service, templates };
  }

  it('queues an acknowledgement for the visitor and a notification for the team', async () => {
    const { service, messages } = setup();
    await service.onReceived(CONTACT);

    expect(messages.map((m) => m.kind).sort()).toEqual([
      'contact_ack',
      'contact_notify',
    ]);
    expect(messages.find((m) => m.kind === 'contact_ack')!.toEmail).toBe(
      'awa@example.com',
    );
    expect(messages.find((m) => m.kind === 'contact_notify')!.toEmail).toBe(
      'equipe@ldslouga.sn',
    );
  });

  it('lets the team reply to the notification straight to the visitor', async () => {
    const { service, messages } = setup();
    await service.onReceived(CONTACT);
    expect(messages.find((m) => m.kind === 'contact_notify')!.replyTo).toBe(
      'awa@example.com',
    );
  });

  it('answers in the language the visitor was reading, and notifies the team in French', async () => {
    const { service, templates } = setup();
    await service.onReceived(CONTACT, 'ar');

    const calls = templates.render.mock.calls as unknown as Array<
      [string, string]
    >;
    expect(calls.find(([key]) => key === 'contact_ack')![1]).toBe('ar');
    expect(calls.find(([key]) => key === 'contact_notify')![1]).toBe('fr');
  });

  it('notifies nobody when no inbox is configured, and still acknowledges', async () => {
    const { service, messages } = setup({ ...CONFIGURED, contactInbox: null });
    await service.onReceived(CONTACT);
    expect(messages.map((m) => m.kind)).toEqual(['contact_ack']);
  });

  it('sends nothing for a template that has been switched off', async () => {
    const { service, messages } = setup(CONFIGURED, false);
    await service.onReceived(CONTACT);
    expect(messages).toHaveLength(0);
  });

  it('never throws, so an email problem cannot fail the visitor’s request', async () => {
    const { service, templates } = setup();
    templates.render.mockRejectedValue(new Error('template broken'));
    await expect(service.onReceived(CONTACT)).resolves.toBeUndefined();
  });

  it('greets by the first word of the name, or the whole name if it is one word', () => {
    expect(firstNameOf('Awa Diop')).toBe('Awa');
    expect(firstNameOf('  Moussa  ')).toBe('Moussa');
  });
});
