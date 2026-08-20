import * as bcrypt from 'bcrypt';

export const SEED_PASSWORD = 'Password123!';

export const USERS: any[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'super@lds.test',
    passwordHash: bcrypt.hashSync(SEED_PASSWORD, 4),
    firstName: 'Super',
    lastName: 'Admin',
    role: 'SUPER_ADMIN',
    isActive: true,
    mustChangePassword: false,
    lastLoginAt: null,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'editor@lds.test',
    passwordHash: bcrypt.hashSync(SEED_PASSWORD, 4),
    firstName: 'Edith',
    lastName: 'Editor',
    role: 'EDITOR',
    isActive: true,
    mustChangePassword: false,
    lastLoginAt: null,
  },
];

export const FAKE_FILE_BYTES = Buffer.from('fake-png-binary-content');

const MEDIA = [
  {
    id: '33333333-3333-4333-8333-333333333333',
    originalName: 'photo.png',
    storageKey: 'news/abc.png',
    bucket: 'lds-media',
    folder: 'news',
    mimeType: 'image/png',
    size: FAKE_FILE_BYTES.length,
    width: 800,
    height: 600,
    altText: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
];

const MISSIONS = [
  {
    id: '44444444-4444-4444-8444-444444444444',
    title: { fr: 'Éducation' },
    description: { fr: 'Kits scolaires' },
    icon: 'GraduationCap',
    order: 0,
    isPublished: true,
    imageId: MEDIA[0].id,
    image: MEDIA[0],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    title: { fr: 'Brouillon' },
    description: { fr: 'Non publié' },
    icon: null,
    order: 1,
    isPublished: false,
    imageId: null,
    image: null,
    createdAt: new Date('2026-01-02'),
    updatedAt: new Date('2026-01-02'),
  },
];

/** Minimal in-memory stand-in for PrismaService, enough to exercise the HTTP layer. */
export function createFakePrisma() {
  /** Applies a Prisma `select` projection, so over-fetching shows up in tests. */
  const project = (row: any, select?: Record<string, boolean>) => {
    if (!row || !select) return row;
    const keys = Object.keys(select).filter((k) => select[k]);
    return Object.fromEntries(keys.filter((k) => k in row).map((k) => [k, row[k]]));
  };

  const table = (rows: any[]) => ({
    findMany: jest.fn(async ({ where, select }: any = {}) => {
      const filtered = where?.isPublished === true ? rows.filter((r) => r.isPublished) : rows;
      return filtered.map((r) => project(r, select));
    }),
    findUnique: jest.fn(async ({ where, select }: any) =>
      project(rows.find((r) => r.id === where.id) ?? null, select),
    ),
    findFirst: jest.fn(async ({ where }: any = {}) => {
      if (where?.id) return rows.find((r) => r.id === where.id) ?? null;
      return rows[0] ?? null;
    }),
    create: jest.fn(async ({ data, select }: any) => project({ id: 'created', ...data }, select)),
    update: jest.fn(async ({ where, data, select }: any) =>
      project({ ...rows.find((r) => r.id === where.id), ...data }, select),
    ),
    upsert: jest.fn(async ({ where, create, update }: any) => {
      const existing = rows.find((r) => r.id === where.id || r.key === where.key);
      return existing ? { ...existing, ...update } : { id: 'created', ...create };
    }),
    delete: jest.fn(async () => ({})),
    updateMany: jest.fn(async () => ({ count: 0 })),
    count: jest.fn(async ({ where }: any = {}) =>
      where?.isPublished === true ? rows.filter((r) => r.isPublished).length : rows.length,
    ),
    groupBy: jest.fn(async () => []),
    aggregate: jest.fn(async () => ({ _sum: { size: 0 } })),
  });

  const prisma: any = {
    user: {
      ...table(USERS),
      // Email/id lookup, still honouring `select` when the caller passes one.
      findUnique: jest.fn(async ({ where, select }: any) => {
        const row = USERS.find((u) => u.id === where.id || u.email === where.email) ?? null;
        if (!row || !select) return row;
        const keys = Object.keys(select).filter((k) => select[k]);
        return Object.fromEntries(keys.filter((k) => k in row).map((k) => [k, row[k]]));
      }),
      update: jest.fn(async ({ where, data, select }: any) => {
        const row = { ...USERS.find((u) => u.id === where.id), ...data };
        if (!select) return row;
        const keys = Object.keys(select).filter((k) => select[k]);
        return Object.fromEntries(keys.filter((k) => k in row).map((k) => [k, row[k]]));
      }),
    },
    mission: table(MISSIONS),
    news: table([]),
    newsCategory: table([]),
    galleryAlbum: table([]),
    galleryImage: table([]),
    partner: table([]),
    impactStatistic: table([]),
    donationMethod: table([]),
    media: table(MEDIA),
    contactMessage: table([]),
    navigationItem: table([]),
    siteSettings: table([]),
    auditLog: table([]),
    $transaction: jest.fn(async (ops: any) =>
      typeof ops === 'function' ? ops(prisma) : Promise.all(ops),
    ),
    $queryRaw: jest.fn(async () => [{ '?column?': 1 }]),
    $connect: jest.fn(async () => undefined),
    $disconnect: jest.fn(async () => undefined),
    onModuleInit: jest.fn(async () => undefined),
    onModuleDestroy: jest.fn(async () => undefined),
  };

  return prisma;
}

export function createFakeMinio() {
  // Objects are kept in memory so a streamed file really is the uploaded one and
  // its length matches the Content-Length the controller advertises.
  const objects = new Map<string, Buffer>();

  return {
    bucketName: 'lds-media',
    onModuleInit: jest.fn(async () => undefined),
    uploadFile: jest.fn(async (buffer: Buffer, key: string) => {
      objects.set(key, buffer);
    }),
    deleteFile: jest.fn(async (key: string) => {
      objects.delete(key);
    }),
    getFileStream: jest.fn(async (key: string) => {
      const { Readable } = require('stream');
      return Readable.from([objects.get(key) ?? FAKE_FILE_BYTES]);
    }),
    healthCheck: jest.fn(async () => true),
  };
}
