# Changelog

All notable changes to the **Wufud** SaaS platform will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## What's Changed in 1.6 (2026-09-22)

### 🚀 Features & Capabilities

- load roles and branches for invite and role assignment on users page ([2341d83](https://github.com/MusfiqDehan/Wufud/commit/2341d8389ef9397daa5398b257c9e338d079770f)) by @MusfiqDehan
- expand tenant packages admin with rich create and edit flows ([27161ae](https://github.com/MusfiqDehan/Wufud/commit/27161aef5cc83d998d864088b9bd4a42f6ac561f)) by @MusfiqDehan
- enhance user role assignment with branch support and improve user retrieval with role mapping ([3c0a3ad](https://github.com/MusfiqDehan/Wufud/commit/3c0a3adb29c3730a9b398991cb31756b5fc6a45a)) by @MusfiqDehan
- add Traefik configuration, monitoring stack, and documentation ([df77a1f](https://github.com/MusfiqDehan/Wufud/commit/df77a1fc7ca27c1837af9667c69b5a1e6cb20b06)) by @MusfiqDehan

### 🐛 Bug Fixes & Stability

- portal POS receipt for reliable print and PDF rendering ([7920682](https://github.com/MusfiqDehan/Wufud/commit/79206823acbb43422d0c8288771ece2edbd763c4)) by @MusfiqDehan
- improve bar chart labels and capacity-aware bar scaling ([37be87b](https://github.com/MusfiqDehan/Wufud/commit/37be87bcf67762faeded92a28663e5ee58ffda50)) by @MusfiqDehan
- give chart cards flex layout so inner charts stay contained ([415aa1b](https://github.com/MusfiqDehan/Wufud/commit/415aa1ba8f3e7ef8369578c098261ee617e63bc9)) by @MusfiqDehan
- show tier capacity on reports seat chart and simplify header ([2ebe35c](https://github.com/MusfiqDehan/Wufud/commit/2ebe35c1769b5cfa19cc41745214d0aa694cb012)) by @MusfiqDehan
- aggregate seat quota by tier on agency dashboard chart ([52e627e](https://github.com/MusfiqDehan/Wufud/commit/52e627edf4619e6dfb873e2d2cf6c303dbf82b1c)) by @MusfiqDehan
- align package and tier business validation with admin payloads ([64811d4](https://github.com/MusfiqDehan/Wufud/commit/64811d4737faae0d59c1fedb411a8b30421415d2)) by @MusfiqDehan
- dynamically read and merge changelog.json in getChangelogEntries ([aae679e](https://github.com/MusfiqDehan/Wufud/commit/aae679e056f665559b4c0673fabbd3efee9ca493)) by @MusfiqDehan

### 🛠️ Maintenance & Refactoring

- refresh frontend TypeScript build info ([221f8e4](https://github.com/MusfiqDehan/Wufud/commit/221f8e4d50487dd63712055c17727c1f0d0b7686)) by @MusfiqDehan
- refresh backend TypeScript build info ([16a6410](https://github.com/MusfiqDehan/Wufud/commit/16a6410d1e1bb515f66115125e2e347b83f3f96d)) by @MusfiqDehan
- guard dashboard and reports chart overflow in containers ([bfe4039](https://github.com/MusfiqDehan/Wufud/commit/bfe4039e362bd9ef0279f4349db6b34ede9b8195)) by @MusfiqDehan
- assert POS receipt print layout and non-blank PDF output ([aa7f73b](https://github.com/MusfiqDehan/Wufud/commit/aa7f73bd5df53878476d3fbf997c62fd88bc6360)) by @MusfiqDehan
- update version 1.5 date to current date September 22, 2026 ([8bfd057](https://github.com/MusfiqDehan/Wufud/commit/8bfd057396746dbb066c60ce48b514543708f401)) by @MusfiqDehan
- add version 1.5 release summary to frontend changelog and root changelog ([1b02b1f](https://github.com/MusfiqDehan/Wufud/commit/1b02b1fc8e239e5248b7cd82a53e49110109b673)) by @MusfiqDehan

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
