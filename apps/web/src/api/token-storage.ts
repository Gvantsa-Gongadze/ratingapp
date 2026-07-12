const ACCESS_TOKEN_KEY = 'ratingapp.accessToken';
const REFRESH_TOKEN_KEY = 'ratingapp.refreshToken';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** Reads the `sub` claim straight out of the stored JWT — no network call, not signature-verified. */
export function getCurrentUserId(): string | null {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = JSON.parse(atob(padded)) as { sub?: unknown };
    return typeof json.sub === 'string' ? json.sub : null;
  } catch {
    return null;
  }
}
