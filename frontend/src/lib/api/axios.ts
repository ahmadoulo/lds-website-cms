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

/** Extracts a human-readable message out of a NestJS error response. */
export function apiErrorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  const axiosError = error as AxiosError<{ message?: string | string[] }>;
  const message = axiosError?.response?.data?.message;

  if (Array.isArray(message)) return message.join(' · ');
  if (typeof message === 'string') return message;
  if (axiosError?.code === 'ERR_NETWORK') {
    return "Impossible de joindre le serveur. Vérifiez votre connexion.";
  }
  return fallback;
}

export default api;
