import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSIONS_KEY, PermissionRequirements } from './require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<PermissionRequirements>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      return true; // No specific permissions required beyond being authenticated
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user || !user.role) {
      throw new ForbiddenException('Access denied');
    }

    // Role hierarchy mapping to determine access
    const roleHierarchy = {
      SUPER_ADMIN: 3,
      ADMIN: 2,
      EDITOR: 1
    };

    const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;

    // We can interpret the `@RequirePermission` logic dynamically or just rely on roles directly.
    // Given the enum approach, let's map required actions/subjects to minimum role levels:
    let requiredLevel = 1; // EDITOR minimum by default

    // If they require MANAGE on 'all', or MANAGE on Users/Settings, they need SUPER_ADMIN or ADMIN
    if (requiredPermission.action === 'MANAGE' || requiredPermission.subject === 'User' || requiredPermission.subject === 'Role') {
      requiredLevel = 3; // SUPER_ADMIN
    } else if (requiredPermission.subject === 'SiteSettings' || requiredPermission.subject === 'Media' || requiredPermission.subject === 'NavigationItem') {
      requiredLevel = 2; // ADMIN
    }

    if (userLevel < requiredLevel) {
      throw new ForbiddenException(`Insufficient role permissions for this action.`);
    }

    return true;
  }
}
