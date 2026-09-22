# Changelog

All notable changes to the **Wufud** SaaS platform will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## What's Changed in 1.22 (2026-09-22)

### 🚀 Features & Capabilities

- implement client-side authentication state management with hooks ([a173053](https://github.com/MusfiqDehan/Wufud/commit/a173053be64518cd881a40af36c8e11925696765)) by @MusfiqDehan
- add notification for authentication state changes on token store and clear ([ba42b6c](https://github.com/MusfiqDehan/Wufud/commit/ba42b6c46cba4277cd307ba5041e49f7e8667bb6)) by @MusfiqDehan
- implement sign-in and sign-out toggle in SiteFooter component ([bc2fd28](https://github.com/MusfiqDehan/Wufud/commit/bc2fd28a78586d17b590f3e9dc4678d96826e308)) by @MusfiqDehan
- add sign-out functionality to MarketingShell component ([afe0af2](https://github.com/MusfiqDehan/Wufud/commit/afe0af2effc9aec7582d974ae1eb3f8609fcee4d)) by @MusfiqDehan

### 🛠️ Maintenance & Refactoring

- update TypeScript build information for frontend ([baba447](https://github.com/MusfiqDehan/Wufud/commit/baba447932faddd06600113da91f002705958bd9)) by @MusfiqDehan

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.21...1.22

---

## What's Changed in 1.21 (2026-09-22)

### 🛠️ Maintenance & Refactoring

- enhance README with improved formatting, additional demo account details, and updated design diagrams ([e11e1ee](https://github.com/MusfiqDehan/Wufud/commit/e11e1ee00d4a80fb13bf0f1e70267b8ee44c473e)) by @MusfiqDehan
- expand ERD documentation with detailed entity relationships and attributes ([61bfff5](https://github.com/MusfiqDehan/Wufud/commit/61bfff54511b613ef0af53adb7c9d37b113ef185)) by @MusfiqDehan

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.20...1.21

---

## What's Changed in 1.20 (2026-09-22)

### 🛠️ Maintenance & Refactoring

- update README to clarify project description and purpose ([a1d8926](https://github.com/MusfiqDehan/Wufud/commit/a1d8926792b42f3ffcaff0ae7a12036353f5b083)) by @MusfiqDehan

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.19...1.20

---

## What's Changed in 1.19 (2026-09-22)

### 🚀 Features & Capabilities

- wire SessionKeeper into app providers ([a0f0c57](https://github.com/MusfiqDehan/Wufud/commit/a0f0c57e004fe337eff9d96a8fbd45a40d16bc74)) by @MusfiqDehan
- mount session keeper for proactive JWT refresh ([2374672](https://github.com/MusfiqDehan/Wufud/commit/2374672e97ad616d329d8b3bbc7ac5d496b4b57b)) by @MusfiqDehan
- retry API calls after transparent access-token refresh on 401 ([5a95ca8](https://github.com/MusfiqDehan/Wufud/commit/5a95ca8e6a1207ce475686e1f488e12143c60c75)) by @MusfiqDehan
- add session helpers for proactive and on-demand access refresh ([1c5f81e](https://github.com/MusfiqDehan/Wufud/commit/1c5f81ede7709dc31f488a0f88475abe4eaffc52)) by @MusfiqDehan

### 🐛 Bug Fixes & Stability

- return unauthorized when refresh token cookie is missing ([4766957](https://github.com/MusfiqDehan/Wufud/commit/47669576c7a3cbf5807850b3ae86ba32c32e3fcd)) by @MusfiqDehan
- rotate refresh token hash on each successful auth refresh ([6e7bd71](https://github.com/MusfiqDehan/Wufud/commit/6e7bd7176291092e54798ae0b510e7f5b10e3b6f)) by @MusfiqDehan

### 🛠️ Maintenance & Refactoring

- refresh frontend TypeScript build info ([ea7fcf7](https://github.com/MusfiqDehan/Wufud/commit/ea7fcf74fc7ad8f4b0390bc81a426605ad504a89)) by @MusfiqDehan
- refresh backend TypeScript build info ([841c122](https://github.com/MusfiqDehan/Wufud/commit/841c122a355c302799d717248dfa72f0ce3baba3)) by @MusfiqDehan
- add version 1.19 release summary to root changelog ([ef429d5](https://github.com/MusfiqDehan/Wufud/commit/ef429d551148539e370a68ce2a123e395d359c9f)) by @MusfiqDehan
- add version 1.19 entry to changelog.json ([80cdb87](https://github.com/MusfiqDehan/Wufud/commit/80cdb87588a3ceba4c0c85ef8192373836d59aa6)) by @MusfiqDehan
- add version 1.19 silent session refresh to platform changelog ([5f90735](https://github.com/MusfiqDehan/Wufud/commit/5f90735e23366efea15fc7bfcbcfa6901f563073)) by @MusfiqDehan
- e2e verifies silent refresh with httpOnly cookie ([d0da127](https://github.com/MusfiqDehan/Wufud/commit/d0da12790a7cd996c76dd8a312a3a2dd5ed75904)) by @MusfiqDehan
- clear session via helper on storefront auth errors ([b704c57](https://github.com/MusfiqDehan/Wufud/commit/b704c57eed0ded876c01d21bf7141c7bf11d2630)) by @MusfiqDehan
- store invite accept access token via session helper ([bbb2706](https://github.com/MusfiqDehan/Wufud/commit/bbb2706fa85bc8ca7837d5ca0fab605f048eb800)) by @MusfiqDehan
- store register access token via session helper ([0388de0](https://github.com/MusfiqDehan/Wufud/commit/0388de0f2918819af2d69d0509251ac108034096)) by @MusfiqDehan
- route auth token storage through session helpers ([4a7b640](https://github.com/MusfiqDehan/Wufud/commit/4a7b640cdc50955673637121587472c0222f96c5)) by @MusfiqDehan
- update TypeScript build info to reflect new dependencies and configurations ([c5d7295](https://github.com/MusfiqDehan/Wufud/commit/c5d72955535a9c917bfa86b10cfd5b4b024407aa)) by @MusfiqDehan

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.18...1.19

---

## What's Changed in 1.19 (2026-09-22)

### 🚀 Features & Capabilities

- **Silent session refresh** — httpOnly refresh cookie, automatic access-token renewal on 401 with request retry, and proactive refresh before JWT expiry so users stay signed in without sudden logouts

### 🐛 Bug Fixes & Stability

- Refresh endpoint **rotates** `refresh_token_hash` on each use so long-lived sessions remain valid for the full refresh TTL
- Missing refresh token on `/auth/refresh` returns a proper unauthorized error instead of a success envelope

### 🧪 Testing

- Playwright e2e: dashboard load recovers when the stored access token is invalid but the refresh cookie is present

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.18...1.19

---

## What's Changed in 1.18 (2026-09-22)

### 📦 Other Changes

- Portal table row action menus so they overlay scroll containers. ([3a8bcd5](https://github.com/MusfiqDehan/Wufud/commit/3a8bcd59137812276bf45b9b37584e356c30b183)) by @MusfiqDehan

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.17...1.18

---

## What's Changed in 1.17 (2026-09-22)

### 🐛 Bug Fixes & Stability

- include migrate/seed CLI in images and production demo emails ([2d29ca7](https://github.com/MusfiqDehan/Wufud/commit/2d29ca7bad19ff40f4421a6881d7b356e8adec65)) by @MusfiqDehan

### 🛠️ Maintenance & Refactoring

- expand 1.16 production go-live release notes [skip ci] ([1dbb30c](https://github.com/MusfiqDehan/Wufud/commit/1dbb30c6eac4a0d9d6b9e22ac3d38b3d2e89482d)) by @MusfiqDehan

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.16...1.17

---

## What's Changed in 1.16 (2026-09-22)

### 🚀 Features & Capabilities

- Production deployment on **wufud.musfiqdehan.com** and **demo.wufud.musfiqdehan.com** (Traefik wildcard TLS, API `/api/docs`, demo tenant seed) by @MusfiqDehan
- GitHub **production** environment with `PROD_*` secrets and automated deploy workflow by @MusfiqDehan

### 🐛 Bug Fixes & Stability

- hard-reset production deploy checkout and retry health checks ([dd2ec78](https://github.com/MusfiqDehan/Wufud/commit/dd2ec7889d4c4891f5ed0cb4897a305d9774f925)) by @MusfiqDehan

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.15...1.16

---

## What's Changed in 1.15 (2026-09-22)

### 🐛 Bug Fixes & Stability

- stable wufud-backend service name on shared Traefik network ([6a13675](https://github.com/MusfiqDehan/Wufud/commit/6a1367554509eb346a13bcc59ae12905f98aa819)) by @MusfiqDehan

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.14...1.15

---

## What's Changed in 1.14 (2026-09-22)

### 🐛 Bug Fixes & Stability

- bind Next.js frontend to 0.0.0.0 for Traefik ([0d3a419](https://github.com/MusfiqDehan/Wufud/commit/0d3a419f0580b42161b74797fe120081cc8c7351)) by @MusfiqDehan

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.13...1.14

---

## What's Changed in 1.13 (2026-09-22)

### 🐛 Bug Fixes & Stability

- use unique Redis/Postgres hostnames on shared Traefik network ([6ff3d4a](https://github.com/MusfiqDehan/Wufud/commit/6ff3d4a2465ce002c4eeeb86d5b818a81d75b711)) by @MusfiqDehan

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.12...1.13

---

## What's Changed in 1.12 (2026-09-22)

### 🐛 Bug Fixes & Stability

- avoid Swagger deep route scan hanging production boot ([d35d5d3](https://github.com/MusfiqDehan/Wufud/commit/d35d5d3ff172184162ec60878d78db6d1533fcdf)) by @MusfiqDehan

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.11...1.12

---

## What's Changed in 1.11 (2026-09-22)

### 🐛 Bug Fixes & Stability

- include pnpm store for backend runtime symlinks ([9b4c396](https://github.com/MusfiqDehan/Wufud/commit/9b4c3965407a33f526386340f2d4fa8ea61959ba)) by @MusfiqDehan

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.10...1.11

---

## What's Changed in 1.10 (2026-09-22)

### 🐛 Bug Fixes & Stability

- copy backend node_modules for runtime CLI and API deps ([c1623d9](https://github.com/MusfiqDehan/Wufud/commit/c1623d9c5af2d90c82b86974bf0ad0ba7b806c6f)) by @MusfiqDehan

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.9...1.10

---

## What's Changed in 1.9 (2026-09-22)

### 🐛 Bug Fixes & Stability

- include migrate/seed CLI in images and production demo emails ([e9ed012](https://github.com/MusfiqDehan/Wufud/commit/e9ed012166d7e613e47f58b8e48db74cc6aa8bcc)) by @MusfiqDehan

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.8...1.9

---

## What's Changed in 1.8 (2026-09-22)

### 🛠️ Maintenance & Refactoring

- restore curated changelog.json entries after main merge ([5096e2e](https://github.com/MusfiqDehan/Wufud/commit/5096e2ed8cde772c5c9b2e7da9feecfa2283fa0d)) by @MusfiqDehan
- dedupe 1.7 section in root changelog after main merge ([1f04693](https://github.com/MusfiqDehan/Wufud/commit/1f0469381720d23c140c11bfc707e07abdeb458a)) by @MusfiqDehan
- add version 1.8 release summary to root changelog ([7a38ce5](https://github.com/MusfiqDehan/Wufud/commit/7a38ce548d85c62ca09f0697f9e3641e3601cc37)) by @MusfiqDehan
- add version 1.8 entry to changelog.json ([48f8253](https://github.com/MusfiqDehan/Wufud/commit/48f8253b29094c5a8da43c90962edd849b8176ad)) by @MusfiqDehan
- add version 1.8 entry to platform changelog data ([11f9bec](https://github.com/MusfiqDehan/Wufud/commit/11f9bec6810a5df17925ce844764ace4c02de3a7)) by @MusfiqDehan
- docker local smoke script targets ports 3009 and 4005 ([f8c2c6a](https://github.com/MusfiqDehan/Wufud/commit/f8c2c6a6a6064bc3f226fca563bcd523ebebdb9d)) by @MusfiqDehan
- swagger server URL defaults to port 4005 ([2b3b8b7](https://github.com/MusfiqDehan/Wufud/commit/2b3b8b7b7990db49147d3ef98fdf01332c199615)) by @MusfiqDehan
- swagger examples reference API port 4005 ([d81964a](https://github.com/MusfiqDehan/Wufud/commit/d81964add061f8c3f991e5285ba4e9589ea28df9)) by @MusfiqDehan
- seed demo URLs use frontend port 3009 ([312cabf](https://github.com/MusfiqDehan/Wufud/commit/312cabf133ffbfe7a3f9541070ba973fd1448a11)) by @MusfiqDehan
- run Playwright against frontend on port 3009 ([4ef91c5](https://github.com/MusfiqDehan/Wufud/commit/4ef91c540d613f2e38352f78f7ecb77e511b1c9e)) by @MusfiqDehan
- update agent context for ports 3009 and 4005 ([720c382](https://github.com/MusfiqDehan/Wufud/commit/720c3823891d9952b8e03fec5f02d2d4854e6cdb)) by @MusfiqDehan
- document local URLs on ports 3009 and 4005 ([94586e1](https://github.com/MusfiqDehan/Wufud/commit/94586e160bd807d011bd2fa986d07f80647289f2)) by @MusfiqDehan
- point tenant-packages.spec.ts at local port 3009 ([8af3dcb](https://github.com/MusfiqDehan/Wufud/commit/8af3dcbf7976b3fa04516c4a87ff621944220406)) by @MusfiqDehan
- point tenancy.spec.ts at local port 3009 ([95c47a6](https://github.com/MusfiqDehan/Wufud/commit/95c47a6117da7a536c486435f2135be363b76bc7)) by @MusfiqDehan
- point pos.spec.ts at local port 3009 ([00eee81](https://github.com/MusfiqDehan/Wufud/commit/00eee81eaaba0551e7eeff070078711797241523)) by @MusfiqDehan
- point permissions.spec.ts at local port 3009 ([f7fe5f3](https://github.com/MusfiqDehan/Wufud/commit/f7fe5f3b41c803abb13dc7a5de33f6bb248fb19d)) by @MusfiqDehan
- point dark-mode.spec.ts at local port 3009 ([4856b4e](https://github.com/MusfiqDehan/Wufud/commit/4856b4eb5730ca82a7fa74f60495a370133fc6f8)) by @MusfiqDehan
- point charts-overflow.spec.ts at local port 3009 ([9ecdf56](https://github.com/MusfiqDehan/Wufud/commit/9ecdf5633ee79db0ec91ab4cc0eb38cbb67a3f54)) by @MusfiqDehan
- point business-access.spec.ts at local port 3009 ([0807deb](https://github.com/MusfiqDehan/Wufud/commit/0807deb0fe79ffd34a791db25a4e7b73c22b4d8f)) by @MusfiqDehan
- point accounts.spec.ts at local port 3009 ([ce33ef5](https://github.com/MusfiqDehan/Wufud/commit/ce33ef5c03c437760f4b4c4fd23393a692880746)) by @MusfiqDehan
- point acceptance.spec.ts at local port 3009 ([d1ebf8f](https://github.com/MusfiqDehan/Wufud/commit/d1ebf8f8c1bd5f8d4a2282b6f3178d73b2ff0067)) by @MusfiqDehan
- update host helper defaults for port 3009 ([1fbec54](https://github.com/MusfiqDehan/Wufud/commit/1fbec544f3f47e537822f8c0d60e63a6314d0c6b)) by @MusfiqDehan
- default browser API origin to port 4005 ([cc7dcc0](https://github.com/MusfiqDehan/Wufud/commit/cc7dcc00f03a356431dca03ec2525d0c312407bf)) by @MusfiqDehan
- default Playwright base URL to port 3009 ([da3a478](https://github.com/MusfiqDehan/Wufud/commit/da3a478a124b372942cfd5827ca82209a6d1a65a)) by @MusfiqDehan
- set dev script to serve frontend on port 3009 ([b6defe4](https://github.com/MusfiqDehan/Wufud/commit/b6defe4f27812f66142ce8365628909ba1b6e987)) by @MusfiqDehan
- point Next.js API rewrites at localhost:4005 ([ebedc64](https://github.com/MusfiqDehan/Wufud/commit/ebedc64a40e4245f613dad30f07f7277b864ab8f)) by @MusfiqDehan
- expose frontend on port 3009 in Docker image ([dc8251c](https://github.com/MusfiqDehan/Wufud/commit/dc8251c9ee0f6ef3d89bdac521024274ec96558f)) by @MusfiqDehan
- expose API on port 4005 in backend Docker image ([c12dd1f](https://github.com/MusfiqDehan/Wufud/commit/c12dd1fa3f267638527e72cdb349e4ab30cb38ac)) by @MusfiqDehan
- align production compose API and frontend ports to 4005 and 3009 ([8cbdf93](https://github.com/MusfiqDehan/Wufud/commit/8cbdf93b69229c5914668f204ceec84dc8e94d84)) by @MusfiqDehan
- align staging compose API and frontend ports to 4005 and 3009 ([bb81b6d](https://github.com/MusfiqDehan/Wufud/commit/bb81b6d33777ebfb9b7f66cea2214fde44d1e7a9)) by @MusfiqDehan
- align local compose API and frontend ports to 4005 and 3009 ([9074a52](https://github.com/MusfiqDehan/Wufud/commit/9074a52e11eab41bc2bc80416b5c61e31f26132b)) by @MusfiqDehan
- update production env example for ports 3009 and 4005 ([708c0b6](https://github.com/MusfiqDehan/Wufud/commit/708c0b60429096561e475b7441a7a70ce300681f)) by @MusfiqDehan
- update staging env example for ports 3009 and 4005 ([bd806eb](https://github.com/MusfiqDehan/Wufud/commit/bd806eb94eb1aa3c760fc23137e41ff4cf1d8793)) by @MusfiqDehan
- update local env example for ports 3009 and 4005 ([be676a2](https://github.com/MusfiqDehan/Wufud/commit/be676a21d26a970e9bc1bd36c8bbc12b1e700d44)) by @MusfiqDehan
- default API to 4005 and web to 3009 in env schema and CORS ([f0f2558](https://github.com/MusfiqDehan/Wufud/commit/f0f2558367801c3f1f937a7f9f95564dc60696d5)) by @MusfiqDehan

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.7...1.8

---

## What's Changed in 1.8 (2026-09-22)

### 🛠️ Maintenance & Refactoring

- Default **API** port **4005** and **frontend** port **3009** in backend env schema, CORS defaults, and `.env` examples (local, staging, production)
- Docker Compose stacks publish and use the same ports inside containers
- Next.js rewrites, frontend API/host helpers, Playwright config, and all e2e specs target the new ports
- README, AGENTS.md, CI workflow, Swagger seed URLs, and `docker-local-test.sh` documentation updated

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/compare/1.7...1.8

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
