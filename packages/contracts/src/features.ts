export type FeatureDef = {
  key: string;
  name: string;
  route?: string;
  description?: string;
};

export type FeatureGroup = {
  group: string;
  children: FeatureDef[];
};

export const TENANT_REGISTRY: FeatureGroup[] = [
  {
    group: "Core",
    children: [
      { key: "dashboard", name: "Dashboard", route: "/dashboard", description: "Agency metrics, quick actions and activity feed" },
      { key: "packages", name: "Packages", route: "/dashboard/packages", description: "Hajj & Umrah package itineraries, pricing and quotas" },
      { key: "bookings", name: "Bookings", route: "/dashboard/bookings", description: "Pilgrim reservations, room allocations and vouchers" },
    ],
  },
  {
    group: "People",
    children: [
      { key: "pilgrims", name: "Pilgrims", route: "/dashboard/pilgrims", description: "Pilgrim directory, passports and visa documents" },
      { key: "users", name: "Users", route: "/dashboard/users", description: "Agency staff, user accounts and branch assignments" },
      { key: "branches", name: "Branches", route: "/dashboard/branches", description: "Branch offices, physical desks and managers" },
    ],
  },
  {
    group: "Accounts",
    children: [
      { key: "accounts", name: "Accounts Overview", route: "/dashboard/accounts", description: "Central accounting workspace and financial status" },
      { key: "payments", name: "Payments", route: "/dashboard/payments", description: "Collections and manual payment approvals" },
      { key: "refunds", name: "Refunds", route: "/dashboard/refunds", description: "Request, approve and process booking refunds" },
      { key: "vendors", name: "Vendors", route: "/dashboard/accounts/vendors", description: "Hotels, airlines, transport and visa providers" },
      { key: "disbursements", name: "Disbursements", route: "/dashboard/accounts/disbursements", description: "SAR vendor costs and BDT exchange rates" },
      { key: "stock", name: "Stock", route: "/dashboard/accounts/stock", description: "Pilgrim supplies and stock issues" },
      { key: "expenses", name: "Expenses", route: "/dashboard/accounts/expenses", description: "Agency operating expenses" },
      { key: "settlements", name: "Reconciliation", route: "/dashboard/accounts/settlements", description: "Gateway settlement mismatches" },
      { key: "pos", name: "POS", route: "/dashboard/pos", description: "Counter operations" },
    ],
  },
  {
    group: "Reports",
    children: [
      { key: "reports", name: "Reports", route: "/dashboard/reports", description: "Financial audits, booking statements and analytics" },
    ],
  },
  {
    group: "Administration",
    children: [
      { key: "permissions", name: "Permissions", route: "/dashboard/permissions", description: "Branch-scoped roles and feature access control" },
      { key: "gateways", name: "Payment gateways", route: "/dashboard/gateways", description: "Online payment gateway integrations and keys" },
      { key: "email", name: "Email", route: "/dashboard/email", description: "SMTP servers, templates and transactional delivery" },
      { key: "domains", name: "Domains", route: "/dashboard/domains", description: "Custom agency domain names and SSL status" },
      { key: "seo", name: "SEO & branding", route: "/dashboard/seo", description: "Meta tags, brand logo, favicon and agency assets" },
      { key: "general_settings", name: "Settings", route: "/dashboard/settings", description: "General agency configuration and preferences" },
      { key: "audit", name: "Audit log", route: "/dashboard/audit", description: "Immutable security trail of administrative actions" },
    ],
  },
];

export const PILGRIM_REGISTRY: FeatureGroup[] = [
  {
    group: "My journey",
    children: [{ key: "bookings", name: "Bookings", route: "/portal/bookings" }],
  },
];

export const PLATFORM_REGISTRY: FeatureGroup[] = [
  {
    group: "Platform",
    children: [
      { key: "platform.tenants", name: "Tenants", route: "/admin/tenants" },
      { key: "platform.billing", name: "Billing", route: "/admin/billing" },
      { key: "platform.plans", name: "Plans", route: "/admin/plans" },
      { key: "platform.features", name: "Features", route: "/admin/features" },
      { key: "platform.gateways", name: "Gateways", route: "/admin/gateways" },
      { key: "platform.email", name: "Email", route: "/admin/email" },
      { key: "platform.domains", name: "Domains", route: "/admin/domains" },
      { key: "platform.seo", name: "SEO", route: "/admin/seo" },
      { key: "platform.audit", name: "Audit", route: "/admin/audit" },
    ],
  },
];

export const PACKAGE_GATED_KEYS = new Set([
  "dashboard",
  "packages",
  "bookings",
  "pilgrims",
  "users",
  "branches",
  "payments",
  "refunds",
  "accounts",
  "vendors",
  "disbursements",
  "stock",
  "expenses",
  "settlements",
  "pos",
  "reports",
  "audit",
  "gateways",
  "email",
  "domains",
  "seo",
]);

export const ROLE_ONLY_KEYS = new Set(["permissions", "general_settings"]);

export const PERMISSION_KEYS = new Set([...PACKAGE_GATED_KEYS, ...ROLE_ONLY_KEYS]);

export const PLATFORM_KEYS = new Set(PLATFORM_REGISTRY.flatMap((g) => g.children.map((c) => c.key)));

export const SYSTEM_TENANT_ROLES = [
  "admin",
  "manager",
  "branch_manager",
  "accountant",
  "agent",
  "viewer",
  "pilgrim",
] as const;

export type SystemTenantRole = (typeof SYSTEM_TENANT_ROLES)[number];

export const SYSTEM_PLATFORM_ROLES = ["superadmin", "platform_manager", "support_agent"] as const;

export type AccessMe = {
  user_id: string;
  email: string | null;
  full_name: string;
  role_slugs: string[];
  is_tenant_admin: boolean;
  is_platform_admin: boolean;
  permissions: Record<string, string>;
  enabled_features: string[];
  package_gated_features: string[];
  tenant?: { id: string; slug: string; name: string };
};

export function canAccessFeature(
  key: string,
  level: "view" | "edit" | "full",
  access: AccessMe,
): boolean {
  if (access.package_gated_features.includes(key) && !access.enabled_features.includes(key)) {
    return false;
  }
  if (access.is_tenant_admin || access.is_platform_admin) {
    return true;
  }
  const ranks: Record<string, number> = { none: 0, view: 1, edit: 2, full: 3 };
  return (ranks[access.permissions[key] ?? "none"] ?? 0) >= (ranks[level] ?? 0);
}
