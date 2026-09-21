export const TENANT_DDL = `
CREATE TABLE IF NOT EXISTS "__SCHEMA__".branches (
  id uuid PRIMARY KEY, name varchar(255) NOT NULL, code varchar(64) NOT NULL UNIQUE,
  is_headquarters boolean DEFAULT false, status varchar(32) DEFAULT 'active',
  manager_id uuid, address text, city varchar(128), phone varchar(64), email varchar(255),
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".roles (
  id uuid PRIMARY KEY, name varchar(255) NOT NULL, slug varchar(64) NOT NULL UNIQUE,
  description text, is_system boolean DEFAULT false, color varchar(32),
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".role_permissions (
  id uuid PRIMARY KEY, role_id uuid NOT NULL REFERENCES "__SCHEMA__".roles(id) ON DELETE CASCADE,
  feature_key varchar(128) NOT NULL, permission_level varchar(16) NOT NULL, UNIQUE(role_id, feature_key)
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".user_roles (
  id uuid PRIMARY KEY, user_id uuid NOT NULL, user_email varchar(255),
  role_id uuid NOT NULL REFERENCES "__SCHEMA__".roles(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES "__SCHEMA__".branches(id) ON DELETE SET NULL,
  assigned_by_email varchar(255), UNIQUE(user_id, role_id, branch_id)
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".tenant_settings (
  id uuid PRIMARY KEY, display_name varchar(255) NOT NULL, logo_url text, primary_color varchar(16),
  title varchar(255), description text, og_image_url text, keywords text, currency varchar(8) DEFAULT 'BDT',
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".tenant_gateway_instances (
  id uuid PRIMARY KEY, gateway_slug varchar(64) NOT NULL UNIQUE, credentials jsonb, is_sandbox boolean DEFAULT true, is_gateway_active boolean DEFAULT false, is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".tenant_email_accounts (
  id uuid PRIMARY KEY, label varchar(255) NOT NULL, host varchar(255) NOT NULL, port int DEFAULT 465,
  username varchar(255) NOT NULL, password text, from_address varchar(255) NOT NULL, from_name varchar(255),
  use_ssl boolean DEFAULT true, is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".packages (
  id uuid PRIMARY KEY, name varchar(255) NOT NULL, kind varchar(32) NOT NULL, description text,
  departure_date date NOT NULL, booking_opens_at timestamptz NOT NULL, booking_closes_at timestamptz NOT NULL,
  duration_days int DEFAULT 14, max_pilgrims int DEFAULT 10, makkah_hotel varchar(255), makkah_distance varchar(128),
  madinah_hotel varchar(255), madinah_distance varchar(128), airline varchar(128), flight_route varchar(255),
  inclusions jsonb DEFAULT '[]'::jsonb, itinerary jsonb DEFAULT '[]'::jsonb, featured boolean DEFAULT false, banner_image text,
  branch_id uuid REFERENCES "__SCHEMA__".branches(id),
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".package_tiers (
  id uuid PRIMARY KEY, package_id uuid NOT NULL REFERENCES "__SCHEMA__".packages(id) ON DELETE CASCADE,
  name varchar(64) NOT NULL, price numeric(12,2) NOT NULL, currency varchar(8) DEFAULT 'BDT',
  room_type varchar(64), features jsonb DEFAULT '[]'::jsonb,
  seats_total int NOT NULL, seats_confirmed int DEFAULT 0, seats_held int DEFAULT 0,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz,
  CONSTRAINT seats_quota CHECK (seats_confirmed + seats_held <= seats_total)
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".bookings (
  id uuid PRIMARY KEY, user_id uuid NOT NULL, tier_id uuid NOT NULL REFERENCES "__SCHEMA__".package_tiers(id),
  branch_id uuid REFERENCES "__SCHEMA__".branches(id), status varchar(24) DEFAULT 'draft',
  frozen_price numeric(12,2) NOT NULL, currency varchar(8) DEFAULT 'BDT', pilgrim_count int DEFAULT 1,
  payment_mode varchar(16) DEFAULT 'full', amount_received numeric(12,2) DEFAULT 0, hold_expires_at timestamptz,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".booking_pilgrims (
  id uuid PRIMARY KEY, booking_id uuid NOT NULL REFERENCES "__SCHEMA__".bookings(id) ON DELETE CASCADE,
  full_name varchar(255) NOT NULL, passport_number varchar(64) NOT NULL, nationality varchar(64), date_of_birth date, cancelled boolean DEFAULT false,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".seat_holds (
  id uuid PRIMARY KEY, tier_id uuid NOT NULL REFERENCES "__SCHEMA__".package_tiers(id),
  booking_id uuid NOT NULL REFERENCES "__SCHEMA__".bookings(id), seats int NOT NULL, expires_at timestamptz NOT NULL, is_open boolean DEFAULT true,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".installment_plans (
  id uuid PRIMARY KEY, booking_id uuid NOT NULL REFERENCES "__SCHEMA__".bookings(id), down_payment numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".installments (
  id uuid PRIMARY KEY, plan_id uuid NOT NULL REFERENCES "__SCHEMA__".installment_plans(id) ON DELETE CASCADE,
  sequence int NOT NULL, due_date date NOT NULL, amount_due numeric(12,2) NOT NULL, amount_paid numeric(12,2) DEFAULT 0, status varchar(16) DEFAULT 'open',
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".cancellation_rules (
  id uuid PRIMARY KEY, days_before_departure int NOT NULL, charge_percent numeric(5,2) NOT NULL,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".cancellations (
  id uuid PRIMARY KEY, booking_id uuid NOT NULL REFERENCES "__SCHEMA__".bookings(id), charge_amount numeric(12,2) NOT NULL, reason text, is_partial boolean DEFAULT false,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".refund_requests (
  id uuid PRIMARY KEY, booking_id uuid NOT NULL REFERENCES "__SCHEMA__".bookings(id), amount numeric(12,2) NOT NULL,
  status varchar(16) DEFAULT 'requested', approved_by_id uuid, note text,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".payment_attempts (
  id uuid PRIMARY KEY, tran_id varchar(128) NOT NULL UNIQUE, gateway_slug varchar(64) NOT NULL,
  amount numeric(12,2) NOT NULL, currency varchar(8) NOT NULL, status varchar(16) DEFAULT 'init',
  source_ref varchar(128) NOT NULL, val_id varchar(255), gateway_response jsonb, validated_at timestamptz, created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".webhook_events (
  id uuid PRIMARY KEY, provider_event_id varchar(255) NOT NULL UNIQUE, gateway_slug varchar(64) NOT NULL, payload jsonb, created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".payments (
  id uuid PRIMARY KEY, booking_id uuid NOT NULL REFERENCES "__SCHEMA__".bookings(id), source varchar(16) NOT NULL,
  amount numeric(12,2) NOT NULL, currency varchar(8) DEFAULT 'BDT', gateway_slug varchar(64), tran_id varchar(128),
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".manual_payments (
  id uuid PRIMARY KEY, booking_id uuid NOT NULL REFERENCES "__SCHEMA__".bookings(id), branch_id uuid REFERENCES "__SCHEMA__".branches(id),
  amount numeric(12,2) NOT NULL, method varchar(16) DEFAULT 'cash', recorded_by_id uuid NOT NULL, approved_by_id uuid, status varchar(16) DEFAULT 'pending',
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".vendors (
  id uuid PRIMARY KEY, name varchar(255) NOT NULL, kind varchar(32) NOT NULL, contact varchar(255),
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".vendor_disbursements (
  id uuid PRIMARY KEY, vendor_id uuid NOT NULL REFERENCES "__SCHEMA__".vendors(id), booking_id uuid REFERENCES "__SCHEMA__".bookings(id),
  amount_sar numeric(12,2) NOT NULL, fx_rate numeric(10,4) NOT NULL, amount_bdt numeric(12,2) NOT NULL, note text,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".stock_items (
  id uuid PRIMARY KEY, name varchar(255) NOT NULL, quantity int DEFAULT 0, unit_cost numeric(12,2) DEFAULT 0,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".stock_issues (
  id uuid PRIMARY KEY, item_id uuid NOT NULL REFERENCES "__SCHEMA__".stock_items(id), booking_id uuid REFERENCES "__SCHEMA__".bookings(id), quantity int NOT NULL,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".expenses (
  id uuid PRIMARY KEY, title varchar(255) NOT NULL, amount numeric(12,2) NOT NULL, currency varchar(8) DEFAULT 'BDT', category varchar(64),
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".settlement_reports (
  id uuid PRIMARY KEY, gateway_slug varchar(64) NOT NULL, period_start date NOT NULL, period_end date NOT NULL, status varchar(16) DEFAULT 'open',
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".reconciliation_items (
  id uuid PRIMARY KEY, report_id uuid NOT NULL REFERENCES "__SCHEMA__".settlement_reports(id),
  tran_id varchar(128), gateway_amount numeric(12,2) NOT NULL, internal_amount numeric(12,2), status varchar(16) DEFAULT 'mismatch', note text
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".daily_booking_stats (
  id uuid PRIMARY KEY, day date NOT NULL, branch_id uuid, bookings_count int DEFAULT 0, collected numeric(14,2) DEFAULT 0, outstanding numeric(14,2) DEFAULT 0
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".audit_logs (
  id uuid PRIMARY KEY, actor_id uuid, action varchar(64) NOT NULL, target_type varchar(64) NOT NULL, target_id uuid, metadata jsonb,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS "__SCHEMA__".asset_relations (
  id uuid PRIMARY KEY, asset_id uuid NOT NULL, parent_type varchar(64) NOT NULL, parent_id uuid NOT NULL,
  role varchar(32) NOT NULL, field_name varchar(64), sort_order int DEFAULT 0, is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  created_by uuid, updated_by uuid, deleted_by uuid,
  is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);
ALTER TABLE "__SCHEMA__".tenant_gateway_instances ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

ALTER TABLE "__SCHEMA__".stock_issues ADD COLUMN IF NOT EXISTS cost_bdt numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "__SCHEMA__".installments ADD COLUMN IF NOT EXISTS amount_waived numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "__SCHEMA__".stock_items ADD COLUMN IF NOT EXISTS kind varchar(16) NOT NULL DEFAULT 'product';
ALTER TABLE "__SCHEMA__".stock_items ADD COLUMN IF NOT EXISTS sale_price numeric(12,2) NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS "__SCHEMA__".pos_sales (
 id uuid PRIMARY KEY, request_key varchar(255) NOT NULL UNIQUE, total numeric(12,2) NOT NULL CHECK(total > 0),
 status varchar(16) NOT NULL DEFAULT 'paid', lines jsonb NOT NULL,
 created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
 created_by uuid, updated_by uuid, deleted_by uuid,
 is_active boolean DEFAULT true, is_published boolean DEFAULT false, is_deleted boolean DEFAULT false, deleted_at timestamptz
);

ALTER TABLE "__SCHEMA__".pos_sales ADD COLUMN IF NOT EXISTS receipt jsonb;
ALTER TABLE "__SCHEMA__".pos_sales ADD COLUMN IF NOT EXISTS refund_receipt jsonb;
ALTER TABLE "__SCHEMA__".manual_payments ADD COLUMN IF NOT EXISTS request_key varchar(255);
ALTER TABLE "__SCHEMA__".manual_payments ADD COLUMN IF NOT EXISTS receipt jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS manual_payment_request_key ON "__SCHEMA__".manual_payments(request_key);
ALTER TABLE "__SCHEMA__".stock_issues ADD COLUMN IF NOT EXISTS reversal_of uuid;
CREATE UNIQUE INDEX IF NOT EXISTS stock_issue_reversal ON "__SCHEMA__".stock_issues(reversal_of);
ALTER TABLE "__SCHEMA__".packages ADD COLUMN IF NOT EXISTS max_pilgrims int DEFAULT 10;
`;
