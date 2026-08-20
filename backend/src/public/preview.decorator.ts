import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * True only when the caller asked for a preview AND is signed in.
 *
 * The flag alone is worthless: a visitor adding ?preview=true must keep seeing
 * the published site. Pairing it with OptionalJwtAuthGuard makes the session the
 * real authorisation, so unpublished work never leaks.
 */
export const PreviewMode = createParamDecorator((_data: unknown, ctx: ExecutionContext): boolean => {
  const request = ctx.switchToHttp().getRequest();
  const user: AuthenticatedUser | undefined = request.user;
  if (!user) return false;

  const raw = request.query?.preview;
  const value = Array.isArray(raw) ? raw[0] : raw;

  return value === 'true' || value === '1';
});
