function ensureApiSuffix(url: string): string {
  const trimmed = url.replace(/\/+$/, "");
  return /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`;
}

/**
 * Returns the base API URL.
 *
 * - Browser (client-side): always returns "/api" so that requests go through
 *   the Next.js rewrite proxy instead of hitting the backend port directly.
 *   This avoids CORS errors when running in Docker or any environment where
 *   the API is not reachable from the user's browser on port 4000.
 *
 * - Server-side (SSR / Route Handlers): uses NEXT_PUBLIC_API_URL so that
 *   server-to-server calls inside Docker reach the api container by name.
 */
export function getApiBaseUrl(): string {
  // In the browser, always use the relative /api path so the Next.js
  // rewrite proxy handles routing to the backend. This is the key fix
  // for CORS errors in Docker deployments.
  if (typeof window !== "undefined") {
    return "/api";
  }

  // Server-side: use the configured URL (container-to-container communication).
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) {
    return ensureApiSuffix(raw);
  }

  return "http://localhost:4000/api";
}

export const API_BASE_URL = getApiBaseUrl();
