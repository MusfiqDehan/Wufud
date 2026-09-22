import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle("Wufud API")
    .setDescription(
      [
        "Hajj & Umrah booking SaaS API (NestJS).",
        "",
        "**Versioning** — canonical routes are versioned as `/api/v1/...`",
        "(e.g. `POST /api/v1/auth/login`, `GET /api/v1/packages`).",
        "Legacy unversioned `/api/...` requests are rewritten to `/api/v1/...`",
        "for backward compatibility. Breaking changes will ship as `/api/v2/...` side-by-side.",
        "",
        "**Response envelope** — JSON bodies use:",
        "- Success: `{ success: true, message, data }`",
        "- List: `{ success: true, message, data: { items, pagination?, meta? } }`",
        "- Error: `{ success: false, message, error_code, errors? }`",
        "",
        "**Tenancy** — Send `X-Forwarded-Host` (or browser `Host`) so the API resolves platform vs tenant plane.",
        "Example: `X-Forwarded-Host: demo.wufud.localhost`.",
        "",
        "**Auth** — Bearer JWT from `POST /api/v1/auth/login` for protected routes. Click Authorize below.",
        "",
        "**Try it** — expand any endpoint to see a short description plus example request/response.",
      ].join("\n"),
    )
    .setVersion("1.0.0")
    .addServer("http://localhost:4005", "Local API (versioned: /api/v1/...)")
    .addTag("Health", "Liveness probe. No auth required.")
    .addTag("Public", "Host/tenant resolution for marketing pages. No auth required.")
    .addTag("Auth", "Login, register, pilgrim storefront sessions, refresh, invites.")
    .addTag("Access", "Caller identity (/access/me), branches, roles, assignments.")
    .addTag("Users", "Tenant user directory and invitations.")
    .addTag("Booking", "Public packages, agency packages, bookings, pilgrims, refunds, audit.")
    .addTag("Payments", "Gateway catalog, tenant gateways, initiate, IPN/callbacks.")
    .addTag("Mail", "Dynamic SMTP accounts for platform and tenant email, with a single default mailbox.")
    .addTag("Accounts", "Manual payments, ledger, vendors, stock, expenses, settlements, settings, domains.")
    .addTag("Platform", "SaaS admin: tenants, features, plans, billing, domains, SEO, audit.")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, "access-token")
    .addApiKey({ type: "apiKey", in: "header", name: "X-Forwarded-Host" }, "tenant-host")
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (_controllerKey, methodKey) => methodKey,
  });

  SwaggerModule.setup("api/docs", app, document, {
    jsonDocumentUrl: "api/docs-json",
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "list",
      tagsSorter: "alpha",
    },
  });
}
