import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;

  const mockReflector = { getAllAndOverride: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionsGuard, { provide: Reflector, useValue: mockReflector }],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
  });

  afterEach(() => jest.clearAllMocks());

  const contextFor = (user: any): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    }) as unknown as ExecutionContext;

  it('allows the request when no permission metadata is present', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(contextFor({ role: 'EDITOR' }))).toBe(true);
  });

  it('denies anonymous requests on guarded handlers', () => {
    mockReflector.getAllAndOverride.mockReturnValue({ action: 'CREATE', subject: 'News' });
    expect(() => guard.canActivate(contextFor(undefined))).toThrow(ForbiddenException);
  });

  it('lets an EDITOR manage day-to-day content', () => {
    mockReflector.getAllAndOverride.mockReturnValue({ action: 'CREATE', subject: 'News' });
    expect(guard.canActivate(contextFor({ role: 'EDITOR' }))).toBe(true);
  });

  it('blocks an EDITOR from organisation-wide settings', () => {
    mockReflector.getAllAndOverride.mockReturnValue({ action: 'UPDATE', subject: 'Settings' });
    expect(() => guard.canActivate(contextFor({ role: 'EDITOR' }))).toThrow(ForbiddenException);
  });

  it('lets an ADMIN update settings', () => {
    mockReflector.getAllAndOverride.mockReturnValue({ action: 'UPDATE', subject: 'Settings' });
    expect(guard.canActivate(contextFor({ role: 'ADMIN' }))).toBe(true);
  });

  it('blocks an ADMIN from user administration', () => {
    mockReflector.getAllAndOverride.mockReturnValue({ action: 'CREATE', subject: 'User' });
    expect(() => guard.canActivate(contextFor({ role: 'ADMIN' }))).toThrow(ForbiddenException);
  });

  it('lets a SUPER_ADMIN do everything', () => {
    mockReflector.getAllAndOverride.mockReturnValue({ action: 'MANAGE', subject: 'User' });
    expect(guard.canActivate(contextFor({ role: 'SUPER_ADMIN' }))).toBe(true);
  });

  it('lets an EDITOR upload media for their own content', () => {
    mockReflector.getAllAndOverride.mockReturnValue({ action: 'CREATE', subject: 'Media' });
    expect(guard.canActivate(contextFor({ role: 'EDITOR' }))).toBe(true);
  });

  it('blocks an EDITOR from deleting media from storage', () => {
    mockReflector.getAllAndOverride.mockReturnValue({ action: 'DELETE', subject: 'Media' });
    expect(() => guard.canActivate(contextFor({ role: 'EDITOR' }))).toThrow(ForbiddenException);
  });

  it('lets an ADMIN delete media', () => {
    mockReflector.getAllAndOverride.mockReturnValue({ action: 'DELETE', subject: 'Media' });
    expect(guard.canActivate(contextFor({ role: 'ADMIN' }))).toBe(true);
  });

  it('rejects an unknown role', () => {
    mockReflector.getAllAndOverride.mockReturnValue({ action: 'CREATE', subject: 'News' });
    expect(() => guard.canActivate(contextFor({ role: 'GUEST' }))).toThrow(ForbiddenException);
  });
});
