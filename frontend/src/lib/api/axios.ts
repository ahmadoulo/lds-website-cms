import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

export const TOKEN_KEY = 'lds_admin_token';
export const REFRESH_KEY = 'lds_admin_refresh';
export const USER_KEY = 'lds_admin_user';

/**
 * Same-origin by default: nginx (production) and the Vite dev server both proxy
 * /api to the backend, so no host has to be configured anywhere. VITE_API_URL is
 * only set when the API lives on a separate domain.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Access tokens are short lived. On the first 401 we try the refresh token once
 * and replay the original request; concurrent 401s wait on the same refresh so a
 * page issuing five parallel requests does not fire five refreshes.
 */
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) throw new Error('no-refresh-token');

  const { data } = await axios.post(
    `${api.defaults.baseURL}/auth/refresh`,
    { refresh_token: refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );

  localStorage.setItem(TOKEN_KEY, data.access_token);
  if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token);
  if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));

  return data.access_token;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    const status = error.response?.status;
    const isAuthCall = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');

    if (status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const token = await refreshPromise;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        clearSession();
        if (!window.location.pathname.startsWith('/admin/login')) {
          window.location.assign('/admin/login');
        }
      }
    }

    return Promise.reject(error);
  },
);

/**
 * Turns a failure into something the user can act on.
 *
 * The status is inspected before the fallback: a 502 from the reverse proxy
 * carries an HTML body with no `message`, and blaming the caller's credentials
 * for what is actually a stopped server sends them hunting for the wrong
 * problem.
 */
export function apiErrorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  const axiosError = error as AxiosError<{ message?: string | string[] }>;
  const status = axiosError?.response?.status;
  const message = axiosError?.response?.data?.message;

  // The API's own message is always the most precise, when there is one.
  if (Array.isArray(message)) return message.join(' · ');
  if (typeof message === 'string' && message.trim()) return message;

  if (axiosError?.code === 'ERR_NETWORK' || axiosError?.code === 'ECONNABORTED') {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion.';
  }

  if (status === 429) {
    return 'Trop de tentatives. Patientez une minute avant de réessayer.';
  }

  if (status === 502 || status === 503 || status === 504) {
    return 'Le serveur est momentanément indisponible. Réessayez dans quelques instants.';
  }

  if (status && status >= 500) {
    return 'Une erreur est survenue côté serveur. Réessayez dans quelques instants.';
  }

  return fallback;
}

export default api;
