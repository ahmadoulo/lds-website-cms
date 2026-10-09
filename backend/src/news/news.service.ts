import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { QueryNewsDto } from './dto/query-news.dto';
import { CreateNewsCategoryDto, UpdateNewsCategoryDto } from './dto/news-category.dto';
import { paginated, type Paginated } from '../common/dto/pagination.dto';
import {
  mergeLocalized,
  mergeLocalizedFields,
  sanitizeLocalized,
  sanitizePlainText,
  sanitizeRichText,
} from '../common/sanitize';
import { slugify, uniqueSlug } from '../common/slug';
import {
  bannerWhere,
  reachableNow,
  statusWhere,
  upcomingWhere,
  validateActions,
  validateContact,
  visibleNow,
} from './announcement';

/** The announcement's own text fields, merged per language like the title. */
const LOCALIZED_EXTRA = ['location', 'practicalInfo', 'bannerText'] as const;

const NEWS_INCLUDE = { category: true, image: true };
const DEFAULT_CATEGORY_SLUG = 'actualites';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class NewsService {
  constructor(private prisma: PrismaService) {}

  // ----------------------------------------------------------------- articles

  async create(dto: CreateNewsDto) {
    const data = await this.buildWriteData(dto);

    this.checkDates(data);

    const slug = await uniqueSlug(
      dto.slug || dto.title.fr || dto.title.en || '',
      async (candidate) => Boolean(await this.prisma.news.findUnique({ where: { slug: candidate } })),
      'actualite',
    );

    return this.prisma.news.create({
      data: {
        ...data,
        title: dto.title,
        excerpt: dto.excerpt,
        content: dto.content,
        slug,
        categoryId: data.categoryId ?? (await this.defaultCategoryId()),
        // Explicit rather than relying on the column default: whether an article
        // is live is the most consequential flag in the CMS.
        isPublished: dto.isPublished ?? false,
        // A chosen date schedules it; none means now.
        publishedAt: dto.isPublished
          ? dto.publishedAt
            ? new Date(dto.publishedAt)
            : new Date()
          : null,
      } as any,
      include: NEWS_INCLUDE,
    });
  }

  async findAll(query: QueryNewsDto = {}, includeUnpublished = false): Promise<Paginated<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    /*
      Public: published, not archived, and not scheduled for later - before
      this, an article was public the moment it was published, whatever its
      date, so nothing could be scheduled. The editor sees everything, and
      filters by the state they think in.
    */
    const where: any = includeUnpublished
      ? query.status
        ? { AND: [statusWhere(query.status)] }
        : { AND: [] }
      : { AND: [visibleNow()] };
    if (query.from || query.to) {
      where.AND.push({
        createdAt: {
          ...(query.from ? { gte: new Date(query.from) } : {}),
          ...(query.to ? { lte: new Date(query.to) } : {}),
        },
      });
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.search) {
      // Localized fields are JSON columns, so search targets the slug plus the
      // French title inside the JSON document.
      where.OR = [
        { slug: { contains: slugify(query.search) } },
        { title: { path: ['fr'], string_contains: query.search } },
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.news.count({ where }),
      this.prisma.news.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: NEWS_INCLUDE,
      }),
    ]);

    return paginated(data, total, page, limit);
  }

  async findOne(idOrSlug: string, includeUnpublished = false) {
    const isUuid = UUID_RE.test(idOrSlug);

    const news = await this.prisma.news.findFirst({
      where: {
        AND: [
          isUuid ? { OR: [{ id: idOrSlug }, { slug: idOrSlug }] } : { slug: idOrSlug },
          // An archived article still answers at its address: it was shared.
          includeUnpublished ? {} : reachableNow(),
        ],
      },
      include: NEWS_INCLUDE,
    });

    if (!news) throw new NotFoundException('Article introuvable');
    return news;
  }

  /** Most recent published articles, excluding the one currently being viewed. */
  async findRelated(id: string, limit = 3) {
    return this.prisma.news.findMany({
      where: { AND: [visibleNow(), { NOT: { id } }] },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      include: NEWS_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateNewsDto) {
    const existing = await this.prisma.news.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Article introuvable');

    const data: any = await this.buildWriteData(dto);

    // Merged, not replaced: the form sends only the locales it shows, and an
    // assignment would drop every other translation stored on the row. The
    // sanitised values live on `dto`, which buildWriteData rewrites in place.
    for (const field of ['title', 'excerpt', 'content'] as const) {
      if (dto[field]) data[field] = mergeLocalized(existing[field], dto[field] as any);
    }
    for (const field of LOCALIZED_EXTRA) {
      // null clears the field; an object is merged per language.
      if (dto[field]) data[field] = mergeLocalized(existing[field] as any, data[field]);
    }

    if (dto.slug && dto.slug !== existing.slug) {
      data.slug = await uniqueSlug(
        dto.slug,
        async (candidate) =>
          Boolean(await this.prisma.news.findFirst({ where: { slug: candidate, NOT: { id } } })),
        'actualite',
      );
    }

    // Stamp the publication date the first time the article goes live, and clear it
    // when it goes back to draft so the public ordering stays truthful.
    if (dto.isPublished === false) {
      data.publishedAt = null;
    } else if (dto.publishedAt && (dto.isPublished === true || existing.isPublished)) {
      // Rescheduling, or publishing at a chosen date.
      data.publishedAt = new Date(dto.publishedAt);
    } else if (dto.isPublished === true && !existing.isPublished) {
      data.publishedAt = new Date();
    }

    if (dto.archived === true && !existing.archivedAt) data.archivedAt = new Date();
    if (dto.archived === false) data.archivedAt = null;

    this.checkDates({ ...existing, ...data });

    return this.prisma.news.update({ where: { id }, data, include: NEWS_INCLUDE });
  }

  async remove(id: string) {
    const existing = await this.prisma.news.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Article introuvable');

    await this.prisma.news.delete({ where: { id } });
    return { success: true, id };
  }

  // --------------------------------------------------------------- categories

  async findCategories() {
    return this.prisma.newsCategory.findMany({
      orderBy: { slug: 'asc' },
      include: { _count: { select: { news: true } } },
    });
  }

  async createCategory(dto: CreateNewsCategoryDto) {
    const slug = await uniqueSlug(
      dto.slug || dto.name.fr || dto.name.en || '',
      async (candidate) =>
        Boolean(await this.prisma.newsCategory.findUnique({ where: { slug: candidate } })),
      'categorie',
    );

    return this.prisma.newsCategory.create({ data: { name: dto.name, slug } });
  }

  async updateCategory(id: string, dto: UpdateNewsCategoryDto) {
    const existing = await this.prisma.newsCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Catégorie introuvable');

    const data: any = {};
    if (dto.name) data.name = mergeLocalized(existing.name, dto.name);
    if (dto.slug && dto.slug !== existing.slug) {
      data.slug = await uniqueSlug(
        dto.slug,
        async (candidate) =>
          Boolean(
            await this.prisma.newsCategory.findFirst({ where: { slug: candidate, NOT: { id } } }),
          ),
        'categorie',
      );
    }

    return this.prisma.newsCategory.update({ where: { id }, data });
  }

  async removeCategory(id: string) {
    const existing = await this.prisma.newsCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Catégorie introuvable');

    if (existing.slug === DEFAULT_CATEGORY_SLUG) {
      throw new BadRequestException('La catégorie par défaut ne peut pas être supprimée');
    }

    // Articles survive: their category link is simply cleared (onDelete: SetNull).
    await this.prisma.newsCategory.delete({ where: { id } });
    return { success: true, id };
  }

  // ------------------------------------------------------------ announcements

  /** The banner's announcements, most important first. */
  async findBanner(limit = 5) {
    return this.prisma.news.findMany({
      where: bannerWhere(),
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
      take: limit,
      select: { id: true, slug: true, title: true, bannerText: true, bannerScope: true, updatedAt: true },
    });
  }

  /** "À venir": featured first, then by date of the activity. */
  async findUpcoming(limit = 6) {
    return this.prisma.news.findMany({
      where: upcomingWhere(),
      orderBy: [
        { isFeatured: 'desc' },
        { eventStartsAt: { sort: 'asc', nulls: 'last' } },
        { publishedAt: 'desc' },
      ],
      take: limit,
      include: NEWS_INCLUDE,
    });
  }

  /** An end before a start is a typo nobody should have to debug on the site. */
  private checkDates(row: Record<string, any>) {
    const before = (a?: Date | null, b?: Date | null) => a && b && a.getTime() > b.getTime();
    if (before(row.eventStartsAt, row.eventEndsAt)) {
      throw new BadRequestException("La fin de l'activité précède son début.");
    }
    if (before(row.visibleFrom, row.visibleUntil)) {
      throw new BadRequestException("La fin de l'affichage précède son début.");
    }
  }

  // ------------------------------------------------------------------ helpers

  /** Sanitises text, validates relations and normalises optional fields. */
  private async buildWriteData(dto: CreateNewsDto | UpdateNewsDto) {
    if (dto.title) dto.title = sanitizeLocalized(dto.title, sanitizePlainText) as any;
    if (dto.excerpt) dto.excerpt = sanitizeLocalized(dto.excerpt, sanitizePlainText) as any;
    if (dto.content) dto.content = sanitizeLocalized(dto.content, sanitizeRichText) as any;

    if (dto.categoryId) {
      const category = await this.prisma.newsCategory.findUnique({ where: { id: dto.categoryId } });
      if (!category) throw new BadRequestException('Catégorie introuvable');
    }

    if (dto.imageId) {
      const media = await this.prisma.media.findUnique({ where: { id: dto.imageId } });
      if (!media) throw new BadRequestException('Image introuvable');
    }

    const data: any = {};
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.imageId !== undefined) data.imageId = dto.imageId || null;
    if (dto.isPublished !== undefined) data.isPublished = dto.isPublished;

    // ------------------------------------------------- announcement fields
    for (const field of ['eventStartsAt', 'eventEndsAt', 'visibleFrom', 'visibleUntil'] as const) {
      if (dto[field] !== undefined) data[field] = dto[field] ? new Date(dto[field]!) : null;
    }
    for (const field of LOCALIZED_EXTRA) {
      if (dto[field] === undefined) continue;
      data[field] = dto[field]
        ? (sanitizeLocalized(dto[field] as any, (text: string) => sanitizePlainText(text).slice(0, 2000)) as any)
        : null;
    }
    for (const flag of ['showInBanner', 'showInUpcoming', 'isFeatured'] as const) {
      if (dto[flag] !== undefined) data[flag] = dto[flag];
    }
    if (dto.bannerScope !== undefined) data.bannerScope = dto.bannerScope;
    if (dto.actions !== undefined) data.actions = dto.actions ? validateActions(dto.actions) : null;
    if (dto.contact !== undefined) data.contact = validateContact(dto.contact);

    return data;
  }

  /** Guarantees there is always a category to fall back on. */
  private async defaultCategoryId() {
    const existing = await this.prisma.newsCategory.findUnique({
      where: { slug: DEFAULT_CATEGORY_SLUG },
    });
    if (existing) return existing.id;

    const created = await this.prisma.newsCategory.create({
      data: { name: { fr: 'Actualités', en: 'News' }, slug: DEFAULT_CATEGORY_SLUG },
    });
    return created.id;
  }
}
