import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, type PermissionRequirements } from './require-permission.decorator';
import type { AuthenticatedUser } from './auth.types';

/** Higher number = more privilege. */
const ROLE_LEVEL: Record<string, number> = {
  EDITOR: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

/**
 * Minimum role required to act on a given resource.
 * Anything not listed here is editable by an EDITOR (day-to-day content).
 */
const RESOURCE_MIN_LEVEL: Record<string, number> = {
  // Only the super admin manages accounts and roles.
  User: ROLE_LEVEL.SUPER_ADMIN,
  Role: ROLE_LEVEL.SUPER_ADMIN,
  AuditLog: ROLE_LEVEL.SUPER_ADMIN,
  // Structural / organisation-wide configuration is admin level.
  Settings: ROLE_LEVEL.ADMIN,
  SiteSettings: ROLE_LEVEL.ADMIN,
  NavigationItem: ROLE_LEVEL.ADMIN,
  Partner: ROLE_LEVEL.ADMIN,
  Donation: ROLE_LEVEL.ADMIN,
  ImpactStatistic: ROLE_LEVEL.ADMIN,
  ContactMessage: ROLE_LEVEL.ADMIN,
};

/**
 * Overrides for a specific action on a resource. Editors upload and reuse images
 * for their own content, but removing a file from storage is administrator work.
 */
const ACTION_MIN_LEVEL: Record<string, number> = {
  'DELETE:Media': ROLE_LEVEL.ADMIN,
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirement = this.reflector.getAllAndOverride<PermissionRequirements>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No explicit requirement: being authenticated is enough.
    if (!requirement) return true;

    const user: AuthenticatedUser | undefined = context.switchToHttp().getRequest().user;

    if (!user || !user.role) {
      throw new ForbiddenException('Accès refusé');
    }

    const userLevel = ROLE_LEVEL[user.role] ?? 0;

    const requiredLevel =
      requirement.action === 'MANAGE'
        ? ROLE_LEVEL.SUPER_ADMIN
        : (ACTION_MIN_LEVEL[`${requirement.action}:${requirement.subject}`] ??
           RESOURCE_MIN_LEVEL[requirement.subject] ??
           ROLE_LEVEL.EDITOR);

    if (userLevel < requiredLevel) {
      throw new ForbiddenException(
        "Votre rôle ne vous permet pas d'effectuer cette action.",
      );
    }

    return true;
  }
}
