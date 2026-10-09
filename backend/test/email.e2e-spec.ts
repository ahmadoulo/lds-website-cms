import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { MinioService } from './../src/common/minio.service';
import { createFakeMinio } from './fake-prisma';
import { ADMIN, SEED_PASSWORD, createStatefulPrisma } from './stateful-prisma';
import { bootTestApp, type TestContext } from './setup-app';

const EMAIL_ENDPOINTS: Array<[string, string]> = [
  ['get', '/api/v1/email/overview'],
  ['get', '/api/v1/email/settings'],
  ['put', '/api/v1/email/settings'],
  ['post', '/api/v1/email/settings/verify'],
  ['post', '/api/v1/email/settings/test'],
  ['get', '/api/v1/email/templates'],
  ['put', '/api/v1/email/templates/contact_ack'],
  ['get', '/api/v1/email/messages'],
];

describe('Email — who may touch it (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await bootTestApp();
  });
  afterAll(async () => {
    await ctx.app?.close();
  });

  it.each(EMAIL_ENDPOINTS)('refuses anonymous %s %s', (method, url) =>
    (request(ctx.http) as any)[method](url).send({}).expect(401),
  );

  it.each(EMAIL_ENDPOINTS)('refuses an EDITOR on %s %s', (method, url) =>
    (request(ctx.http) as any)
      [method](url)
      .set('Authorization', `Bearer ${ctx.editorToken}`)
      .send({})
      .expect(403),
  );
});

describe('Email — the contact flow and its secrets (e2e)', () => {
  let app: INestApplication;
  let http: any;
  let prisma: any;
  let token: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'email-access-secret';
    process.env.JWT_REFRESH_SECRET = 'email-refresh-secret';
    process.env.PUBLIC_API_URL = 'http://api.test';
    process.env.EMAIL_ENCRYPTION_KEY = 'email-e2e-key-long-enough-for-aes';

    prisma = createStatefulPrisma();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(MinioService)
      .useValue(createFakeMinio())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
    http = app.getHttpServer();

    const login = await request(http)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN.email, password: SEED_PASSWORD })
      .expect(200);
    token = login.body.access_token;
  });

  afterAll(async () => {
    await app?.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  const configure = () =>
    request(http)
      .put('/api/v1/email/settings')
      .set(auth())
      .send({
        host: 'smtp.example.com',
        port: 587,
        security: 'starttls',
        username: 'contact@ldslouga.sn',
        password: 'hunter22-e2e',
        fromName: 'Louga Développement Solidaire',
        fromEmail: 'contact@ldslouga.sn',
        contactInbox: 'equipe@ldslouga.sn',
      })
      .expect(200);

  it('never returns the SMTP password, in any form', async () => {
    const saved = await configure();
    const read = await request(http)
      .get('/api/v1/email/settings')
      .set(auth())
      .expect(200);

    for (const body of [saved.body, read.body]) {
      expect(body.hasPassword).toBe(true);
      expect(JSON.stringify(body)).not.toContain('hunter22-e2e');
      expect(body).not.toHaveProperty('password');
      expect(body).not.toHaveProperty('passwordCipher');
    }
  });

  it('keeps the SMTP configuration out of the public settings', async () => {
    // GET /public/settings serves every SiteSettings key to anyone. That is why
    // email has a table of its own: none of this may appear there.
    const pub = await request(http).get('/api/v1/public/settings').expect(200);
    const text = JSON.stringify(pub.body);

    for (const leak of [
      'smtp.example.com',
      'equipe@ldslouga.sn',
      'hunter22-e2e',
      'passwordCipher',
    ]) {
      expect(text).not.toContain(leak);
    }
  });

  it('stores the request, answers at once, and queues both emails', async () => {
    const response = await request(http)
      .post('/api/v1/contact')
      .send({
        name: 'Awa Diop',
        email: 'awa@example.com',
        subject: 'Bénévolat',
        message: 'Bonjour, je souhaite devenir bénévole.',
        locale: 'ar',
      })
      .expect(201);

    expect(response.body.success).toBe(true);

    const stored = prisma.__store.contactMessage.find(
      (row: any) => row.email === 'awa@example.com',
    );
    expect(stored).toBeDefined();
    // The language decided the acknowledgement; it is not a column of the message.
    expect(stored).not.toHaveProperty('locale');

    const queued = prisma.__store.emailMessage.filter(
      (row: any) => row.contactMessageId === stored.id,
    );
    expect(queued.map((row: any) => row.kind).sort()).toEqual([
      'contact_ack',
      'contact_notify',
    ]);

    const ack = queued.find((row: any) => row.kind === 'contact_ack');
    expect(ack).toMatchObject({
      toEmail: 'awa@example.com',
      locale: 'ar',
      status: 'PENDING',
    });

    const notify = queued.find((row: any) => row.kind === 'contact_notify');
    expect(notify).toMatchObject({
      toEmail: 'equipe@ldslouga.sn',
      replyTo: 'awa@example.com',
    });
  });

  it('escapes what the visitor typed before it reaches the team', async () => {
    await request(http)
      .post('/api/v1/contact')
      .send({
        name: 'Test <img src=x onerror=alert(1)>',
        email: 'xss@example.com',
        subject: 'Sujet',
        message: '<script>alert(document.cookie)</script> bonjour',
      })
      .expect(201);

    const stored = prisma.__store.contactMessage.find(
      (row: any) => row.email === 'xss@example.com',
    );
    const notify = prisma.__store.emailMessage.find(
      (row: any) =>
        row.contactMessageId === stored.id && row.kind === 'contact_notify',
    );

    expect(notify.html).not.toContain('<script>');
    expect(notify.html).not.toContain('<img src=x');
    expect(notify.html).toContain('&lt;script&gt;');
  });

  it('refuses a language it does not publish', () =>
    request(http)
      .post('/api/v1/contact')
      .send({
        name: 'Awa Diop',
        email: 'awa2@example.com',
        subject: 'Sujet',
        message: 'Un message assez long.',
        locale: 'en',
      })
      .expect(400));

  it('still accepts the request from a client that sends no language', () =>
    request(http)
      .post('/api/v1/contact')
      .send({
        name: 'Awa Diop',
        email: 'awa3@example.com',
        subject: 'Sujet',
        message: 'Un message assez long.',
      })
      .expect(201));

  it('shows the queued emails in the history, without their bodies', async () => {
    const history = await request(http)
      .get('/api/v1/email/messages')
      .set(auth())
      .expect(200);
    expect(history.body.data.length).toBeGreaterThan(0);
    // A visitor's own words quoted back to the team do not belong in a list.
    for (const row of history.body.data) {
      expect(row).not.toHaveProperty('html');
      expect(row).not.toHaveProperty('text');
    }
  });

  it('lists the templates with their variables', async () => {
    const templates = await request(http)
      .get('/api/v1/email/templates')
      .set(auth())
      .expect(200);
    const ack = templates.body.find((t: any) => t.key === 'contact_ack');
    expect(ack.variables).toHaveProperty('firstName');
    expect(ack.subject.fr).toContain('Nous avons bien reçu votre message');
  });

  it('keeps the Arabic when only the French is edited', async () => {
    const before = await request(http)
      .get('/api/v1/email/templates/contact_ack')
      .set(auth());
    await request(http)
      .put('/api/v1/email/templates/contact_ack')
      .set(auth())
      .send({ subject: { fr: 'Merci pour votre message — LDS' } })
      .expect(200);
    const after = await request(http)
      .get('/api/v1/email/templates/contact_ack')
      .set(auth());

    expect(after.body.subject.fr).toBe('Merci pour votre message — LDS');
    expect(after.body.subject.ar).toBe(before.body.subject.ar);
  });

  it('refuses a subject that would inject a header', () =>
    request(http)
      .put('/api/v1/email/templates/contact_ack')
      .set(auth())
      .send({ subject: { fr: 'Bonjour\r\nBcc: everyone@example.com' } })
      .expect(400));

  it('records who changed the SMTP settings, never what the password became', async () => {
    const entries = prisma.__store.auditLog.filter(
      (row: any) => row.resource === 'EmailSettings',
    );
    expect(entries.length).toBeGreaterThan(0);
    expect(JSON.stringify(entries)).not.toContain('hunter22-e2e');
    expect(entries[0].metadata.passwordChanged).toBe(true);
  });
});
