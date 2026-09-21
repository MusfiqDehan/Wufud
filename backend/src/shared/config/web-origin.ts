import { env } from "./env";

export function webOriginForHost(host: string) {
  const hostname = host.split(":")[0];
  if (env.PUBLIC_WEB_ORIGIN) {
    try {
      const url = new URL(env.PUBLIC_WEB_ORIGIN);
      url.hostname = hostname;
      return url.origin;
    } catch {
      /* fall through */
    }
  }
  const local = hostname.includes("localhost") || hostname === "127.0.0.1";
  const proto = local ? "http" : "https";
  const port = local ? `:${env.WEB_PORT}` : "";
  return `${proto}://${hostname}${port}`;
}

export function isAllowedWebOrigin(origin?: string | null) {
  if (!origin) return true;
  const listed = env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
  if (listed.includes(origin)) return true;
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    if (host === env.PLATFORM_HOST) return true;
    if (host.endsWith(`.${env.PLATFORM_HOST}`)) return true;
    if (host.endsWith(".localhost") || host === "localhost" || host === "127.0.0.1") return true;
  } catch {
    return false;
  }
  return false;
}
