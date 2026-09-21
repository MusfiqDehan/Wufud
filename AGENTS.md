# Wufud — AI Agent Context

> **Wufūd** (وفود) — a schema-per-tenant Hajj & Umrah booking SaaS.
> Read this file to understand the project structure, architecture, and conventions before making changes.

---

## 1. High-Level Architecture

```
┌─────────────┐     ┌──────────┐     ┌────────────────────┐
│  Cloudflare  │────▶│  Traefik  │────▶│  Next.js (port 3000)│ ← Frontend
└─────────────┘     └──────────┘     └────────────────────┘
                         │                      │
                         │  /api/*               │ rewrites /api/* →
                         ▼                      ▼
                   ┌────────────────────┐  ┌────────────────┐
                   │ NestJS API (4400)  │  │ BullMQ Worker  │
                   └────────────────────┘  └────────────────┘
                         │       │              │       │
                         ▼       ▼              ▼       ▼
                   ┌──────────┐ ┌──────┐  ┌──────────┐ ┌──────┐
                   │PostgreSQL│ │Redis │  │PostgreSQL│ │Redis │
                   │(public + │ │      │  │          │ │      │
                   │ t_<slug>)│ │      │  │          │ │      │
                   └──────────┘ └──────┘  └──────────┘ └──────┘
```

- **Edge**: Cloudflare → Traefik (TLS, host routing, custom domains)
- **Frontend**: Next.js 15 / React 19 / Tailwind 4 / TanStack Query
- **Backend**: NestJS 11 / MikroORM 6 / PostgreSQL 17 / BullMQ / Redis
- **Shared contracts**: `@wufud/contracts` — shared DTOs, enums, error codes, feature registry
- **Multi-tenancy**: `public` schema for platform entities + `t_<slug>` schema per tenant
- **Host routing**: `wufud.localhost` = platform; `<slug>.wufud.localhost` = tenant storefront

---

## 2. Monorepo Structure

```
pnpm-workspace.yaml          # Workspaces: backend, frontend, packages/*
package.json                 # Root scripts: dev, build, lint, typecheck, test, seed, migrate
tsconfig.base.json           # Shared TS config (ES2022, NodeNext)
```

| Workspace | Package name | Description |
|---|---|---|
| `backend/` | `backend` | NestJS API server + BullMQ worker |
| `frontend/` | `frontend` | Next.js web app |
| `packages/contracts/` | `@wufud/contracts` | Shared TypeScript contracts (DTOs, error codes, features, levels) |

**Package manager**: pnpm 11.10+ · **Node**: ≥22

---

## 3. File Tree

```
Wufud/
├── .env.local.example          # Local env template
├── .env.production.example     # Production env template
├── .env.staging.example        # Staging env template
├── .github/
│   ├── dependabot.yml
│   └── workflows/
│       ├── ci.yml              # PR/push: test, typecheck, build
│       ├── build-images.yml    # Docker image builds
│       ├── deploy-staging.yml  # Deploy to staging
│       └── deploy-production.yml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── nest-cli.json
│   ├── tsconfig.json / tsconfig.build.json
│   ├── jest.config.cjs
│   └── src/
│       ├── main.ts                 # HTTP bootstrap (port, CORS, Swagger, pipes)
│       ├── worker.ts               # BullMQ worker entry
│       ├── app.module.ts           # Root module: imports all feature modules
│       ├── mikro-orm.public.config.ts
│       ├── access/                 # RBAC: roles, permissions, branches, feature gates
│       │   ├── entities/           # Branch, Role, RolePermission, UserRole, PlatformRole, etc.
│       │   ├── access.controller.ts
│       │   ├── rbac.service.ts
│       │   └── require-feature.guard.ts
│       ├── accounts/               # Financial: vendors, disbursements, stock, expenses, POS
│       │   ├── entities/           # Payment, ManualPayment, Vendor, StockItem, PosSale, etc.
│       │   ├── accounts.controller.ts
│       │   ├── accounts.service.ts
│       │   └── pos.controller.ts
│       ├── booking/                # Packages, bookings, installments, cancellations
│       │   ├── entities/           # TravelPackage, PackageTier, Booking, Installment, etc.
│       │   ├── booking.controller.ts
│       │   ├── booking.service.ts
│       │   └── installment.schedule.ts
│       ├── cli/                    # CLI scripts (run via ts-node)
│       │   ├── migrate-public.ts   # Run public schema migrations
│       │   ├── migrate-tenants.ts  # Run per-tenant schema migrations
│       │   ├── seed-demo.ts        # Seed demo data (~33KB, comprehensive)
│       │   ├── repair-seat-counters.ts
│       │   └── migrate-account-features.ts
│       ├── database/
│       │   └── entities.ts         # Central entity registry (PUBLIC_ENTITIES + TENANT_ENTITIES)
│       ├── identity/               # Auth: login, register, JWT, users
│       │   ├── entities/           # User, Invitation
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   └── jwt.guard.ts
│       ├── jobs/                   # BullMQ scheduled jobs (hold expiry, installment reminders)
│       │   ├── jobs.module.ts
│       │   └── jobs.service.ts
│       ├── mail/                   # Email: SMTP, templates, tenant email accounts
│       │   ├── entities/           # PlatformEmailAccount, TenantEmailAccount
│       │   ├── mail.controller.ts
│       │   └── mail.service.ts
│       ├── migrations/
│       │   └── public/             # MikroORM migrations for public schema
│       ├── payments/               # Payment gateways, callbacks, webhook processing
│       │   ├── adapters/           # Gateway adapters (strategy pattern)
│       │   │   ├── base.adapter.ts
│       │   │   ├── factory.ts
│       │   │   ├── sslcommerz.adapter.ts
│       │   │   ├── stripe.adapter.ts
│       │   │   └── stub.adapter.ts
│       │   ├── entities/           # PaymentGatewayCatalog, TenantGatewayInstance, PaymentAttempt
│       │   ├── payments.controller.ts
│       │   └── payments.service.ts
│       ├── platform/               # Platform admin: tenants, plans, subscriptions, onboarding
│       │   ├── entities/           # Plan, TenantSubscription, AgencySignup, SEO, etc.
│       │   ├── platform.controller.ts
│       │   ├── onboarding.controller.ts
│       │   └── platform.service.ts
│       ├── shared/                 # Cross-cutting: config, audit, pagination, errors, Swagger
│       │   ├── audit/              # Audit logging
│       │   ├── cache/              # Redis cache helpers
│       │   ├── config/             # env.ts (config loader)
│       │   ├── crud/               # Generic CRUD utilities
│       │   ├── decorators/         # Custom decorators (@Public, @CurrentUser, etc.)
│       │   ├── dto/                # Shared DTOs
│       │   ├── entities/           # BaseEntity, Asset
│       │   ├── errors/             # Business exception classes
│       │   ├── filters/            # Global exception filter
│       │   ├── health/             # Health check endpoint
│       │   ├── interceptors/       # Success envelope, business, schema interceptors
│       │   ├── pagination/         # Keyset (cursor) pagination
│       │   ├── swagger/            # Swagger/OpenAPI setup
│       │   ├── utils/              # Misc utilities
│       │   └── validation/         # Validation pipe factory
│       ├── tenancy/                # Multi-tenancy core
│       │   ├── entities/           # Tenant, Domain, PlatformDomain
│       │   ├── tenant-context.ts   # AsyncLocalStorage tenant store
│       │   ├── tenant-resolver.middleware.ts  # Host → tenant resolution
│       │   ├── schema.interceptor.ts          # Sets em.schema = t_<slug>
│       │   ├── tenant-ddl.ts       # DDL for tenant schema creation (~17KB)
│       │   ├── provisioning.service.ts
│       │   └── traefik-sync.service.ts
│       └── types/                  # Ambient type declarations
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.ts          # Rewrites /api/* → backend
│   ├── playwright.config.ts
│   ├── tsconfig.json
│   ├── e2e/                    # Playwright E2E tests
│   │   ├── acceptance.spec.ts
│   │   ├── accounts.spec.ts
│   │   ├── business-access.spec.ts
│   │   ├── dark-mode.spec.ts
│   │   ├── design.spec.ts
│   │   ├── onboarding.spec.ts
│   │   ├── permissions.spec.ts
│   │   ├── pos.spec.ts
│   │   ├── smoke.spec.ts
│   │   ├── tenancy.spec.ts
│   │   └── tenant-packages.spec.ts
│   ├── public/                 # Static assets
│   └── src/
│       ├── middleware.ts       # Injects x-wufud-host header for SSR host detection
│       ├── app/                # Next.js App Router
│       │   ├── layout.tsx      # Root layout
│       │   ├── page.tsx        # Landing page (platform or tenant storefront)
│       │   ├── globals.css     # Tailwind 4 + custom CSS
│       │   ├── robots.ts / sitemap.ts
│       │   ├── login/          # Auth pages
│       │   ├── register/
│       │   ├── invite/
│       │   ├── start/          # Agency onboarding
│       │   ├── packages/       # Public package browsing
│       │   ├── portal/         # Pilgrim portal
│       │   ├── admin/          # Platform superadmin console
│       │   │   ├── tenants/    # Tenant management
│       │   │   ├── billing/    # Platform billing
│       │   │   ├── plans/      # Subscription plans
│       │   │   ├── features/   # Feature flag management
│       │   │   ├── gateways/   # Payment gateway catalog
│       │   │   ├── email/      # Platform email config
│       │   │   ├── domains/    # Domain management
│       │   │   ├── seo/        # Platform SEO
│       │   │   └── audit/      # Platform audit log
│       │   └── dashboard/      # Tenant agency dashboard
│       │       ├── bookings/
│       │       ├── packages/
│       │       ├── payments/
│       │       ├── refunds/
│       │       ├── pilgrims/
│       │       ├── users/
│       │       ├── branches/
│       │       ├── permissions/
│       │       ├── pos/
│       │       ├── accounts/   # Accounts hub
│       │       │   ├── vendors/
│       │       │   ├── disbursements/
│       │       │   ├── expenses/
│       │       │   ├── stock/
│       │       │   └── settlements/
│       │       ├── reports/
│       │       ├── gateways/
│       │       ├── email/
│       │       ├── domains/
│       │       ├── seo/
│       │       ├── settings/
│       │       └── audit/
│       ├── components/
│       │   ├── ui/             # Radix-based primitives (button, card, dialog, input, etc.)
│       │   ├── layout/         # Shell components (dashboard, marketing, auth, guarded)
│       │   ├── data/           # Data display components
│       │   ├── marketing/      # Marketing/landing page components
│       │   ├── payments/       # Payment UI flows
│       │   ├── platform/       # Platform admin components
│       │   └── pos/            # POS components
│       ├── features/
│       │   ├── crud.ts         # Generic CRUD hook factory
│       │   ├── portal.tsx      # Pilgrim portal feature
│       │   └── accounts/       # Accounts feature components
│       └── lib/
│           ├── api.ts          # Fetch wrapper (auth, error handling)
│           ├── api-error.ts    # API error parser
│           ├── auth.ts         # Auth context/hooks
│           ├── host.ts         # Host detection utilities
│           ├── utils.ts        # cn() and misc utilities
│           └── validation.ts   # Zod schemas shared with forms
│
├── packages/
│   └── contracts/              # @wufud/contracts
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts        # Barrel export
│           ├── dto.ts          # Shared DTO types
│           ├── envelope.ts     # API response envelope shape
│           ├── error-codes.ts  # ErrorCode enum + user-safe messages
│           ├── features.ts     # Feature registry (TENANT/PILGRIM/PLATFORM), RBAC types
│           ├── levels.ts       # Permission levels (view/edit/full)
│           └── success-messages.ts
│
├── docs/
│   ├── HLD.md                  # High-level design (Mermaid flowchart)
│   ├── ERD.md                  # Entity-relationship diagram (Mermaid)
│   └── BUSINESS_RULES.md       # Detailed business rules, policies, verification steps
│
├── scripts/
│   └── docker-local-test.sh    # Build + smoke test script
│
├── traefik/                    # Traefik reverse proxy (git submodule)
│   ├── traefik.yml             # Static config
│   ├── dynamic/                # Dynamic routing config
│   ├── certs/                  # TLS certificates
│   ├── monitoring/             # Prometheus + Grafana
│   └── docker-compose.traefik.yml
│
├── docker-compose.local.yml    # Dev environment (bind mounts, Mailpit)
├── docker-compose.test.yml     # CI test services (Postgres + Redis)
├── docker-compose.staging.yml  # Staging (GHCR images, Traefik)
└── docker-compose.prod.yml     # Production
```

---

## 4. Multi-Tenancy Model

| Concept | Implementation |
|---|---|
| **Platform schema** | `public` — tenants, users, plans, subscriptions, platform roles, gateway catalog, platform email |
| **Tenant schema** | `t_<slug>` — all booking, payment, access, accounts entities |
| **Tenant resolution** | `tenant-resolver.middleware.ts` reads `Host` header → looks up slug/domain → stores in `AsyncLocalStorage` |
| **Schema switching** | `schema.interceptor.ts` sets `em.schema = t_<slug>` on every request |
| **Provisioning** | `provisioning.service.ts` + `tenant-ddl.ts` creates full DDL for new tenant schemas |
| **Host experiences** | `wufud.localhost` = platform marketing + `/admin`; `<slug>.wufud.localhost` = agency storefront + `/dashboard` |

---

## 5. Database Entities & Relationships

All entities extend `BaseEntity` (UUID v7 PK, `createdAt`, `updatedAt`, `isActive`, `isDeleted`, `deletedAt`, soft-delete filter) unless noted as `UuidEntity` (UUID PK only, no soft-delete — used for join tables and hard-delete entities).

### 5.1 Entity Relationship Diagram

```mermaid
erDiagram
    %% ── Public Schema ──────────────────────────────────────────
    Tenant ||--o{ Domain : "has domains"
    Tenant ||--o{ User : "has members"
    Tenant ||--o{ TenantSubscription : "billed via"
    Tenant ||--o{ TenantFeatureOverride : "feature overrides"
    Plan ||--o{ TenantSubscription : "covers"
    Plan ||--o{ AgencySignup : "chosen plan"
    TenantSubscription ||--o{ SubscriptionInvoice : "invoiced"
    User ||--o{ PlatformUserRole : "platform access"
    PlatformRole ||--o{ PlatformUserRole : "assigned to"
    PlatformRole ||--o{ PlatformRolePermission : "grants"

    %% ── Tenant Schema: Access ──────────────────────────────────
    Role ||--o{ RolePermission : "grants"
    Role ||--o{ UserRole : "assigned to"
    Branch ||--o{ UserRole : "scopes"

    %% ── Tenant Schema: Booking ─────────────────────────────────
    TravelPackage ||--o{ PackageTier : "has tiers"
    TravelPackage }o--o| Branch : "belongs to"
    PackageTier ||--o{ Booking : "booked under"
    PackageTier ||--o{ SeatHold : "holds seats"
    Booking ||--o{ BookingPilgrim : "has pilgrims"
    Booking ||--o{ SeatHold : "reserves via"
    Booking ||--o{ InstallmentPlan : "may have"
    Booking ||--o{ Payment : "receives"
    Booking ||--o{ ManualPayment : "receives manual"
    Booking ||--o{ Cancellation : "cancelled via"
    Booking ||--o{ RefundRequest : "refund claims"
    Booking }o--o| Branch : "originated at"
    InstallmentPlan ||--o{ Installment : "schedule"
    ManualPayment }o--o| Branch : "recorded at"

    %% ── Tenant Schema: Accounts ────────────────────────────────
    Vendor ||--o{ VendorDisbursement : "receives"
    VendorDisbursement }o--o| Booking : "for booking"
    StockItem ||--o{ StockIssue : "issued as"
    StockItem ||--o{ PosSale : "sold via (lines)"
    StockIssue }o--o| Booking : "issued to"
    SettlementReport ||--o{ ReconciliationItem : "contains"

    %% ── Tenant Schema: Payments ────────────────────────────────
    PaymentGatewayCatalog ||--o{ TenantGatewayInstance : "enabled as"
```

### 5.2 Public Schema Entities (18)

#### Tenancy & Identity

| Entity | Table | Key Fields | Relationships |
|---|---|---|---|
| **Asset** | `assets` | `url`, `mimeType`, `originalFilename`, `altText`, `sizeBytes` | Standalone; linked via `AssetRelation` |
| **Tenant** | `tenants` | `name`, `slug` (unique), `schemaName` (unique), `status` (active/trial/suspended/cancelled), `isEnabled`, `features` (JSON), `maxUsers`, `maxBranches`, `currency`, `timezone` | → many `Domain`, → many `User` |
| **Domain** | `domains` | `domain` (unique), `isPrimary`, `verificationToken`, `verifiedAt` | → one `Tenant` |
| **PlatformDomain** | `platform_domains` | `host` (unique), `isPrimary` | Standalone |
| **User** | `users` | `email`, `phone`, `fullName`, `emailVerified`, `passwordHash` (hidden), `lastLogin`, `refreshTokenHash` (hidden) | → one `Tenant` (nullable) |
| **Invitation** | `invitations` | `email`, `fullName`, `tokenHash`, `type` (employee/tenant_owner/platform), `expiresAt`, `acceptedAt`, `tenantId`, `invitedById` | Standalone (FK via UUID fields) |

#### Platform Administration

| Entity | Table | Key Fields | Relationships |
|---|---|---|---|
| **PlatformRole** | `platform_roles` | `name`, `slug` (unique), `isSystem`, `color` | → many `PlatformRolePermission` |
| **PlatformRolePermission** | `platform_role_permissions` | `moduleKey`, `permissionLevel` (none/view/edit/full) | → one `PlatformRole` |
| **PlatformUserRole** | `platform_user_roles` | `userId`, `assignedById` · Unique: `[userId, role]` | → one `PlatformRole` |
| **Plan** | `plans` | `name`, `slug` (unique), `priceMonthly` (decimal), `currency`, `features` (JSON string[]), `maxUsers`, `maxBranches`, `trialDays`, `invitationExpiresHours` | → many `TenantSubscription`, → many `AgencySignup` |
| **AgencySignup** | `agency_signups` | `agencyName`, `slug`, `ownerEmail`, `ownerFullName`, `passwordHash`, `mode` (trial/paid), `status` (pending/provisioned/failed/expired), `gatewaySlug`, `tranId`, `tenantId` | → one `Plan` |
| **TenantSubscription** | `tenant_subscriptions` | `status` (trialing/active/past_due/cancelled), `currentPeriodStart`, `currentPeriodEnd` | → one `Tenant`, → one `Plan` |
| **SubscriptionInvoice** | `subscription_invoices` | `amount` (decimal), `currency`, `status` (open/paid/void), `paidAt` | → one `TenantSubscription` |
| **TenantFeatureOverride** | `tenant_feature_overrides` | `featureKey`, `enabled` · Unique: `[tenant, featureKey]` | → one `Tenant` |
| **PlatformSeoSettings** | `platform_seo_settings` | `title`, `description`, `ogImageUrl`, `keywords`, `robots` | Standalone |
| **PlatformAuditLog** | `platform_audit_logs` | `actorId`, `action`, `targetType`, `targetId`, `metadata` (JSON) | Standalone |
| **PaymentGatewayCatalog** | `payment_gateway_catalog` | `slug` (unique), `name`, `isEnabledForTenants`, `configSchema` (JSON), `platformCredentials` (JSON, hidden), `isSandbox`, `isDefault` | → many `TenantGatewayInstance` |
| **PlatformPaymentAttempt** | `platform_payment_attempts` | `tranId` (unique), `gatewaySlug`, `amount` (decimal), `currency`, `status` (init/pending/success/failed/cancelled), `sourceRef`, `valId`, `gatewayResponse` (JSON) | Standalone (extends `UuidEntity`, no soft-delete) |
| **PlatformEmailAccount** | `platform_email_accounts` | `label`, `host`, `port`, `username`, `password` (hidden), `fromAddress`, `fromName`, `useSsl`, `isDefault` | Standalone |

### 5.3 Tenant Schema Entities (33)

#### Access Control (schema: `t_<slug>`)

| Entity | Table | Key Fields | Relationships |
|---|---|---|---|
| **Branch** | `branches` | `name`, `code` (unique), `isHeadquarters`, `status` (active/maintenance/opening_soon/closed), `managerId`, `address`, `city`, `phone`, `email` | → many `UserRole`, referenced by `TravelPackage`, `Booking`, `ManualPayment` |
| **Role** | `roles` | `name`, `slug` (unique), `description`, `isSystem`, `color` | → many `RolePermission`, → many `UserRole` |
| **RolePermission** | `role_permissions` | `featureKey`, `permissionLevel` (none/view/edit/full) · Unique: `[role, featureKey]` | → one `Role` (extends `UuidEntity`) |
| **UserRole** | `user_roles` | `userId`, `userEmail`, `assignedByEmail` · Unique: `[userId, role, branch]` | → one `Role`, → one `Branch` (nullable) (extends `UuidEntity`) |

#### Booking & Pilgrims

| Entity | Table | Key Fields | Relationships |
|---|---|---|---|
| **TravelPackage** | `packages` | `name`, `kind` (hajj/ramadan_umrah/offseason_umrah/ziyarah), `departureDate`, `bookingOpensAt`, `bookingClosesAt`, `durationDays`, `maxPilgrims`, `makkahHotel`, `madinahHotel`, `airline`, `flightRoute`, `inclusions` (JSON), `itinerary` (JSON), `featured`, `bannerImage` | → many `PackageTier`, → one `Branch` (nullable) |
| **PackageTier** | `package_tiers` | `name`, `price` (decimal), `currency`, `seatsTotal`, `seatsConfirmed`, `seatsHeld`, `roomType`, `features` (JSON) · **CHECK**: `seats_confirmed + seats_held <= seats_total` | → one `TravelPackage`, → many `Booking`, → many `SeatHold` |
| **Booking** | `bookings` | `userId`, `status` (draft/held/confirmed/defaulted/cancelled), `frozenPrice` (decimal), `currency`, `pilgrimCount`, `paymentMode` (full/installment), `amountReceived` (decimal), `holdExpiresAt` | → one `PackageTier`, → one `Branch` (nullable), → many `BookingPilgrim`, → many `Payment`, → many `ManualPayment`, → many `InstallmentPlan`, → many `Cancellation`, → many `RefundRequest`, → many `SeatHold` |
| **BookingPilgrim** | `booking_pilgrims` | `fullName`, `passportNumber`, `nationality`, `dateOfBirth`, `cancelled` | → one `Booking` |
| **SeatHold** | `seat_holds` | `seats`, `expiresAt`, `isOpen` | → one `PackageTier`, → one `Booking` |

#### Installments

| Entity | Table | Key Fields | Relationships |
|---|---|---|---|
| **InstallmentPlan** | `installment_plans` | `downPayment` (decimal) | → one `Booking`, → many `Installment` |
| **Installment** | `installments` | `sequence`, `dueDate`, `amountDue` (decimal), `amountPaid` (decimal), `amountWaived` (decimal), `status` (open/paid/overdue/defaulted) | → one `InstallmentPlan` |

#### Cancellations & Refunds

| Entity | Table | Key Fields | Relationships |
|---|---|---|---|
| **CancellationRule** | `cancellation_rules` | `daysBeforeDeparture`, `chargePercent` (decimal) | Standalone (tenant-wide config) |
| **Cancellation** | `cancellations` | `chargeAmount` (decimal), `reason`, `isPartial` | → one `Booking` |
| **RefundRequest** | `refund_requests` | `amount` (decimal), `status` (requested/approved/processing/paid/rejected), `approvedById`, `note` | → one `Booking` |

#### Payments & Gateways

| Entity | Table | Key Fields | Relationships |
|---|---|---|---|
| **Payment** | `payments` | `source` (gateway/manual), `amount` (decimal), `currency`, `gatewaySlug`, `tranId` | → one `Booking` |
| **ManualPayment** | `manual_payments` | `requestKey` (unique), `receipt` (JSON), `amount` (decimal), `method` (cash/card/bkash/nagad/bank_transfer), `recordedById`, `approvedById`, `status` (pending/approved/rejected) | → one `Booking`, → one `Branch` (nullable) |
| **TenantGatewayInstance** | `tenant_gateway_instances` | `gatewaySlug` (unique), `credentials` (JSON, hidden), `isSandbox`, `isGatewayActive`, `isDefault` | Standalone (references `PaymentGatewayCatalog` via `gatewaySlug`) |
| **PaymentAttempt** | `payment_attempts` | `tranId` (unique), `gatewaySlug`, `amount` (decimal), `currency`, `status` (init/pending/success/failed/cancelled), `sourceRef`, `valId`, `gatewayResponse` (JSON), `validatedAt` | Standalone (extends `UuidEntity`, no soft-delete) |
| **WebhookEvent** | `webhook_events` | `providerEventId` (unique), `gatewaySlug`, `payload` (JSON) | Standalone (extends `UuidEntity`, no soft-delete) |

#### Accounts & Financial

| Entity | Table | Key Fields | Relationships |
|---|---|---|---|
| **Vendor** | `vendors` | `name`, `kind` (hotel/airline/transport/visa/other), `contact` | → many `VendorDisbursement` |
| **VendorDisbursement** | `vendor_disbursements` | `amountSar` (decimal), `fxRate` (decimal), `amountBdt` (decimal), `note` | → one `Vendor`, → one `Booking` (nullable) |
| **StockItem** | `stock_items` | `name`, `kind` (product/service), `salePrice` (decimal), `quantity`, `unitCost` (decimal) | → many `StockIssue` |
| **StockIssue** | `stock_issues` | `quantity`, `costBdt` (decimal), `reversalOf` (unique, nullable) | → one `StockItem`, → one `Booking` (nullable) |
| **Expense** | `expenses` | `title`, `amount` (decimal), `currency`, `category` | Standalone |
| **PosSale** | `pos_sales` | `requestKey` (unique), `total` (decimal), `status` (paid/refunded), `lines` (JSON: itemId, name, kind, quantity, unitPrice, stockIssueId), `receipt` (JSON), `refundReceipt` (JSON) | Standalone (references `StockItem` via `lines[].itemId`) |

#### Reconciliation & Operations

| Entity | Table | Key Fields | Relationships |
|---|---|---|---|
| **SettlementReport** | `settlement_reports` | `gatewaySlug`, `periodStart`, `periodEnd`, `status` (open/reconciled) | → many `ReconciliationItem` |
| **ReconciliationItem** | `reconciliation_items` | `tranId`, `gatewayAmount` (decimal), `internalAmount` (decimal, nullable), `status` (matched/mismatch/resolved), `note` | → one `SettlementReport` (extends `UuidEntity`) |
| **DailyBookingStat** | `daily_booking_stats` | `day`, `branchId`, `bookingsCount`, `collected` (decimal), `outstanding` (decimal) | Standalone (extends `UuidEntity`) |
| **AuditLog** | `audit_logs` | `actorId`, `action`, `targetType`, `targetId`, `metadata` (JSON) | Standalone |
| **TenantSettings** | `tenant_settings` | `displayName`, `logoUrl`, `primaryColor`, `title`, `description`, `ogImageUrl`, `keywords`, `currency` | Standalone (one per tenant schema) |
| **TenantEmailAccount** | `tenant_email_accounts` | `label`, `host`, `port`, `username`, `password` (hidden), `fromAddress`, `fromName`, `useSsl`, `isDefault` | Standalone |
| **AssetRelation** | `asset_relations` | `assetId`, `parentType`, `parentId`, `role`, `fieldName`, `sortOrder`, `isPrimary` | Standalone (polymorphic join to any entity via `parentType`/`parentId`, references `Asset` via `assetId`) |

### 5.4 Key Constraints & Patterns

- **Seat safety**: `CHECK (seats_confirmed + seats_held <= seats_total)` on `package_tiers` + `SELECT … FOR UPDATE` on tier row during booking
- **Idempotency keys**: `tranId` unique on `payment_attempts`/`platform_payment_attempts`; `providerEventId` unique on `webhook_events`; `requestKey` unique on `manual_payments`/`pos_sales`
- **Maker-checker**: `ManualPayment` requires `recordedById ≠ approvedById`
- **Soft-delete scope**: All `BaseEntity` descendants (financial records included); `UuidEntity` descendants (`PaymentAttempt`, `WebhookEvent`, `RolePermission`, `UserRole`, `PlatformUserRole`, `ReconciliationItem`, `DailyBookingStat`) have no soft-delete
- **Polymorphic assets**: `AssetRelation` links an `Asset` to any entity via `parentType` + `parentId`
- **Cross-schema references**: `User.tenant` → `Tenant` (public→public), `UserRole.userId` → `User.id` (tenant→public via UUID, no FK)

---

## 6. Backend Modules

| Module | Path | Responsibility |
|---|---|---|
| **TenancyModule** | `src/tenancy/` | Host resolution, schema switching, tenant provisioning, Traefik sync |
| **IdentityModule** | `src/identity/` | Auth (login/register/JWT), user management, invitations |
| **AccessModule** | `src/access/` | RBAC (roles, permissions, branches), feature gates |
| **PlatformModule** | `src/platform/` | Platform admin (tenants, plans, subscriptions, onboarding, SEO) |
| **BookingModule** | `src/booking/` | Packages, tiers, bookings, pilgrims, installments, cancellations, refunds |
| **PaymentsModule** | `src/payments/` | Payment initiation, gateway adapters, webhook processing |
| **AccountsModule** | `src/accounts/` | Vendors, disbursements, stock, expenses, settlements, POS |
| **MailModule** | `src/mail/` | SMTP configuration, email sending, template management |
| **JobsModule** | `src/jobs/` | BullMQ scheduled jobs (hold expiry, installment reminders) |
| **SharedModule** | `src/shared/` | Config, audit, pagination, errors, filters, interceptors, Swagger |

### Global Providers (app.module.ts)
- `GlobalExceptionFilter` — consistent error responses
- `SuccessInterceptor` — wraps responses in envelope `{ success, data, message }`
- `SchemaInterceptor` — sets MikroORM schema per-request
- `BusinessInterceptor` — business-rule validation
- `JwtAuthGuard` — JWT authentication (skip with `@Public()`)
- `RequireFeatureGuard` — feature-flag gate
- `ThrottlerGuard` — 120 req/min rate limiting

---

## 7. Payment Gateways (Adapter Pattern)

| Adapter | File | Use |
|---|---|---|
| **SSLCommerz** | `sslcommerz.adapter.ts` | Bangladesh gateway |
| **Stripe** | `stripe.adapter.ts` | International payments |
| **Stub** | `stub.adapter.ts` | Local development only |

Selected via `factory.ts` based on `TenantGatewayInstance.provider`.

---

## 8. RBAC & Feature System

- **Permission levels**: `none` < `view` < `edit` < `full`
- **System tenant roles**: `admin`, `manager`, `branch_manager`, `accountant`, `agent`, `viewer`, `pilgrim`
- **System platform roles**: `superadmin`, `platform_manager`, `support_agent`
- **Feature gating**: Subscription plan → tenant feature flags → role permissions (three-layer check)
- **Branch scoping**: Users are assigned roles per branch; access is scoped accordingly
- Feature registry lives in `@wufud/contracts` → `features.ts`

---

## 9. Key Commands

```bash
# Install
pnpm install

# Build contracts (MUST run before backend/frontend)
pnpm --filter @wufud/contracts build

# Database
pnpm migrate:public              # Run public schema migrations
pnpm migrate:tenants             # Run per-tenant schema migrations
pnpm seed:demo                   # Seed demo data (idempotent)

# Development
pnpm dev                         # Start API + frontend in parallel

# Quality
pnpm typecheck                   # TypeScript check all packages
pnpm test                        # Backend Jest tests
pnpm lint                        # ESLint all packages

# E2E tests (frontend)
CI=1 PLAYWRIGHT_BASE_URL=http://wufud.localhost:3000 \
  pnpm --filter frontend exec playwright test e2e/<spec>.spec.ts --workers=1

# Docker
docker compose -f docker-compose.local.yml up -d postgres redis mailpit  # Services only
docker compose -f docker-compose.local.yml up -d                         # Full stack
./scripts/docker-local-test.sh                                           # Prod images + smoke
```

---

## 10. Environment Variables

Key variables (see `.env.local.example` for full list):

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://wufud:wufud@localhost:55432/wufud` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:56379` | Redis connection |
| `API_PORT` | `4400` | Backend API port |
| `PLATFORM_HOST` | `wufud.localhost` | Platform domain |
| `JWT_ACCESS_SECRET` | — | JWT signing secret |
| `JWT_REFRESH_SECRET` | — | Refresh token secret |
| `SMTP_HOST` / `SMTP_PORT` | `localhost:1025` | Mail (Mailpit locally) |
| `DEMO_PASSWORD` | `WufudDemo!2026` | Seeded demo accounts |
| `TRAEFIK_DYNAMIC_PATH` | `./traefik/dynamic/...` | Traefik config sync |

Docker compose maps: Postgres → `55432`, Redis → `56379`, API → `4400`, Frontend → `3000`, Mailpit → `8025`.

---

## 11. Demo Accounts

Password: `WufudDemo!2026` (override with `DEMO_PASSWORD`)

| Role | Email | Host |
|---|---|---|
| Platform superadmin | `admin@wufud.local` | `wufud.localhost` |
| Tenant admin | `owner@demo.local` | `demo.wufud.localhost` |
| Branch manager (CTG) | `manager.ctg@demo.local` | `demo.wufud.localhost` |
| Agent | `agent@demo.local` | `demo.wufud.localhost` |
| Pilgrim | `pilgrim@demo.local` | `demo.wufud.localhost` |

---

## 12. API Conventions

- **Base path**: `/api/v1/...` (legacy `/api/...` auto-rewrites to `/api/v1/...`)
- **OpenAPI docs**: `http://localhost:4400/api/docs`
- **Auth**: Bearer JWT via `POST /api/v1/auth/login`
- **Response envelope**: `{ success: boolean, data: T, message?: string }`
- **Error format**: `{ success: false, error: { code: ErrorCode, message: string } }`
- **Pagination**: Keyset (cursor) based — never use offset pagination
- **Validation**: `class-validator` + `class-transformer` + Zod (contracts)
- **Soft delete**: All financial records use soft delete; reports include archived records

---

## 13. Critical Business Rules

1. **Seat overselling prevention**: `SELECT … FOR UPDATE` on `PackageTier` + `CHECK (seats_confirmed + seats_held <= seats_total)` constraint
2. **Hold expiry**: `BOOKING_HOLD_MINUTES` (default 30) — BullMQ job releases expired holds
3. **Price freezing**: Prices frozen at booking creation (not confirmation)
4. **Installment policy**: 30% down + 3 payments between booking and day before departure
5. **Payment application**: Apply to oldest unpaid installment first; excess is refundable
6. **Webhook idempotency**: Unique `tran_id` per attempt; success is idempotent; amount re-validated server-side
7. **Manual payments**: Require separate recorder and approver (maker-checker)
8. **Cancellation charges**: Configurable by `daysBeforeDeparture` threshold + vendor costs
9. **Refund flow**: `requested → approved → processing → paid` (capped against gross receipts)
10. **Currency**: Tenant base = BDT; vendor costs in SAR + FX + BDT equivalent

---

## 14. Testing

| Type | Tool | Location | Command |
|---|---|---|---|
| Unit / Integration | Jest 30 | `backend/src/**/*.spec.ts` | `pnpm test` |
| E2E (browser) | Playwright | `frontend/e2e/*.spec.ts` | `pnpm --filter frontend exec playwright test` |
| Type checking | TypeScript | All workspaces | `pnpm typecheck` |

Backend integration tests create temporary schemas and exercise PostgreSQL locks, concurrency, and business invariants.

---

## 15. CI/CD

| Workflow | Trigger | Steps |
|---|---|---|
| `ci.yml` | PR / push to `main`, `develop` | Install → contracts build → test → typecheck → migrate + seed → frontend build |
| `build-images.yml` | — | Docker image builds |
| `deploy-staging.yml` | — | Deploy to staging (GHCR images + Traefik) |
| `deploy-production.yml` | — | Deploy to production |

---

## 16. Conventions & Patterns

- **Module structure**: Each NestJS module has `entities/`, `*.module.ts`, `*.controller.ts`, `*.service.ts`
- **Entity registry**: All entities must be registered in `backend/src/database/entities.ts` as `PUBLIC_ENTITIES` or `TENANT_ENTITIES`
- **Contracts first**: Shared types, error codes, and feature flags go in `packages/contracts/src/`; rebuild with `pnpm --filter @wufud/contracts build` after changes
- **Frontend routing**: Next.js App Router; `admin/` = platform pages, `dashboard/` = tenant pages, `portal/` = pilgrim pages
- **Component organization**: `components/ui/` = Radix primitives, `components/layout/` = shell/navigation, `components/data/` = tables/charts, `features/` = feature-specific logic
- **CSS**: Tailwind 4 via PostCSS; font: Urbanist; supports dark mode via `next-themes`
- **API client**: `lib/api.ts` wraps fetch with auth headers and error handling
- **Audit trail**: Every successful authenticated tenant mutation creates an audit record (no secrets/passport data logged)
- **Financial integrity**: Nothing financial is hard-deleted; soft-deleted records appear in reports and reconciliation

---

## 17. Further Reading

| Document | Path |
|---|---|
| Project requirements | [`PROJECT_REQUIREMENTS.md`](PROJECT_REQUIREMENTS.md) |
| High-level design | [`docs/HLD.md`](docs/HLD.md) |
| Entity-relationship diagram | [`docs/ERD.md`](docs/ERD.md) |
| Business rules & accounting | [`docs/BUSINESS_RULES.md`](docs/BUSINESS_RULES.md) |
| License | [`LICENSE`](LICENSE) |
