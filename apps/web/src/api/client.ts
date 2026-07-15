import { clearTokens, getAccessToken } from './token-storage';

/**
 * Relative `/api` works in dev (Vite proxies it) and in prod if the web app
 * is served from the same domain as the API. If they're on separate
 * domains (e.g. Vercel + Railway), set VITE_API_URL to the API's full
 * origin at build time.
 */
const BASE = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = getAccessToken();

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
    credentials: 'include',
    ...init,
  });

  if (res.status === 401 && accessToken) {
    // The access token expired (or was rejected) — treat this the same as
    // the user logging out rather than silently refreshing behind their back.
    clearTokens();
    window.dispatchEvent(new Event('auth:logout'));
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : (body?.message ?? `Request failed: ${res.status}`);
    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}
