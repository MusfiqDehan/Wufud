# Wufud

Wufūd (وفود) means “delegations.” This repository is a schema-per-tenant Hajj and Umrah booking SaaS: NestJS + MikroORM on PostgreSQL, Next.js on Tailwind 4, Traefik at the edge.

## Stack

- Backend: NestJS, MikroORM 6, PostgreSQL 17, Redis / BullMQ, Argon2, JWT
- Frontend: Next.js, React 19, Tailwind 4, Urbanist, TanStack Query
- Isolation: `public` platform schema + `t_<slug>` per tenant
- Payments: SSLCommerz, Stripe Checkout, stub (local), manual branch POS
- Access: branch-scoped RBAC from a single `User` model

## Local setup

```bash
cp .env.local.example .env.local
pnpm install
docker compose -f docker-compose.local.yml up -d postgres redis mailpit
# Full stack (installs deps in a Docker volume, runs migrations + seed, then dev):
# docker compose -f docker-compose.local.yml up -d
# Build production images + bring up stack + smoke checks:
# ./scripts/docker-local-test.sh

pnpm --filter @wufud/contracts build
pnpm migrate:public
pnpm seed:demo
pnpm dev # runs the API and frontend together
```

Visit:

- Platform: http://wufud.localhost:3009 (and http://localhost:3009)
- Demo agency: http://demo.wufud.localhost:3009
- API health: http://localhost:4005/api/v1/health (legacy `/api/health` still works)
- OpenAPI (Swagger): http://localhost:4005/api/docs — every endpoint is versioned as `/api/v1/...` with a short description plus example request/response; use **Authorize** with a Bearer token from `POST /api/v1/auth/login`.
- Mailpit: http://localhost:8025

`*.localhost` resolves to 127.0.0.1 without a hosts file.

Local compose publishes Postgres on `55432`, Redis on `56379`, the API on `4005`, and the frontend on `3009` so they can sit beside other stacks. Match those in `.env.local` (see `.env.local.example`).

## Host-specific experiences

Keep both services running with `pnpm dev`: the frontend resolves each host through the backend at `localhost:4005`.

- `wufud.localhost:3009`: Wufud platform marketing and the navy platform console at `/admin`.
- `demo.wufud.localhost:3009`: Nur Travels storefront, pilgrim registration, and agency operations at `/dashboard`.
- Agency names and branding come from `/api/public/context`; tenant pages do not fall back to platform marketing when the API is unavailable.
- Sign in with each account on its matching hostname. Workspace navigation respects tenant features and user permissions.

With the seeded database and both servers running, verify the live host routing and admin experiences:

```bash
CI=1 PLAYWRIGHT_BASE_URL=http://wufud.localhost:3009 pnpm --filter frontend exec playwright test e2e/tenancy.spec.ts e2e/acceptance.spec.ts --workers=1
```

## Demo accounts

Password: `WufudDemo!2026` (override with `DEMO_PASSWORD`)

| Role | Email |
|---|---|
| Platform superadmin | admin@wufud.local |
| Tenant admin | owner@demo.local |
| Branch manager (CTG) | manager.ctg@demo.local |
| Agent | agent@demo.local |
| Pilgrim | pilgrim@demo.local |

## Design answers

**How do we prevent overselling under concurrent bookings?** Creation locks the package-tier row (`SELECT … FOR UPDATE`), checks availability, and creates the booking/hold plus increments `seats_held` in one transaction. PostgreSQL also enforces `seats_confirmed + seats_held <= seats_total`. Confirmation, cancellation, and expiry use row locks; late receipts never resurrect released seats. PostgreSQL integration tests race bookings for the last seat and concurrent hold expiry.

**How do we handle duplicate or out-of-order payment webhooks?** The attempt row is locked; a successful attempt is immutable and its receipt/booking update commits in the same transaction. Verified success can supersede a failed/cancelled redirect. Provider validation checks amount, currency, and transaction/session identity; untrusted session IDs cannot replace the checkout session. Transaction IDs now use 96 random bits. Tenant event receipts are informational: retries rely on attempt state, not a pre-inserted event ID. Recommended next steps: authenticated webhook ingress (Stripe signatures), a durable inbox/outbox with retry/reconciliation, and provider validation outside database locks with a locked recheck before committing.

**How would we keep reporting fast at 5 million users?** Summary totals now aggregate in PostgreSQL with pre-grouped joins, avoiding full financial-table hydration and quadratic JavaScript scans; archived financial records remain included. Keyset lists and daily snapshots already exist, but summary requests still scan tenant history and return all tier quotas—this is not a demonstrated five-million-user design. Add incremental tenant/branch/day rollups, tenant- and permission-scoped caching, paginated quotas, and asynchronous exports; use read replicas or an analytics store for heavy/cross-tenant reporting. Validate indexes and partitioning against query plans and representative load tests; shard tenants across databases when one database reaches measured limits.

The stub gateway is disabled in staging/production. Deployment startup now rejects default, short, or identical JWT signing secrets in staging/production. Set distinct `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values of at least 32 characters before deploying.

## Assumptions and trade-offs

- Booking/POS collections use BDT. Gateway currency must match the booking; branch cash payments use recorder/approver separation.
- Pilgrims are tenant users with the `pilgrim` system role.
- Tenant base currency is BDT; vendor costs record SAR + FX + BDT equivalent.
- Local email goes through Mailpit. Custom domains write Traefik’s file provider.
- NestJS 11 and MikroORM 6 are used.

## Diagrams

See [docs/HLD.md](docs/HLD.md) and [docs/ERD.md](docs/ERD.md).

## Compose files

| File | Use |
|---|---|
| `docker-compose.local.yml` | Dev with bind mounts |
| `docker-compose.test.yml` | Ephemeral Postgres/Redis for CI |
| `docker-compose.staging.yml` | GHCR images behind Traefik |
| `docker-compose.prod.yml` | Same as staging, production hosts |

## License

See [LICENSE](LICENSE).

## Business-rule audit and Accounts workspaces

See [business rules, feature migration, assumptions and verification](docs/BUSINESS_RULES.md). Accounts now has independently gated pages, and `/dashboard/pos` supports product/service cash sales and sale refunds. Run `pnpm migrate:tenants` before starting the updated app.
