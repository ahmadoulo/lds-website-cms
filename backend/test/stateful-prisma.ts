import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

export const SEED_PASSWORD = 'Password123!';

export const ADMIN = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'super@lds.test',
  passwordHash: bcrypt.hashSync(SEED_PASSWORD, 4),
  firstName: 'Super',
  lastName: 'Admin',
  role: 'SUPER_ADMIN',
  isActive: true,
  mustChangePassword: false,
  lastLoginAt: null,
};

const TABLES = [
  'user',
  'mission',
  'news',
  'newsCategory',
  'media',
  'galleryAlbum',
  'galleryImage',
  'partner',
  'impactStatistic',
  'donationMethod',
  'contactMessage',
  'navigationItem',
  'siteSettings',
  'auditLog',
] as const;

function matches(row: any, where: any): boolean {
  if (!where) return true;

  return Object.entries(where).every(([key, condition]: [string, any]) => {
    if (key === 'AND') return (condition as any[]).every((c) => matches(row, c));
    if (key === 'OR') return (condition as any[]).some((c) => matches(row, c));
    if (key === 'NOT') return !matches(row, condition);

    if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
      if ('in' in condition) return (condition.in as any[]).includes(row[key]);
      if ('contains' in condition) {
        return String(row[key] ?? '')
          .toLowerCase()
          .includes(String(condition.contains).toLowerCase());
      }
      if ('path' in condition && 'string_contains' in condition) {
        const value = (condition.path as string[]).reduce(
          (acc: any, segment: string) => acc?.[segment],
          row[key],
        );
        return String(value ?? '')
          .toLowerCase()
          .includes(String(condition.string_contains).toLowerCase());
      }
      // A relation filter, e.g. { album: { isPublished: true } }
      return matches(row[key] ?? {}, condition);
    }

    return row[key] === condition;
  });
}

function sortRows(rows: any[], orderBy: any) {
  const clauses = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];

  return [...rows].sort((a, b) => {
    for (const clause of clauses) {
      const [field, direction] = Object.entries(clause)[0] as [string, string];
      const left = a[field];
      const right = b[field];
      if (left === right) continue;
      if (left === null || left === undefined) return 1;
      if (right === null || right === undefined) return -1;
      return (left > right ? 1 : -1) * (direction === 'desc' ? -1 : 1);
    }
    return 0;
  });
}

/** Column defaults declared with @default() in schema.prisma. */
const COLUMN_DEFAULTS: Record<string, Record<string, unknown>> = {
  user: { isActive: true, mustChangePassword: true, role: 'EDITOR', lastLoginAt: null },
  mission: { order: 0, isPublished: false },
  news: { isPublished: false, publishedAt: null },
  media: { folder: 'general' },
  galleryAlbum: { order: 0, isPublished: false },
  galleryImage: { order: 0 },
  partner: { order: 0, isPublished: true },
  impactStatistic: { order: 0, isPublished: true },
  donationMethod: { order: 0, isPublished: true },
  contactMessage: { isRead: false, readAt: null },
  navigationItem: { order: 0, parentId: null },
};

function applyDefaults(table: string, data: any) {
  return { ...(COLUMN_DEFAULTS[table] ?? {}), ...data };
}

function project(row: any, select?: Record<string, boolean>) {
  if (!row || !select) return row;
  const keys = Object.keys(select).filter((k) => select[k]);
  return Object.fromEntries(keys.filter((k) => k in row).map((k) => [k, row[k]]));
}

/**
 * An in-memory store that actually persists writes, so a test can follow a piece
 * of content from creation through the admin API to its appearance on the public
 * one. Only the Prisma surface this application uses is implemented.
 */
export function createStatefulPrisma() {
  const store: Record<string, any[]> = Object.fromEntries(TABLES.map((t) => [t, []]));
  store.user = [{ ...ADMIN }];

  const hydrate = (table: string, row: any, include: any): any => {
    if (!row || !include) return row;
    const result = { ...row };

    if (include.image && (table === 'news' || table === 'mission')) {
      result.image = store.media.find((m) => m.id === row.imageId) ?? null;
    }
    if (include.category && table === 'news') {
      result.category = store.newsCategory.find((c) => c.id === row.categoryId) ?? null;
    }
    if (include.logo && table === 'partner') {
      result.logo = store.media.find((m) => m.id === row.logoId) ?? null;
    }
    if (include.images && table === 'galleryAlbum') {
      result.images = store.galleryImage
        .filter((i) => i.albumId === row.id)
        .map((i) => ({ ...i, media: store.media.find((m) => m.id === i.mediaId) ?? null }));
    }
    if (include.media && table === 'galleryImage') {
      result.media = store.media.find((m) => m.id === row.mediaId) ?? null;
    }
    if (include.album && table === 'galleryImage') {
      result.album = store.galleryAlbum.find((a) => a.id === row.albumId) ?? null;
    }
    if (include.user && table === 'auditLog') {
      result.user = store.user.find((u) => u.id === row.userId) ?? null;
    }
    if (include._count && table === 'newsCategory') {
      result._count = { news: store.news.filter((n) => n.categoryId === row.id).length };
    }

    return result;
  };

  const model = (table: string) => ({
    findMany: async ({ where, orderBy, include, select, skip = 0, take }: any = {}) => {
      const filtered = sortRows(
        store[table].filter((row) => matches(row, where)),
        orderBy,
      ).slice(skip, take ? skip + take : undefined);

      return filtered.map((row) => project(hydrate(table, row, include), select));
    },

    findFirst: async ({ where, orderBy, include, select }: any = {}) => {
      const rows = sortRows(
        store[table].filter((row) => matches(row, where)),
        orderBy,
      );
      return rows.length ? project(hydrate(table, rows[0], include), select) : null;
    },

    findUnique: async ({ where, include, select }: any) => {
      const row = store[table].find((item) =>
        Object.entries(where).every(([key, value]) => item[key] === value),
      );
      return row ? project(hydrate(table, row, include), select) : null;
    },

    create: async ({ data, include, select }: any) => {
      const row = {
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...applyDefaults(table, data),
      };
      store[table].push(row);
      return project(hydrate(table, row, include), select);
    },

    update: async ({ where, data, include, select }: any) => {
      const row = store[table].find((item) => item.id === where.id || item.key === where.key);
      if (!row) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
      Object.assign(row, data, { updatedAt: new Date() });
      return project(hydrate(table, row, include), select);
    },

    upsert: async ({ where, create, update }: any) => {
      const row = store[table].find((item) => item.id === where.id || item.key === where.key);
      if (row) {
        Object.assign(row, update, { updatedAt: new Date() });
        return row;
      }
      const created = { id: randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...create };
      store[table].push(created);
      return created;
    },

    updateMany: async ({ where, data }: any) => {
      const rows = store[table].filter((row) => matches(row, where));
      rows.forEach((row) => Object.assign(row, data));
      return { count: rows.length };
    },

    delete: async ({ where }: any) => {
      const index = store[table].findIndex((item) => item.id === where.id);
      if (index === -1) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
      return store[table].splice(index, 1)[0];
    },

    count: async ({ where }: any = {}) => store[table].filter((row) => matches(row, where)).length,

    groupBy: async ({ by }: any) => {
      const groups = new Map<string, number>();
      for (const row of store[table]) {
        const key = row[by[0]];
        groups.set(key, (groups.get(key) ?? 0) + 1);
      }
      return [...groups.entries()].map(([value, count]) => ({
        [by[0]]: value,
        _count: { _all: count },
      }));
    },

    aggregate: async () => ({
      _sum: { size: store[table].reduce((total, row) => total + (row.size ?? 0), 0) },
    }),
  });

  const prisma: any = {
    $transaction: async (ops: any) => (typeof ops === 'function' ? ops(prisma) : Promise.all(ops)),
    $queryRaw: async () => [{ ok: 1 }],
    $connect: async () => undefined,
    $disconnect: async () => undefined,
    onModuleInit: async () => undefined,
    onModuleDestroy: async () => undefined,
    __store: store,
  };

  for (const table of TABLES) {
    prisma[table] = model(table);
  }

  return prisma;
}
