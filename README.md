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

- Platform: http://wufud.localhost:3000 (and http://localhost:3000)
- Demo agency: http://demo.wufud.localhost:3000
- API health: http://localhost:4400/api/v1/health (legacy `/api/health` still works)
- OpenAPI (Swagger): http://localhost:4400/api/docs — every endpoint is versioned as `/api/v1/...` with a short description plus example request/response; use **Authorize** with a Bearer token from `POST /api/v1/auth/login`.
- Mailpit: http://localhost:8025

`*.localhost` resolves to 127.0.0.1 without a hosts file.

Local compose publishes Postgres on `55432`, Redis on `56379`, and the API on `4400` so it can sit beside other stacks. Match those in `.env.local` (see `.env.local.example`).

## Host-specific experiences

Keep both services running with `pnpm dev`: the frontend resolves each host through the backend at `localhost:4400`.

- `wufud.localhost:3000`: Wufud platform marketing and the navy platform console at `/admin`.
- `demo.wufud.localhost:3000`: Nur Travels storefront, pilgrim registration, and agency operations at `/dashboard`.
- Agency names and branding come from `/api/public/context`; tenant pages do not fall back to platform marketing when the API is unavailable.
- Sign in with each account on its matching hostname. Workspace navigation respects tenant features and user permissions.

With the seeded database and both servers running, verify the live host routing and admin experiences:

```bash
CI=1 PLAYWRIGHT_BASE_URL=http://wufud.localhost:3000 pnpm --filter frontend exec playwright test e2e/tenancy.spec.ts e2e/acceptance.spec.ts --workers=1
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

**Seat overselling.** Booking create runs in one transaction, `SELECT … FOR UPDATE` on `package_tiers`, then increments `seats_held`. A `CHECK (seats_confirmed + seats_held <= seats_total)` constraint is the hard stop. Expired holds are released by a BullMQ job.

**Duplicate / out-of-order webhooks.** Each attempt has a unique `tran_id`. Successful attempts no-op; verified success can supersede an earlier failed/cancelled redirect. Attempt and booking locks serialize concurrent callbacks. Provider event ids are unique on `webhook_events`. Amount is re-validated with the provider, not trusted from the callback body.

**Reporting.** Lists use keyset (cursor) pagination. Summary reports currently aggregate tenant records and retain archived financial history. Daily snapshots are stored in `daily_booking_stats`; very large tenants will require database-side aggregation before scaling.

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
