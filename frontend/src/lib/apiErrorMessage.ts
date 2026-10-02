import type { AxiosError } from 'axios';
import { DEFAULT_LOCALE, type Locale } from './i18n/locale';
import { ADMIN_SCREENS } from './i18n/dictionaries/adminScreens';

/**
 * Turns a failure into something the user can act on, in their language.
 *
 * The status is inspected before the fallback: a 502 from the reverse proxy
 * carries an HTML body with no `message`, and blaming the caller's credentials
 * for what is actually a stopped server sends them hunting for the wrong
 * problem.
 *
 * This is not a component and cannot call `useT()`, so the locale is an
 * argument. It stays last and optional: the callers that pass only an error and
 * a fallback keep working, and French remains the default exactly as before.
 * The message the API itself sent is still preferred over anything here - the
 * backend knows which field was wrong, and this file does not.
 */
export function apiErrorMessage(
  error: unknown,
  fallback?: string,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const strings = ADMIN_SCREENS[locale].errors;
  const axiosError = error as AxiosError<{ message?: string | string[] }>;
  const status = axiosError?.response?.status;
  const message = axiosError?.response?.data?.message;

  // The API's own message is always the most precise, when there is one.
  if (Array.isArray(message)) return message.join(strings.separator);
  if (typeof message === 'string' && message.trim()) return message;

  if (axiosError?.code === 'ERR_NETWORK' || axiosError?.code === 'ECONNABORTED') {
    return strings.network;
  }

  if (status === 429) return strings.rateLimited;

  if (status === 502 || status === 503 || status === 504) return strings.unavailable;

  if (status && status >= 500) return strings.server;

  return fallback ?? strings.generic;
}
