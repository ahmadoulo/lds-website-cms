import { Test, TestingModule } from '@nestjs/testing';
import { MissionsService } from './missions.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('MissionsService', () => {
  let service: MissionsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    mission: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MissionsService>(MissionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all missions if isPublishedOnly is false', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([{ id: '1' }]);
      const result = await service.findAll(false);
      
      expect(prisma.mission.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { order: 'asc' },
        include: { image: true },
      });
      expect(result).toEqual([{ id: '1' }]);
    });

    it('should return only published missions if isPublishedOnly is true', async () => {
      mockPrismaService.mission.findMany.mockResolvedValue([{ id: '1', isPublished: true }]);
      const result = await service.findAll(true);
      
      expect(prisma.mission.findMany).toHaveBeenCalledWith({
        where: { isPublished: true },
        orderBy: { order: 'asc' },
        include: { image: true },
      });
      expect(result).toEqual([{ id: '1', isPublished: true }]);
    });
  });

  describe('findOne', () => {
    it('should return a mission by id', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({ id: '1' });
      const result = await service.findOne('1');
      expect(result).toEqual({ id: '1' });
    });

    it('should throw NotFoundException if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);
      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });
});
