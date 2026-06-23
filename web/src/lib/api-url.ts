function ensureApiSuffix(url: string): string {
  const trimmed = url.replace(/\/+$/, "");
  return /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`;
}

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (raw) {
    return ensureApiSuffix(raw);
  }

  // For browser clients, derive host dynamically so non-localhost access still works.
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const protocol = window.location.protocol || "http:";
    return ensureApiSuffix(`${protocol}//${host}:4000`);
  }

  return "http://localhost:4000/api";
}

export const API_BASE_URL = getApiBaseUrl();
