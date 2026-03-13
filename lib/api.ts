/**
 * API base URL for external backend (e.g. Render).
 * When set, all /api/* fetch calls use this base (e.g. https://pixmerce-app.onrender.com).
 * When unset, uses relative URLs (same origin - Netlify or localhost).
 *
 * Set NEXT_PUBLIC_API_URL in Netlify when frontend is on Netlify and backend on Render.
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${p}` : p;
}

/** Whether we're calling an external API (cross-origin) - need credentials for auth */
export const isExternalApi = Boolean(API_BASE);

/** Fetch with correct URL and credentials for cross-origin when using external backend */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = input.startsWith("http") ? input : apiUrl(input);
  const credentials = init?.credentials ?? (isExternalApi ? "include" : "same-origin");
  return fetch(url, { ...init, credentials });
}
