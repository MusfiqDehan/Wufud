# Changelog

All notable changes to the **Wufud** SaaS platform will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## What's Changed in 1.7 (2026-09-22)

### 🚀 Features & Capabilities

- implement pagination for changelog view with search and category filters ([ccc9bfb](https://github.com/MusfiqDehan/Wufud/commit/ccc9bfb1b567c92bc0398b551d371efc23c2036e)) by @MusfiqDehan

### 🐛 Bug Fixes & Stability

- record tenant webhooks only after verified successful payment ([008032a](https://github.com/MusfiqDehan/Wufud/commit/008032a2dd54c7fd9a19434ced3c46c3548de88e)) by @MusfiqDehan
- harden payment callbacks with session match and stronger tran IDs ([42ee161](https://github.com/MusfiqDehan/Wufud/commit/42ee1617855ceae51ace7ab179ca2c287f5221ea)) by @MusfiqDehan
- block stub payment gateway outside local and test environments ([61402e1](https://github.com/MusfiqDehan/Wufud/commit/61402e12cf19556aa09fdc3107d60c4541a07ad8)) by @MusfiqDehan
- require strong distinct JWT secrets in staging and production ([e15819c](https://github.com/MusfiqDehan/Wufud/commit/e15819ca28cc7e886a4fd8ce7545b57c521c1cee)) by @MusfiqDehan

### ⚡ Performance Improvements

- aggregate tenant accounts report in PostgreSQL with schema-qualified SQL ([dfe84ce](https://github.com/MusfiqDehan/Wufud/commit/dfe84cef40e0c3e50933a2dc3d39e607a98935c7)) by @MusfiqDehan

### 🛠️ Maintenance & Refactoring

- add version 1.7 release summary to root changelog ([f6853de](https://github.com/MusfiqDehan/Wufud/commit/f6853deb047edf66b71b5cd0571558d2b2218b27)) by @MusfiqDehan
- add version 1.7 entry to changelog.json ([d203c31](https://github.com/MusfiqDehan/Wufud/commit/d203c31b4e2a1ca4bb61fac61978ccca812b51e3)) by @MusfiqDehan
- add version 1.7 entry to platform changelog data ([4b6f21b](https://github.com/MusfiqDehan/Wufud/commit/4b6f21b77434e4456805bf0bb2ceb8071e51b127)) by @MusfiqDehan
- cover concurrent booking races and hold expiry in integration spec ([caf379b](https://github.com/MusfiqDehan/Wufud/commit/caf379b6b31bdeac7485ad01147a5bccf1c644e6)) by @MusfiqDehan
- cover payment initiation transaction ID format ([0deeee9](https://github.com/MusfiqDehan/Wufud/commit/0deeee94cf4905772ec357acdba86c2c791ba51e)) by @MusfiqDehan
- extend payment callback idempotency and session validation cases ([c1fd0a7](https://github.com/MusfiqDehan/Wufud/commit/c1fd0a72faaa9ad9bf9d857369e1844d89229c32)) by @MusfiqDehan
- assert stub gateway guard in adapter factory ([0f1036b](https://github.com/MusfiqDehan/Wufud/commit/0f1036bc6070b715704e54060f5f167184ee0b3a)) by @MusfiqDehan
- cover JWT secret validation in env loader ([8552184](https://github.com/MusfiqDehan/Wufud/commit/855218463293bb4e44b8226d92e0779a9ef00757)) by @MusfiqDehan
- expand README design answers for seats, webhooks, reporting, and JWT ([6598717](https://github.com/MusfiqDehan/Wufud/commit/65987170c05996f0100c8ca3db81fd44c3075b26)) by @MusfiqDehan
- add version 1.6 release summary to frontend changelog and root changelog ([285ac1d](https://github.com/MusfiqDehan/Wufud/commit/285ac1d3f7bfb9213cdf3288aef3c241f792d2cf)) by @MusfiqDehan

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.6...1.7

---

## What's Changed in 1.7 (2026-09-22)

### 🚀 Features & Capabilities

- Changelog page paginates release tags (five versions per page) with navigation that respects search and category filters

### 🐛 Bug Fixes & Stability

- Payment webhooks rely on attempt state for idempotency; tenant webhook receipts record only after verified success
- Manual payment rejection enforces branch-scoped RBAC before updating pending records

### 🔒 Security

- Checkout session IDs must match the payment attempt for Stripe and stub gateways; transaction IDs use 96-bit randomness
- Stub payment gateway blocked in staging and production
- Deployment startup rejects weak, identical, or default JWT access and refresh secrets in staging and production

### ⚡ Performance Improvements

- Tenant accounts report aggregates collections, outstanding balances, and ledger totals in PostgreSQL instead of hydrating full tables in Node

### 🛠️ Maintenance & Refactoring

- README design notes expanded for seat locking, webhook idempotency, reporting scale path, and deployment secret requirements

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.6...1.7

---

## What's Changed in 1.6 (2026-09-22)

### 🚀 Features & Capabilities

- Tabbed packages admin for create and edit: basic details, Makkah/Madinah hotels, preset inclusions, and tier pricing with room types
- Users dashboard loads live tenant roles and branches for invites and branch-scoped role assignment with permission previews
- User role assignment API supports branch scope and returns role mapping on member listings

### 🐛 Bug Fixes & Stability

- Business interceptor validation aligned with expanded package and tier admin payloads (hotels, itinerary, tier features)
- Dashboard and reports seat charts aggregate quota by tier and show confirmed + held vs total capacity
- Chart cards and bar charts use flex, capacity-aware scaling so charts stay inside their containers
- POS receipt modal portals printable content to the document body so print and PDF output are no longer blank

### 🛠️ Maintenance & Refactoring

- Traefik edge routing configuration and Prometheus/Grafana monitoring stack for local and staging deployments

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.5...1.6

---

## What's Changed in 1.5 (2026-09-22)

### 🚀 Features & Capabilities

- Modern Changelog page (`/changelog`) with instant search, category filtering, and visual release timeline
- Real-time System Status page (`/status`) with 90-day uptime calendar and interactive connection latency probe
- Automated GitHub Actions release workflow (`.github/workflows/release-changelog.yml`) generating tags and notes from conventional commits
- Detailed backend health diagnostic probe (`/api/v1/health/detailed`) measuring database and Redis roundtrip latency
- Configured automated production deployment triggered from `main` branch within the GitHub `production` environment

### 🐛 Bug Fixes & Stability

- Timezone-safe release date formatting to consistently display September 21, 2026 across all client locales
- Standardized project title format and metadata across public context and platform controllers

### ⚡ Performance Improvements

- Sub-2ms healthcheck latency response times for PostgreSQL connection queries and Redis ping probes

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.4...1.5

---

## What's Changed in 1.4 (2026-09-21)

### 🚀 Features & Capabilities

- Dynamic payment gateway adapters for SSLCommerz and Stripe with automated callback verification
- Schema-per-tenant isolation (`t_<slug>`) with instant provisioning and dynamic DDL migration
- Seat capacity management with high-concurrency reservation locks and automated hold timers
- Pilgrim portal for family bookings, multi-currency SAR/BDT disbursements, and installment schedules
- Agency dashboard with branch-scoped RBAC, POS terminal sales, and financial reconciliations
- Traefik edge reverse proxy integration with automated SSL termination and host-based domain routing

### 🐛 Bug Fixes & Stability

- Fixed tenant schema switching interceptor for asynchronous worker queues
- Improved seat counter reconciliation during installment defaults and refund processing

### 🛠️ Maintenance & Refactoring

- Upgraded NestJS to 11 and Next.js to 15 with React 19 support
- Enhanced monorepo contracts package (`@wufud/contracts`) for shared DTOs and error definitions
- Configured multi-environment Docker Compose stacks for local, staging, and production

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/releases/tag/1.4
