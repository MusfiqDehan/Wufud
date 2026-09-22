import type { ApiEnvelope, ListData } from "@wufud/contracts";
import { ERROR_MESSAGES, ErrorCode, GENERIC_REQUEST_FAILED } from "@wufud/contracts";
import { clearStoredAccessToken, getStoredAccessToken, refreshAccessToken } from "./session";

export class ApiError extends Error {
  constructor(
    message: string,
    public error_code?: string,
    public errors?: Record<string, string[]> | string[],
    public status = 400,
  ) {
    super(message);
  }
}

function getBase() {
  if (typeof window === "undefined") {
    return process.env.API_INTERNAL_URL ?? "http://localhost:4005";
  }
  return "";
}

/** Canonical API version. Backend serves `/api/v1/...`; legacy `/api/...` is rewritten server-side. */
export const API_VERSION_PREFIX = "/api/v1";

export function withVersion(path: string): string {
  if (path.startsWith("/api/v1/")) return path;
  if (path.startsWith("/api/")) return `/api/v1/${path.slice("/api/".length)}`;
  return path;
}

function isAuthRefreshPath(path: string) {
  return path === "/api/v1/auth/refresh" || path.endsWith("/auth/refresh");
}

function shouldRetryWithRefresh(path: string, status: number, code: string | undefined, hadAccess: boolean) {
  if (typeof window === "undefined" || !hadAccess || isAuthRefreshPath(path)) return false;
  if (status !== 401) return false;
  if (!code || code === ErrorCode.AUTHENTICATION_REQUIRED || code === ErrorCode.TOKEN_EXPIRED) return true;
  return false;
}

type ApiOptions = { retried?: boolean };

export async function api<T>(path: string, init: RequestInit = {}, options: ApiOptions = {}): Promise<T> {
  path = withVersion(path);
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  const hadAccess = typeof window !== "undefined" && Boolean(getStoredAccessToken());
  if (typeof window !== "undefined") {
    const token = getStoredAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const host = typeof window !== "undefined" ? window.location.host : process.env.PLATFORM_HOST ?? "localhost:3009";
  headers.set("X-Forwarded-Host", host);
  const fetchInit: RequestInit = {
    ...init,
    headers,
    cache: "no-store",
    credentials: typeof window !== "undefined" ? "include" : init.credentials,
  };
  const res = await fetch(`${getBase()}${path}`, fetchInit);
  if (res.status === 204) return undefined as T;
  const body = (await res.json()) as ApiEnvelope<T>;
  if (!body.success) {
    const code = body.error_code as ErrorCode | undefined;
    if (!options.retried && shouldRetryWithRefresh(path, res.status, code, hadAccess)) {
      const next = await refreshAccessToken();
      if (next) return api<T>(path, init, { retried: true });
      clearStoredAccessToken();
    }
    const fallback =
      code && code in ERROR_MESSAGES ? ERROR_MESSAGES[code as ErrorCode] : GENERIC_REQUEST_FAILED;
    throw new ApiError(body.message ?? fallback, body.error_code, body.errors, res.status);
  }
  return body.data as T;
}

export async function apiList<T>(path: string): Promise<ListData<T>> {
  return api<ListData<T>>(path);
}
