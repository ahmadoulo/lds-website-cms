import { Test, TestingModule } from '@nestjs/testing';
import { NewsService } from './news.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NewsService', () => {
  let service: NewsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    news: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<NewsService>(NewsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should auto-set publishedAt when creating published news', async () => {
    const now = new Date();
    jest.setSystemTime(now);
    mockPrismaService.news.create.mockResolvedValue({ id: '1', isPublished: true, publishedAt: now });
    
    await service.create({
      title: { fr: 'Test', en: 'Test' },
      content: { fr: 'Test', en: 'Test' },
      excerpt: { fr: 'Test', en: 'Test' },
      slug: 'test',
      isPublished: true
    });
    
    expect(prisma.news.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ isPublished: true, publishedAt: now }),
      include: { category: true, image: true }
    });
  });

  it('should auto-set publishedAt when updating from draft to published', async () => {
    const now = new Date();
    jest.setSystemTime(now);
    mockPrismaService.news.findUnique.mockResolvedValue({ id: '1', isPublished: false });
    mockPrismaService.news.update.mockResolvedValue({ id: '1', isPublished: true, publishedAt: now });
    
    await service.update('1', { isPublished: true });
    
    expect(prisma.news.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(prisma.news.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: expect.objectContaining({ isPublished: true, publishedAt: now }),
      include: { category: true, image: true }
    });
  });

  it('should filter out unpublished news on findAll(true)', async () => {
    mockPrismaService.news.findMany.mockResolvedValue([]);
    await service.findAll(true);
    expect(prisma.news.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isPublished: true }
    }));
  });
});
