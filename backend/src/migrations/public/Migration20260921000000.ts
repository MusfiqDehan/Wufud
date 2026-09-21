import { Migration } from "@mikro-orm/migrations";

export class Migration20260921000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY, name varchar(255) NOT NULL, slug varchar(64) NOT NULL UNIQUE,
  schema_name varchar(64) NOT NULL UNIQUE, status varchar(24) DEFAULT 'trial', is_enabled boolean DEFAULT true,
  plan varchar(64), features jsonb, max_users int DEFAULT 0, max_branches int DEFAULT 0, max_roles int DEFAULT 0,
  owner_email varchar(255), timezone varchar(64) DEFAULT 'Asia/Dhaka', currency varchar(8) DEFAULT 'BDT', locale varchar(8) DEFAULT 'en',
  version int DEFAULT 0,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS domains (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), domain varchar(255) NOT NULL UNIQUE,
  is_primary boolean DEFAULT false, verification_token varchar(255), verified_at timestamptz,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS platform_domains (
  id uuid PRIMARY KEY, host varchar(255) NOT NULL UNIQUE, is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY, email varchar(255), phone varchar(64), full_name varchar(255) NOT NULL,
  tenant_id uuid REFERENCES tenants(id), email_verified boolean DEFAULT false, password_hash text,
  password_set_at timestamptz, last_login timestamptz, refresh_token_hash text,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_uq ON users (email) WHERE email IS NOT NULL;
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY, email varchar(255) NOT NULL, full_name varchar(255), token_hash varchar(128) NOT NULL,
  type varchar(32) NOT NULL, expires_at timestamptz NOT NULL, accepted_at timestamptz, invited_by_id uuid, tenant_id uuid, metadata jsonb,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS platform_roles (
  id uuid PRIMARY KEY, name varchar(255) NOT NULL, slug varchar(64) NOT NULL UNIQUE, is_system boolean DEFAULT false, color varchar(32),
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS platform_role_permissions (
  id uuid PRIMARY KEY, role_id uuid NOT NULL REFERENCES platform_roles(id) ON DELETE CASCADE,
  module_key varchar(128) NOT NULL, permission_level varchar(16) NOT NULL, UNIQUE(role_id, module_key),
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS platform_user_roles (
  id uuid PRIMARY KEY, user_id uuid NOT NULL, role_id uuid NOT NULL REFERENCES platform_roles(id), assigned_by_id uuid, UNIQUE(user_id, role_id)
);
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY, name varchar(255) NOT NULL, slug varchar(64) NOT NULL UNIQUE, description text,
  price_monthly numeric(12,2) DEFAULT 0, currency varchar(8) DEFAULT 'BDT', features jsonb, max_users int DEFAULT 0, max_branches int DEFAULT 0, sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT true, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), plan_id uuid NOT NULL REFERENCES plans(id),
  status varchar(24) DEFAULT 'active', current_period_start timestamptz NOT NULL, current_period_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS subscription_invoices (
  id uuid PRIMARY KEY, subscription_id uuid NOT NULL REFERENCES tenant_subscriptions(id),
  amount numeric(12,2) NOT NULL, currency varchar(8) DEFAULT 'BDT', status varchar(16) DEFAULT 'open', paid_at timestamptz,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS tenant_feature_overrides (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), feature_key varchar(128) NOT NULL, enabled boolean NOT NULL, UNIQUE(tenant_id, feature_key)
);
CREATE TABLE IF NOT EXISTS platform_seo_settings (
  id uuid PRIMARY KEY, title varchar(255) NOT NULL, description text, og_image_url text, keywords text, robots varchar(64),
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT true, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id uuid PRIMARY KEY, actor_id uuid, action varchar(64) NOT NULL, target_type varchar(64) NOT NULL, target_id uuid, metadata jsonb,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS payment_gateway_catalog (
  id uuid PRIMARY KEY, slug varchar(64) NOT NULL UNIQUE, name varchar(255) NOT NULL, description text,
  is_enabled_for_tenants boolean DEFAULT false, config_schema jsonb, platform_credentials jsonb, is_sandbox boolean DEFAULT true, is_default boolean DEFAULT false, sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT true, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS platform_email_accounts (
  id uuid PRIMARY KEY, label varchar(255) NOT NULL, host varchar(255) NOT NULL, port int DEFAULT 465,
  username varchar(255) NOT NULL, password text, from_address varchar(255) NOT NULL, from_name varchar(255),
  use_ssl boolean DEFAULT true, is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS platform_payment_attempts (
  id uuid PRIMARY KEY, tran_id varchar(128) NOT NULL UNIQUE, gateway_slug varchar(64) NOT NULL,
  amount numeric(12,2) NOT NULL, currency varchar(8) NOT NULL, status varchar(16) DEFAULT 'init',
  source_ref varchar(128) NOT NULL, val_id varchar(255), gateway_response jsonb, validated_at timestamptz, created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY, url text NOT NULL, mime_type varchar(128) NOT NULL, original_filename varchar(255) NOT NULL, alt_text varchar(255), size_bytes int DEFAULT 0,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
ALTER TABLE payment_gateway_catalog ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS trial_days int DEFAULT 14;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS invitation_expires_hours int DEFAULT 168;
CREATE TABLE IF NOT EXISTS agency_signups (
  id uuid PRIMARY KEY, agency_name varchar(255) NOT NULL, slug varchar(64) NOT NULL,
  owner_email varchar(255) NOT NULL, owner_full_name varchar(255) NOT NULL, password_hash text NOT NULL,
  plan_id uuid NOT NULL REFERENCES plans(id), mode varchar(16) NOT NULL, status varchar(24) DEFAULT 'pending',
  gateway_slug varchar(64), tran_id varchar(128), tenant_id uuid,
  verify_token_hash varchar(128), verification_expires_at timestamptz,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
ALTER TABLE agency_signups ADD COLUMN IF NOT EXISTS verify_token_hash varchar(128);
ALTER TABLE agency_signups ADD COLUMN IF NOT EXISTS verification_expires_at timestamptz;
ALTER TABLE agency_signups DROP CONSTRAINT IF EXISTS agency_signups_slug_key;
ALTER TABLE agency_signups DROP CONSTRAINT IF EXISTS agency_signups_slug_unique;
CREATE UNIQUE INDEX IF NOT EXISTS agency_signups_slug_pending_uq ON agency_signups (slug) WHERE status = 'pending' AND is_deleted = false;
`);
  }
}
