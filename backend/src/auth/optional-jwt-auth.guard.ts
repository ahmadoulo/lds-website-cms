import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Populates `request.user` when a valid bearer token is present but never rejects
 * anonymous callers. Used by list endpoints that expose published content to the
 * public site and the full (including draft) content to signed-in editors.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // Anonymous or invalid token: continue without a user.
    }
    return true;
  }

  handleRequest(_err: any, user: any) {
    return user || undefined;
  }
}
