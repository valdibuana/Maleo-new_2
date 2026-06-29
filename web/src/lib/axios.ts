import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, getApiBaseUrl } from "@/lib/api-url";

const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30s timeout for slow networks
});

// ── Retry configuration ──
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // exponential backoff: 1s, 2s, 4s

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
  _authRetry?: boolean;
}

type RefreshResponse = {
  success: boolean;
  data?: {
    token: string;
    refreshToken: string;
    user?: unknown;
  };
};

function shouldRetry(error: AxiosError): boolean {
  if (!error.response) return true; // Network error or timeout
  if (error.response.status >= 500) return true; // Server error
  return false; // 4xx client errors — don't retry
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setAuthSession(token: string, refreshToken: string, user?: unknown): void {
  if (typeof window === "undefined") return;

  localStorage.setItem("jwt_token", token);
  localStorage.setItem("refresh_token", refreshToken);

  if (typeof user !== "undefined") {
    localStorage.setItem("user", JSON.stringify(user));
  }

  document.cookie = `jwt_token=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
  document.cookie = `refresh_token=${encodeURIComponent(refreshToken)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

function clearAuthSession(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem("jwt_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");

  document.cookie = "jwt_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax";
  document.cookie = "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax";
  document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax";
}

/**
 * Perform server-side logout: revoke refresh tokens + clear local session.
 * Should be called when user explicitly logs out.
 */
export async function performLogout(): Promise<void> {
  try {
    const token = localStorage.getItem("jwt_token") || getCookie("jwt_token");
    if (token) {
      await axios.post(
        `${getApiBaseUrl()}/auth/logout`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        }
      );
    }
  } catch {
    // Ignore server errors - we still clear local session
    console.warn("[Auth] Logout API call failed, clearing local session anyway");
  } finally {
    clearAuthSession();
  }
}



let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken =
      localStorage.getItem("refresh_token") || getCookie("refresh_token");

    if (!refreshToken) {
      return null;
    }

    const response = await axios.post<RefreshResponse>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
      { timeout: 15000, headers: { "Content-Type": "application/json" } }
    );

    const token = response.data?.data?.token;
    const nextRefreshToken = response.data?.data?.refreshToken;
    const user = response.data?.data?.user;

    if (!token || !nextRefreshToken) {
      return null;
    }

    setAuthSession(token, nextRefreshToken, user);
    return token;
  })();

  try {
    return await refreshPromise;
  } catch {
    return null;
  } finally {
    refreshPromise = null;
  }
}

// ── Request Interceptor ──
api.interceptors.request.use(
  (config) => {
    // Resolve base URL at request time so it follows current runtime host/env.
    config.baseURL = getApiBaseUrl();

    if (!config.headers["Content-Type"] && !(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }

    if (typeof window !== "undefined") {
      const token =
        localStorage.getItem("jwt_token") || getCookie("jwt_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor with Retry ──
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig;

    if (error.response?.status === 404 && typeof window !== "undefined") {
      const resolvedBase = config?.baseURL || getApiBaseUrl();
      const resolvedPath = config?.url || "";
      const resolvedUrl = /^https?:\/\//i.test(resolvedPath)
        ? resolvedPath
        : `${resolvedBase.replace(/\/+$/, "")}/${resolvedPath.replace(/^\/+/, "")}`;
      console.error("[API 404]", {
        url: resolvedUrl,
        method: config?.method?.toUpperCase(),
        params: config?.params,
      });
    }

    // 401 — try to refresh token once before forcing logout
    if (error.response?.status === 401) {
      if (!config || config._authRetry || (config.url || "").includes("/auth/refresh")) {
        clearAuthSession();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      const nextAccessToken = await refreshAccessToken();

      if (!nextAccessToken) {
        clearAuthSession();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      config._authRetry = true;
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${nextAccessToken}`;
      return api(config);
    }

    // If no config or shouldn't retry, reject immediately
    if (!config || !shouldRetry(error)) {
      return Promise.reject(error);
    }

    const retryCount = config._retryCount || 0;
    if (retryCount >= MAX_RETRIES) {
      return Promise.reject(error);
    }

    config._retryCount = retryCount + 1;
    const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];

    console.warn(
      `[API] Retry ${config._retryCount}/${MAX_RETRIES} for ${config.method?.toUpperCase()} ${config.url} (waiting ${delay}ms)`
    );

    await sleep(delay);
    return api(config);
  }
);

export default api;
