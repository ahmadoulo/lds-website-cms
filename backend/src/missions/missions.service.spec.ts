import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MissionsService } from './missions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MissionsService', () => {
  let service: MissionsService;
  let prisma: any;

  const mockPrismaService = {
    mission: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    media: { findUnique: jest.fn() },
    $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MissionsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<MissionsService>(MissionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  const dto = {
    title: { fr: 'Éducation' },
    description: { fr: 'Distribution de kits scolaires.' },
  };

  it('assigns the next free order when none is provided', async () => {
    mockPrismaService.mission.findFirst.mockResolvedValue({ order: 4 });
    mockPrismaService.mission.create.mockResolvedValue({ id: '1' });

    await service.create(dto as any);

    expect(prisma.mission.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ order: 5 }) }),
    );
  });

  it('starts ordering at zero on an empty table', async () => {
    mockPrismaService.mission.findFirst.mockResolvedValue(null);
    mockPrismaService.mission.create.mockResolvedValue({ id: '1' });

    await service.create(dto as any);

    expect(prisma.mission.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ order: 0 }) }),
    );
  });

  it('rejects an imageId that does not exist', async () => {
    mockPrismaService.media.findUnique.mockResolvedValue(null);

    await expect(service.create({ ...dto, imageId: 'missing' } as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('defaults new missions to unpublished', async () => {
    mockPrismaService.mission.findFirst.mockResolvedValue(null);
    mockPrismaService.mission.create.mockResolvedValue({ id: '1' });

    await service.create(dto as any);

    expect(prisma.mission.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isPublished: false }) }),
    );
  });

  it('filters out drafts for the public site', async () => {
    mockPrismaService.mission.findMany.mockResolvedValue([]);

    await service.findAll(false);

    expect(prisma.mission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isPublished: true } }),
    );
  });

  it('returns drafts too for signed-in staff', async () => {
    mockPrismaService.mission.findMany.mockResolvedValue([]);

    await service.findAll(true);

    expect(prisma.mission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });

  it('throws when the mission does not exist', async () => {
    mockPrismaService.mission.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
  });

  it('persists a new order for every id in a reorder', async () => {
    mockPrismaService.mission.update.mockResolvedValue({});
    mockPrismaService.mission.findMany.mockResolvedValue([]);

    await service.reorder(['a', 'b', 'c']);

    expect(prisma.mission.update).toHaveBeenCalledWith({ where: { id: 'a' }, data: { order: 0 } });
    expect(prisma.mission.update).toHaveBeenCalledWith({ where: { id: 'c' }, data: { order: 2 } });
  });
});
