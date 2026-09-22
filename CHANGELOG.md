# Changelog

All notable changes to the **Wufud** SaaS platform will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## What's Changed in 1.4 (2026-09-21)

### 🚀 Features & Capabilities

- Modern Changelog and System Status pages with live healthcheck diagnostics
- GitHub Actions automated release pipeline with tag generation and conventional commit categorization
- Dynamic payment gateway adapters for SSLCommerz and Stripe with automated callback verification
- Schema-per-tenant isolation (`t_<slug>`) with instant provisioning and dynamic DDL migration
- Seat capacity management with high-concurrency reservation locks and automated hold timers
- Pilgrim portal for family bookings, multi-currency SAR/BDT disbursements, and installment schedules
- Agency dashboard with branch-scoped RBAC, POS terminal sales, and financial reconciliations
- Traefik edge reverse proxy integration with automated SSL termination and host-based domain routing

### 🐛 Bug Fixes & Stability

- Standardized project title format and metadata across public context and platform controllers
- Fixed tenant schema switching interceptor for asynchronous worker queues
- Improved seat counter reconciliation during installment defaults and refund processing

### 🛠️ Maintenance & Refactoring

- Upgraded NestJS to 11 and Next.js to 15 with React 19 support
- Enhanced monorepo contracts package (`@wufud/contracts`) for shared DTOs and error definitions
- Configured multi-environment Docker Compose stacks for local, staging, and production

**Full Changelog**: https://github.com/MusfiqDehan/Wufud/releases/tag/1.4
