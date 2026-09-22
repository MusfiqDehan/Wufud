import type { ApiEnvelope } from "@wufud/contracts";

export const ACCESS_STORAGE_KEY = "wufud_access";

/** Refresh this many ms before JWT `exp` so users rarely hit a 401. */
const REFRESH_BEFORE_EXPIRY_MS = 60_000;

let refreshInFlight: Promise<string | null> | null = null;
let proactiveTimer: ReturnType<typeof setTimeout> | null = null;

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_STORAGE_KEY);
}

export function storeAccessToken(token: string) {
  localStorage.setItem(ACCESS_STORAGE_KEY, token);
  scheduleProactiveAccessRefresh();
}

export function clearStoredAccessToken() {
  localStorage.removeItem(ACCESS_STORAGE_KEY);
  stopProactiveAccessRefresh();
}

function getBase() {
  return "";
}

export function accessTokenExpiresAt(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

export function stopProactiveAccessRefresh() {
  if (proactiveTimer !== null) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
}

export function scheduleProactiveAccessRefresh() {
  stopProactiveAccessRefresh();
  if (typeof window === "undefined") return;

  const token = getStoredAccessToken();
  if (!token) return;

  const exp = accessTokenExpiresAt(token);
  if (!exp) return;

  const delay = exp * 1000 - Date.now() - REFRESH_BEFORE_EXPIRY_MS;
  if (delay <= 0) {
    void refreshAccessToken().then((next) => {
      if (next) scheduleProactiveAccessRefresh();
    });
    return;
  }

  proactiveTimer = setTimeout(() => {
    void refreshAccessToken().then((next) => {
      if (next) scheduleProactiveAccessRefresh();
    });
  }, delay);
}

/** Uses httpOnly refresh cookie; dedupes concurrent callers. */
export async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const host = window.location.host;
    const res = await fetch(`${getBase()}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-Host": host },
      credentials: "include",
      cache: "no-store",
      body: "{}",
    });
    if (!res.ok) return null;

    const body = (await res.json()) as ApiEnvelope<{ access_token?: string }>;
    const access = body.success ? body.data?.access_token : undefined;
    if (!access) return null;

    storeAccessToken(access);
    return access;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

/** When tab becomes visible, refresh if access token expires within two minutes. */
export function refreshAccessIfNearExpiry() {
  const token = getStoredAccessToken();
  if (!token) return;
  const exp = accessTokenExpiresAt(token);
  if (!exp) return;
  if (exp * 1000 - Date.now() > 120_000) return;
  void refreshAccessToken().then((next) => {
    if (next) scheduleProactiveAccessRefresh();
  });
}
