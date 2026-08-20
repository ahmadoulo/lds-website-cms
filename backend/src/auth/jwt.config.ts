const DEV_FALLBACK_ACCESS = 'lds-dev-only-access-secret';
const DEV_FALLBACK_REFRESH = 'lds-dev-only-refresh-secret';

function required(name: string, devFallback: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `${name} is not set. Refusing to start with a default secret in production.`,
    );
  }

  return devFallback;
}

export const getJwtSecret = () => required('JWT_SECRET', DEV_FALLBACK_ACCESS);
export const getJwtRefreshSecret = () => required('JWT_REFRESH_SECRET', DEV_FALLBACK_REFRESH);
// Typed as the jsonwebtoken template literal union expects (e.g. '2h', '7d').
export const ACCESS_TOKEN_TTL = (process.env.JWT_ACCESS_TTL || '2h') as `${number}${'s' | 'm' | 'h' | 'd'}`;
export const REFRESH_TOKEN_TTL = (process.env.JWT_REFRESH_TTL || '7d') as `${number}${'s' | 'm' | 'h' | 'd'}`;
