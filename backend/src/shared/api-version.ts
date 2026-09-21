/**
 * Canonical API version prefix.
 *
 * All client-facing routes live under `api/v1/...`, e.g.
 * `POST /api/v1/auth/login`, `GET /api/v1/packages`.
 *
 * Legacy unversioned `/api/...` requests are rewritten to `/api/v1/...`
 * by middleware in `main.ts` so old clients keep working during migration.
 * Future breaking changes go under `api/v2/...` side-by-side.
 */
export const API_V1_PREFIX = "api/v1" as const;
export const API_VERSION = "1" as const;
