import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  API_PORT: z.coerce.number().default(4400),
  DATABASE_URL: z.string().default("postgresql://wufud:wufud@localhost:55432/wufud"),
  REDIS_URL: z.string().default("redis://localhost:56379"),
  JWT_ACCESS_SECRET: z.string().default("local-access-secret-change-me"),
  JWT_REFRESH_SECRET: z.string().default("local-refresh-secret-change-me"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("14d"),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_FROM: z.string().default("Wufud <noreply@wufud.localhost>"),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_SECURE: z.coerce.boolean().default(false),
  WEB_PORT: z.coerce.number().default(3000),
  PUBLIC_WEB_ORIGIN: z.string().optional().default(""),
  SSLCOMMERZ_STORE_ID: z.string().optional().default(""),
  SSLCOMMERZ_STORE_PASSWORD: z.string().optional().default(""),
  STRIPE_PUBLISHABLE_KEY: z.string().optional().default(""),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  INVITE_TENANT_EMAIL: z.string().optional().default(""),
  INVITE_TENANT_SLUG: z.string().optional().default("tenant1"),
  INVITE_TENANT_NAME: z.string().optional().default("Tenant One"),
  PLATFORM_HOST: z.string().default("wufud.localhost"),
  DEMO_PASSWORD: z.string().default("WufudDemo!2026"),
  SEED_DEMO: z.string().default("false"),
  TRAEFIK_DYNAMIC_PATH: z.string().default("../traefik/dynamic/wufud-custom-domains.yml"),
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://wufud.localhost:3000,http://demo.wufud.localhost:3000,http://tenant1.wufud.localhost:3000"),
  SSLCOMMERZ_FALLBACK_PHONE: z.string().default("01700000000"),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  if (parsed.data.NODE_ENV === "production" || parsed.data.NODE_ENV === "staging") {
    const { JWT_ACCESS_SECRET: access, JWT_REFRESH_SECRET: refresh } = parsed.data;
    if (access.length < 32 || refresh.length < 32 || access === refresh ||
        access.startsWith("local-") || refresh.startsWith("local-")) {
      throw new Error("Deployment requires distinct JWT secrets of at least 32 characters.");
    }
  }
  return parsed.data;
}

export const env = loadEnv();
