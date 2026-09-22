import { ErrorCode } from "@wufud/contracts";
import { DomainError } from "../../shared/errors/domain.error";
import { BaseGatewayAdapter, GatewayUrls } from "./base.adapter";
import { SslcommerzAdapter } from "./sslcommerz.adapter";
import { StripeAdapter } from "./stripe.adapter";
import { StubAdapter } from "./stub.adapter";

export function getGateway(
  slug: string,
  credentials: Record<string, string>,
  isSandbox: boolean,
  urls: GatewayUrls,
): BaseGatewayAdapter {
  if (slug === "stub" && (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging")) {
    throw new DomainError(ErrorCode.GATEWAY_UNAVAILABLE, "The stub gateway is only available locally.", 400);
  }
  if (slug === "stub" || process.env.NODE_ENV === "test") {
    return new StubAdapter(credentials, isSandbox, urls);
  }
  if (slug === "sslcommerz") return new SslcommerzAdapter(credentials, isSandbox, urls);
  if (slug === "stripe") return new StripeAdapter(credentials, isSandbox, urls);
  throw new DomainError(ErrorCode.UNKNOWN_GATEWAY, undefined, 400);
}

export function credentialsComplete(schema: { key: string; required: boolean }[] | undefined, creds?: Record<string, string>) {
  const required = (schema ?? []).filter((f) => f.required && f.key).map((f) => f.key);
  return required.every((k) => String(creds?.[k] ?? "").trim() !== "");
}
