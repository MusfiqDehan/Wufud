type AccessMe = {
  is_tenant_admin: boolean;
  is_platform_admin: boolean;
  permissions: Record<string, string>;
  enabled_features: string[];
  package_gated_features: string[];
};

function canAccessFeature(key: string, level: "view" | "edit" | "full", access: AccessMe) {
  if (access.package_gated_features.includes(key) && !access.enabled_features.includes(key)) return false;
  if (access.is_tenant_admin || access.is_platform_admin) return true;
  const ranks: Record<string, number> = { none: 0, view: 1, edit: 2, full: 3 };
  return (ranks[access.permissions[key] ?? "none"] ?? 0) >= (ranks[level] ?? 0);
}

// Mirrors packages/contracts/src/features.ts — must stay in sync.
// PACKAGE_GATED_KEYS must include "audit"; PERMISSION_KEYS must include
// "audit", "pilgrims", "general_settings", "seo" as distinct keys.
const PACKAGE_GATED_KEYS = new Set([
  "dashboard",
  "packages",
  "bookings",
  "pilgrims",
  "users",
  "branches",
  "payments",
  "refunds",
  "accounts",
  "reports",
  "audit",
  "gateways",
  "email",
  "domains",
  "seo",
]);
const PERMISSION_KEYS = new Set([...PACKAGE_GATED_KEYS, "permissions", "general_settings"]);

const base: AccessMe = {
  is_tenant_admin: false,
  is_platform_admin: false,
  permissions: { bookings: "edit" },
  enabled_features: ["bookings"],
  package_gated_features: ["bookings", "reports"],
};

describe("canAccessFeature", () => {
  it("blocks package-gated keys even for admin", () => {
    expect(canAccessFeature("reports", "view", { ...base, is_tenant_admin: true, enabled_features: ["bookings"] })).toBe(false);
  });

  it("allows admin when entitled", () => {
    expect(canAccessFeature("bookings", "full", { ...base, is_tenant_admin: true })).toBe(true);
  });

  it("uses max role map for non-admins", () => {
    expect(canAccessFeature("bookings", "edit", base)).toBe(true);
    expect(canAccessFeature("bookings", "full", base)).toBe(false);
  });

  it("treats audit independently from reports", () => {
    expect(PACKAGE_GATED_KEYS.has("audit")).toBe(true);
    expect(PERMISSION_KEYS.has("audit")).toBe(true);
    const withReports: AccessMe = {
      ...base,
      is_tenant_admin: true,
      enabled_features: ["reports"],
      package_gated_features: [...PACKAGE_GATED_KEYS],
    };
    expect(canAccessFeature("reports", "view", withReports)).toBe(true);
    expect(canAccessFeature("audit", "view", withReports)).toBe(false);
    expect(canAccessFeature("audit", "view", { ...withReports, enabled_features: ["reports", "audit"] })).toBe(true);
  });

  it("keeps pilgrims and general_settings as distinct keys", () => {
    expect(PERMISSION_KEYS.has("pilgrims")).toBe(true);
    expect(PERMISSION_KEYS.has("general_settings")).toBe(true);
    expect(PERMISSION_KEYS.has("seo")).toBe(true);
    expect(PACKAGE_GATED_KEYS.has("email")).toBe(true);
  });
});
