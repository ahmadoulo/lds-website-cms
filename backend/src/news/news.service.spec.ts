import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NewsService } from './news.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NewsService', () => {
  let service: NewsService;
  let prisma: any;

  const mockPrismaService = {
    news: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    newsCategory: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    media: { findUnique: jest.fn() },
    $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NewsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<NewsService>(NewsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  const baseArticle = {
    title: { fr: 'Rétrospective 2026' },
    excerpt: { fr: 'Un résumé de nos actions.' },
    content: { fr: '<p>Contenu</p>' },
  };

  it('stamps publishedAt when an article is created as published', async () => {
    const now = new Date('2026-03-01T10:00:00.000Z');
    jest.setSystemTime(now);
    mockPrismaService.news.findUnique.mockResolvedValue(null);
    mockPrismaService.newsCategory.findUnique.mockResolvedValue({ id: 'cat-1' });
    mockPrismaService.news.create.mockResolvedValue({ id: '1' });

    await service.create({ ...baseArticle, isPublished: true } as any);

    expect(prisma.news.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isPublished: true, publishedAt: now }),
      }),
    );
  });

  it('derives a slug from the title when none is supplied', async () => {
    mockPrismaService.news.findUnique.mockResolvedValue(null);
    mockPrismaService.newsCategory.findUnique.mockResolvedValue({ id: 'cat-1' });
    mockPrismaService.news.create.mockResolvedValue({ id: '1' });

    await service.create({ ...baseArticle } as any);

    expect(prisma.news.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'retrospective-2026' }),
      }),
    );
  });

  it('suffixes the slug when it is already taken', async () => {
    mockPrismaService.news.findUnique
      .mockResolvedValueOnce({ id: 'other' }) // "retrospective-2026" taken
      .mockResolvedValueOnce(null); // "retrospective-2026-2" free
    mockPrismaService.newsCategory.findUnique.mockResolvedValue({ id: 'cat-1' });
    mockPrismaService.news.create.mockResolvedValue({ id: '1' });

    await service.create({ ...baseArticle } as any);

    expect(prisma.news.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'retrospective-2026-2' }),
      }),
    );
  });

  it('strips script tags out of the rich text body', async () => {
    mockPrismaService.news.findUnique.mockResolvedValue(null);
    mockPrismaService.newsCategory.findUnique.mockResolvedValue({ id: 'cat-1' });
    mockPrismaService.news.create.mockResolvedValue({ id: '1' });

    await service.create({
      ...baseArticle,
      content: { fr: '<p>Bonjour</p><script>alert(1)</script>' },
    } as any);

    const written = mockPrismaService.news.create.mock.calls[0][0].data;
    expect(written.content.fr).toBe('<p>Bonjour</p>');
  });

  it('stamps publishedAt when a draft is published', async () => {
    const now = new Date('2026-04-01T08:00:00.000Z');
    jest.setSystemTime(now);
    mockPrismaService.news.findUnique.mockResolvedValue({ id: '1', isPublished: false, slug: 's' });
    mockPrismaService.news.update.mockResolvedValue({ id: '1' });

    await service.update('1', { isPublished: true });

    expect(prisma.news.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isPublished: true, publishedAt: now }),
      }),
    );
  });

  it('clears publishedAt when an article goes back to draft', async () => {
    mockPrismaService.news.findUnique.mockResolvedValue({ id: '1', isPublished: true, slug: 's' });
    mockPrismaService.news.update.mockResolvedValue({ id: '1' });

    await service.update('1', { isPublished: false });

    expect(prisma.news.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isPublished: false, publishedAt: null }),
      }),
    );
  });

  it('hides drafts from anonymous readers', async () => {
    mockPrismaService.news.findFirst.mockResolvedValue(null);

    await expect(service.findOne('un-slug')).rejects.toThrow(NotFoundException);
    expect(prisma.news.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ isPublished: true }]),
        }),
      }),
    );
  });

  it('returns only published articles to anonymous listings', async () => {
    mockPrismaService.news.count.mockResolvedValue(0);
    mockPrismaService.news.findMany.mockResolvedValue([]);

    const result = await service.findAll({}, false);

    expect(prisma.news.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isPublished: true } }),
    );
    expect(result.meta.total).toBe(0);
  });
});
