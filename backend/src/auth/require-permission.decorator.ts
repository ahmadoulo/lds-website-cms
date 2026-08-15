import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export interface PermissionRequirements {
  action: string;
  subject: string;
}

export const RequirePermission = (action: string, subject: string) =>
  SetMetadata(PERMISSIONS_KEY, { action, subject });
