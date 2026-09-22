import { cache } from "react";
import type { PublicHostContext } from "@wufud/contracts";

export function isPlatformHost(host: string) {
  const h = host.split(":")[0];
  return h === "localhost" || h === "wufud.localhost" || h === "127.0.0.1" || h === "wufud.musfiqdehan.com" || h === "staging.wufud.musfiqdehan.com" || h === "wufud.org";
}

export const fetchContext = cache(async (host: string): Promise<PublicHostContext> => {
  const base = process.env.API_INTERNAL_URL ?? "http://localhost:4005";
  const res = await fetch(`${base}/api/v1/public/context`, {
    headers: { "X-Forwarded-Host": host.split(":")[0] },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  const body = await res.json();
  if (!res.ok || !body.success || !["tenant", "platform"].includes(body.data?.plane)) {
    throw new Error("The site context could not be resolved.");
  }
  return body.data as PublicHostContext;
});
