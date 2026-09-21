import { DomainError } from "../shared/errors/domain.error";
import { ErrorCode } from "@wufud/contracts";

export const RESERVED_SLUGS = new Set([
  "www",
  "api",
  "admin",
  "app",
  "mail",
  "ftp",
  "platform",
  "wufud",
  "staging",
  "static",
  "assets",
  "cdn",
  "login",
  "register",
  "invite",
  "dashboard",
  "portal",
  "start",
]);

export function normalizeAgencySlug(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function assertAgencySlug(slug: string) {
  if (slug.length < 3) {
    throw new DomainError(ErrorCode.VALIDATION_ERROR, "Choose a subdomain of at least 3 characters.", 400, {
      slug: ["Choose a subdomain of at least 3 characters."],
    });
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new DomainError(ErrorCode.VALIDATION_ERROR, "Use letters, numbers, and hyphens only.", 400, {
      slug: ["Use letters, numbers, and hyphens only."],
    });
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw new DomainError(ErrorCode.DUPLICATE_RESOURCE, "That subdomain is reserved.", 409, {
      slug: ["That subdomain is reserved."],
    });
  }
}
