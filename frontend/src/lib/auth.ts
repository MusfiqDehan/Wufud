import { useQuery } from "@tanstack/react-query";
import { canAccessFeature, type AccessMe } from "@wufud/contracts";
import { api } from "./api";
import {
  clearStoredAccessToken,
  getStoredAccessToken,
  storeAccessToken,
} from "./session";

export async function login(email: string, password: string) {
  const data = await api<{ access_token: string; user: { id: string } }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  storeAccessToken(data.access_token);
  return data;
}

export async function storefrontSession(email: string, password: string, fullName?: string) {
  const data = await api<{ access_token: string; user: { id: string } }>("/api/auth/storefront", {
    method: "POST",
    body: JSON.stringify({ email, password, fullName }),
  });
  storeAccessToken(data.access_token);
  return data;
}

export function hasAccessToken() {
  return typeof window !== "undefined" && Boolean(getStoredAccessToken());
}

export function logout() {
  clearStoredAccessToken();
  return api("/api/auth/logout", { method: "POST" });
}

export function getAccess() {
  return api<AccessMe>("/api/access/me");
}

export { canAccessFeature };

/** Shared UI gate: `const { can } = useFeatureAccess(); can("branches","edit")` */
export function useFeatureAccess(queryKey = ["me"]) {
  const me = useQuery({ queryKey, queryFn: getAccess });
  const can = (key: string, level: "view" | "edit" | "full" = "view") =>
    Boolean(me.data && canAccessFeature(key, level, me.data));
  return { me, can };
}
