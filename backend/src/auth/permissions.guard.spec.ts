import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsGuard } from './permissions.guard';
import { PrismaService } from '../prisma/prisma.service';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PERMISSIONS_KEY } from './require-permission.decorator';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let prisma: PrismaService;

  const mockPrismaService = {
    role: {
      findUnique: jest.fn(),
    },
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (user: any): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext);

  it('should allow access if no permissions are required', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext({ roleId: '1' });
    
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should deny access if user is not present or has no roleId', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({ action: 'CREATE', subject: 'News' });
    const context = createMockContext(undefined);
    
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow('Access denied');
  });

  it('should allow access for SUPER_ADMIN role', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({ action: 'CREATE', subject: 'News' });
    const context = createMockContext({ roleId: 'admin-role-id' });
    mockPrismaService.role.findUnique.mockResolvedValue({
      id: 'admin-role-id',
      name: 'SUPER_ADMIN',
      permissions: [],
    });
    
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should allow access if role has exact permission', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({ action: 'CREATE', subject: 'News' });
    const context = createMockContext({ roleId: 'editor-role-id' });
    mockPrismaService.role.findUnique.mockResolvedValue({
      id: 'editor-role-id',
      name: 'EDITOR',
      permissions: [
        { action: 'CREATE', subject: 'News' }
      ],
    });
    
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should allow access if role has wildcard MANAGE permission', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({ action: 'DELETE', subject: 'News' });
    const context = createMockContext({ roleId: 'manager-role-id' });
    mockPrismaService.role.findUnique.mockResolvedValue({
      id: 'manager-role-id',
      name: 'MANAGER',
      permissions: [
        { action: 'MANAGE', subject: 'News' }
      ],
    });
    
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should deny access if role lacks permission', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({ action: 'DELETE', subject: 'News' });
    const context = createMockContext({ roleId: 'editor-role-id' });
    mockPrismaService.role.findUnique.mockResolvedValue({
      id: 'editor-role-id',
      name: 'EDITOR',
      permissions: [
        { action: 'CREATE', subject: 'News' } // Has create, but lacks delete
      ],
    });
    
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow('Insufficient permissions');
  });
});
