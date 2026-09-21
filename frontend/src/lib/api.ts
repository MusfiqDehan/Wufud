import type { ApiEnvelope, ListData } from "@wufud/contracts";
import { ERROR_MESSAGES, ErrorCode, GENERIC_REQUEST_FAILED } from "@wufud/contracts";

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
    return process.env.API_INTERNAL_URL ?? "http://localhost:4400";
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

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  path = withVersion(path);
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("wufud_access");
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const host = typeof window !== "undefined" ? window.location.host : process.env.PLATFORM_HOST ?? "localhost:3000";
  headers.set("X-Forwarded-Host", host);
  const res = await fetch(`${getBase()}${path}`, { ...init, headers, cache: "no-store" });
  if (res.status === 204) return undefined as T;
  const body = (await res.json()) as ApiEnvelope<T>;
  if (!body.success) {
    const code = body.error_code as ErrorCode | undefined;
    const fallback =
      code && code in ERROR_MESSAGES ? ERROR_MESSAGES[code as ErrorCode] : GENERIC_REQUEST_FAILED;
    throw new ApiError(body.message ?? fallback, body.error_code, body.errors, res.status);
  }
  return body.data as T;
}

export async function apiList<T>(path: string): Promise<ListData<T>> {
  return api<ListData<T>>(path);
}
