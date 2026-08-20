import request from 'supertest';
import { bootTestApp, type TestContext } from './setup-app';

describe('Authorization (e2e)', () => {
  let ctx: TestContext;
  let http: any;

  beforeAll(async () => {
    ctx = await bootTestApp();
    http = ctx.http;
  });

  afterAll(async () => {
    await ctx.app?.close();
  });

  const WRITE_ENDPOINTS: Array<[string, string]> = [
    ['post', '/api/v1/missions'],
    ['post', '/api/v1/news'],
    ['post', '/api/v1/news/categories'],
    ['post', '/api/v1/partners'],
    ['post', '/api/v1/impact'],
    ['post', '/api/v1/gallery'],
    ['post', '/api/v1/donations'],
    ['post', '/api/v1/navigation'],
    ['post', '/api/v1/users'],
    ['post', '/api/v1/media/upload'],
  ];

  it.each(WRITE_ENDPOINTS)('refuses anonymous %s %s', (method, url) =>
    (request(http) as any)[method](url).send({}).expect(401),
  );

  const ADMIN_READS = [
    '/api/v1/users',
    '/api/v1/contact',
    '/api/v1/audit',
    '/api/v1/media',
    '/api/v1/dashboard/stats',
    '/api/v1/dashboard/overview',
  ];

  it.each(ADMIN_READS)('refuses anonymous reads of %s', (url) =>
    request(http).get(url).expect(401),
  );

  it('blocks an EDITOR from listing user accounts', () =>
    request(http)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${ctx.editorToken}`)
      .expect(403));

  it('blocks an EDITOR from reading the audit log', () =>
    request(http)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${ctx.editorToken}`)
      .expect(403));

  it('blocks an EDITOR from changing site settings', () =>
    request(http)
      .patch('/api/v1/settings/global_contact')
      .set('Authorization', `Bearer ${ctx.editorToken}`)
      .send({ value: { email: 'x@y.z' } })
      .expect(403));

  it('blocks an EDITOR from reading contact messages', () =>
    request(http)
      .get('/api/v1/contact')
      .set('Authorization', `Bearer ${ctx.editorToken}`)
      .expect(403));

  it('lets an EDITOR manage day-to-day content', () =>
    request(http)
      .post('/api/v1/missions')
      .set('Authorization', `Bearer ${ctx.editorToken}`)
      .send({ title: { fr: 'Nouvelle mission' }, description: { fr: 'Description' } })
      .expect(201));

  it('lets a SUPER_ADMIN read the user list without leaking hashes', () =>
    request(http)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${ctx.superAdminToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(JSON.stringify(body)).not.toContain('passwordHash');
      }));

  it('lets a SUPER_ADMIN change site settings', () =>
    request(http)
      .patch('/api/v1/settings/global_contact')
      .set('Authorization', `Bearer ${ctx.superAdminToken}`)
      .send({ value: { email: 'contact@lds.test' } })
      .expect(200));
});
