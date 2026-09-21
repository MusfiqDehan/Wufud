export type TenantStatus = "active" | "trial" | "suspended" | "cancelled";

export type BookingStatus = "draft" | "held" | "confirmed" | "defaulted" | "cancelled";

export type PaymentAttemptStatus = "init" | "pending" | "success" | "failed" | "cancelled";

export type PackageKind = "hajj" | "ramadan_umrah" | "offseason_umrah" | "ziyarah";

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  schema_name: string;
  plan?: string;
  max_users?: number;
  max_branches?: number;
};

export type UserSummary = {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  is_active: boolean;
};

export type PackageSummary = {
  id: string;
  name: string;
  kind: PackageKind;
  departure_date: string;
  booking_opens_at: string;
  booking_closes_at: string;
  is_published: boolean;
};

export type PublicHostContext = {
  plane: "platform" | "tenant";
  host: string;
  tenant?: { id: string; slug: string; name: string };
  branding?: {
    display_name: string;
    logo_url?: string;
    primary_color?: string;
    title?: string;
    description?: string;
    og_image_url?: string;
  };
};
