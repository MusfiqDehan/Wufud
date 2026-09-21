import { Client } from "pg";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { v7 as uuid } from "uuid";
import nodemailer from "nodemailer";
import { TENANT_DDL } from "../tenancy/tenant-ddl";

const PASSWORD = process.env.DEMO_PASSWORD ?? "WufudDemo!2026";
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://wufud:wufud@localhost:5432/wufud";
const PLATFORM_HOST = process.env.PLATFORM_HOST ?? "wufud.localhost";

const PACKAGE_GATED_KEYS = [
  "dashboard",
  "packages",
  "bookings",
  "pilgrims",
  "users",
  "branches",
  "payments",
  "refunds",
  "accounts", "vendors", "disbursements", "stock", "expenses", "settlements", "pos",
  "reports",
  "audit",
  "gateways",
  "email",
  "domains",
  "seo",
];
const ROLE_ONLY_KEYS = ["permissions", "general_settings"];
const PERMISSION_KEYS = [...PACKAGE_GATED_KEYS, ...ROLE_ONLY_KEYS];
const PLATFORM_KEYS = [
  "platform.tenants",
  "platform.billing",
  "platform.plans",
  "platform.features",
  "platform.gateways",
  "platform.email",
  "platform.domains",
  "platform.seo",
  "platform.audit",
];

const ROLE_MATRIX: Record<string, Record<string, string>> = {
  admin: Object.fromEntries(PERMISSION_KEYS.map((k) => [k, "full"])),
  manager: {
    dashboard: "view",
    packages: "edit",
    bookings: "edit",
    pilgrims: "edit",
    users: "view",
    branches: "view",
    payments: "edit",
    refunds: "edit",
    accounts: "view",
    vendors: "view",
    disbursements: "view",
    stock: "view",
    expenses: "view",
    settlements: "view",
    pos: "view",

    reports: "view",
    audit: "view",
    permissions: "view",
    gateways: "view",
    domains: "view",
    seo: "edit",
    email: "edit",
    general_settings: "edit",
  },
  branch_manager: {
    dashboard: "view",
    packages: "edit",
    bookings: "edit",
    pilgrims: "edit",
    users: "view",
    branches: "view",
    payments: "edit",
    refunds: "view",
    accounts: "view",
    vendors: "view",
    disbursements: "view",
    stock: "view",
    expenses: "view",
    settlements: "view",
    pos: "view",

    reports: "view",
    audit: "view",
  },
  accountant: {
    dashboard: "view",
    bookings: "view",
    payments: "full",
    refunds: "full",
    accounts: "full",
    vendors: "full",
    disbursements: "full",
    stock: "full",
    expenses: "full",
    settlements: "full",
    pos: "full",

    reports: "full",
    audit: "view",
  },
  agent: {
    dashboard: "view",
    packages: "view",
    bookings: "edit",
    pilgrims: "edit",
    payments: "edit",
  },
  viewer: {
    dashboard: "view",
    packages: "view",
    bookings: "view",
    reports: "view",
    audit: "view",
  },
  pilgrim: {
    bookings: "view",
    payments: "view",
  },
};

type Pg = Client;

async function upsert(client: Pg, table: string, conflict: string, row: Record<string, unknown>) {
  const keys = Object.keys(row);
  const cols = keys.join(", ");
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  const updates = keys
    .filter((k) => k !== conflict && k !== "id")
    .map((k) => `${k} = EXCLUDED.${k}`)
    .join(", ");
  await client.query(
    `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT (${conflict}) DO UPDATE SET ${updates}`,
    keys.map((k) => row[k]),
  );
}

async function findId(client: Pg, sql: string, values: unknown[] = []) {
  const { rows } = await client.query<{ id: string }>(sql, values);
  return rows[0]?.id ?? null;
}

async function seedTenantRoles(client: Pg, schema: string, displayName: string) {
  const now = new Date();
  for (const slug of Object.keys(ROLE_MATRIX)) {
    let roleId = await findId(client, `SELECT id FROM "${schema}".roles WHERE slug = $1`, [slug]);
    if (!roleId) {
      roleId = uuid();
      await client.query(
        `INSERT INTO "${schema}".roles (id, name, slug, is_system, is_active, is_published, is_deleted, created_at, updated_at)
         VALUES ($1,$2,$3,true,true,false,false,$4,$4)`,
        [roleId, slug.replace("_", " "), slug, now],
      );
    }
    for (const [featureKey, level] of Object.entries(ROLE_MATRIX[slug])) {
      const exists = await findId(
        client,
        `SELECT id FROM "${schema}".role_permissions WHERE role_id = $1 AND feature_key = $2`,
        [roleId, featureKey],
      );
      if (!exists) {
        await client.query(
          `INSERT INTO "${schema}".role_permissions (id, role_id, feature_key, permission_level) VALUES ($1,$2,$3,$4)`,
          [uuid(), roleId, featureKey, level],
        );
      }
    }
  }
  const hq = await findId(client, `SELECT id FROM "${schema}".branches WHERE code = 'HQ'`);
  if (!hq) {
    await client.query(
      `INSERT INTO "${schema}".branches (id, name, code, is_headquarters, status, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,$2,'HQ',true,'active',true,true,false,$3,$3)`,
      [uuid(), `${displayName} HQ`, now],
    );
  }
  const settings = await findId(client, `SELECT id FROM "${schema}".tenant_settings LIMIT 1`);
  if (!settings) {
    await client.query(
      `INSERT INTO "${schema}".tenant_settings (id, display_name, title, description, currency, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'BDT',true,true,false,$5,$5)`,
      [uuid(), displayName, `${displayName} | Hajj & Umrah`, "Pilgrimage booking with Wufud.", now],
    );
  }
}

async function ensureUser(
  client: Pg,
  email: string,
  fullName: string,
  hash: string,
  tenantId: string | null,
  now: Date,
) {
  const existing = await findId(client, "SELECT id FROM users WHERE email = $1", [email]);
  if (existing) return existing;
  const id = uuid();
  await client.query(
    `INSERT INTO users (id, email, full_name, tenant_id, email_verified, password_hash, password_set_at, is_active, is_published, is_deleted, created_at, updated_at)
     VALUES ($1,$2,$3,$4,true,$5,$6,true,false,false,$6,$6)`,
    [id, email, fullName, tenantId, hash, now],
  );
  return id;
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const now = new Date();
  const hash = await argon2.hash(PASSWORD);

  for (const host of ["localhost", "wufud.localhost", "127.0.0.1"]) {
    await upsert(client, "platform_domains", "host", {
      id: uuid(),
      host,
      is_primary: host === "wufud.localhost",
      created_at: now,
      updated_at: now,
      is_active: true,
      is_published: true,
      is_deleted: false,
    });
  }

  await upsert(client, "payment_gateway_catalog", "slug", {
    id: uuid(),
    slug: "sslcommerz",
    name: "SSLCommerz",
    description: "bKash, Nagad, VISA via SSLCommerz",
    is_enabled_for_tenants: true,
    is_sandbox: true,
    sort_order: 1,
    config_schema: JSON.stringify([
      { key: "store_id", label: "Store ID", type: "text", required: true },
      { key: "store_password", label: "Store Password", type: "password", required: true },
    ]),
    created_at: now,
    updated_at: now,
    is_active: true,
    is_published: true,
    is_deleted: false,
  });
  await upsert(client, "payment_gateway_catalog", "slug", {
    id: uuid(),
    slug: "stripe",
    name: "Stripe",
    description: "Card payments via Stripe Checkout",
    is_enabled_for_tenants: true,
    is_sandbox: true,
    sort_order: 2,
    config_schema: JSON.stringify([
      { key: "publishable_key", label: "Publishable Key", type: "text", required: true },
      { key: "secret_key", label: "Secret Key", type: "password", required: true },
    ]),
    created_at: now,
    updated_at: now,
    is_active: true,
    is_published: true,
    is_deleted: false,
  });
  await upsert(client, "payment_gateway_catalog", "slug", {
    id: uuid(),
    slug: "stub",
    name: "Stub (local)",
    description: "Instant success for local testing",
    is_enabled_for_tenants: true,
    is_sandbox: true,
    sort_order: 0,
    config_schema: JSON.stringify([]),
    created_at: now,
    updated_at: now,
    is_active: true,
    is_published: true,
    is_deleted: false,
  });

  const features = PACKAGE_GATED_KEYS;
  await upsert(client, "plans", "slug", {
    id: uuid(),
    name: "Starter",
    slug: "starter",
    price_monthly: "4900",
    features: JSON.stringify(features.slice(0, 6)),
    max_users: 10,
    max_branches: 1,
    sort_order: 1,
    trial_days: 14,
    invitation_expires_hours: 168,
    created_at: now,
    updated_at: now,
    is_active: true,
    is_published: true,
    is_deleted: false,
  });
  await upsert(client, "plans", "slug", {
    id: uuid(),
    name: "Growth",
    slug: "growth",
    price_monthly: "12900",
    features: JSON.stringify(features),
    max_users: 50,
    max_branches: 5,
    sort_order: 2,
    trial_days: 14,
    invitation_expires_hours: 72,
    created_at: now,
    updated_at: now,
    is_active: true,
    is_published: true,
    is_deleted: false,
  });
  await upsert(client, "plans", "slug", {
    id: uuid(),
    name: "Enterprise",
    slug: "enterprise",
    price_monthly: "0",
    features: JSON.stringify(features),
    max_users: 0,
    max_branches: 0,
    sort_order: 3,
    trial_days: 30,
    invitation_expires_hours: 336,
    created_at: now,
    updated_at: now,
    is_active: true,
    is_published: true,
    is_deleted: false,
  });

  const seoId = await findId(client, "SELECT id FROM platform_seo_settings LIMIT 1");
  if (!seoId) {
    await client.query(
      `INSERT INTO platform_seo_settings (id, title, description, keywords, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,$2,$3,$4,true,true,false,$5,$5)`,
      [
        uuid(),
        "Wufud — Pilgrimage Booking SaaS",
        "Give every Hajj and Umrah agency its own booking ERP.",
        "hajj, umrah, booking, saas",
        now,
      ],
    );
  }

  let superadminId = await findId(client, "SELECT id FROM platform_roles WHERE slug = 'superadmin'");
  if (!superadminId) {
    superadminId = uuid();
    await client.query(
      `INSERT INTO platform_roles (id, name, slug, is_system, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,'Superadmin','superadmin',true,true,false,false,$2,$2)`,
      [superadminId, now],
    );
  }
  for (const key of PLATFORM_KEYS) {
    const exists = await findId(
      client,
      "SELECT id FROM platform_role_permissions WHERE role_id = $1 AND module_key = $2",
      [superadminId, key],
    );
    if (!exists) {
      await client.query(
        `INSERT INTO platform_role_permissions (id, role_id, module_key, permission_level, is_active, is_published, is_deleted, created_at, updated_at)
         VALUES ($1,$2,$3,'full',true,false,false,$4,$4)`,
        [uuid(), superadminId, key, now],
      );
    }
  }

  const adminId = await ensureUser(client, "admin@wufud.local", "Platform Admin", hash, null, now);
  const hasRole = await findId(
    client,
    "SELECT id FROM platform_user_roles WHERE user_id = $1 AND role_id = $2",
    [adminId, superadminId],
  );
  if (!hasRole) {
    await client.query("INSERT INTO platform_user_roles (id, user_id, role_id) VALUES ($1,$2,$3)", [
      uuid(),
      adminId,
      superadminId,
    ]);
  }

  let tenantId = await findId(client, "SELECT id FROM tenants WHERE slug = 'demo'");
  const schema = "t_demo";
  if (!tenantId) {
    tenantId = uuid();
    await client.query(
      `INSERT INTO tenants (id, name, slug, schema_name, status, is_enabled, plan, features, max_users, max_branches, max_roles, owner_email, timezone, currency, locale, version, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,'Nur Travels','demo',$2,'active',true,'growth',$3,50,5,10,'owner@demo.local','Asia/Dhaka','BDT','en',0,true,true,false,$4,$4)`,
      [tenantId, schema, JSON.stringify(Object.fromEntries(features.map((k) => [k, true]))), now],
    );
    await client.query(
      `INSERT INTO domains (id, tenant_id, domain, is_primary, verified_at, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,$2,$3,true,$4,true,true,false,$4,$4)`,
      [uuid(), tenantId, `demo.${PLATFORM_HOST}`, now],
    );
  } else {
    await client.query(
      `UPDATE tenants SET status='active', plan='growth', features=$2, updated_at=$3 WHERE id=$1`,
      [tenantId, JSON.stringify(Object.fromEntries(features.map((k) => [k, true]))), now],
    );
  }

  const growthId = await findId(client, "SELECT id FROM plans WHERE slug = 'growth'");
  const sub = await findId(client, "SELECT id FROM tenant_subscriptions WHERE tenant_id = $1", [tenantId]);
  if (!sub && growthId) {
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    await client.query(
      `INSERT INTO tenant_subscriptions (id, tenant_id, plan_id, status, current_period_start, current_period_end, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,$2,$3,'active',$4,$5,true,false,false,$4,$4)`,
      [uuid(), tenantId, growthId, now, end],
    );
  }

  await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await client.query(TENANT_DDL.replaceAll("__SCHEMA__", schema));
  await seedTenantRoles(client, schema, "Nur Travels");

  const ctg = await findId(client, `SELECT id FROM "${schema}".branches WHERE code = 'CTG'`);
  if (!ctg) {
    await client.query(
      `INSERT INTO "${schema}".branches (id, name, code, is_headquarters, status, city, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,'Chittagong','CTG',false,'active','Chittagong',true,true,false,$2,$2)`,
      [uuid(), now],
    );
  }

  const ownerId = await ensureUser(client, "owner@demo.local", "Agency Owner", hash, tenantId, now);
  const managerId = await ensureUser(client, "manager.ctg@demo.local", "CTG Manager", hash, tenantId, now);
  const agentId = await ensureUser(client, "agent@demo.local", "Booking Agent", hash, tenantId, now);
  const pilgrimId = await ensureUser(client, "pilgrim@demo.local", "Demo Pilgrim", hash, tenantId, now);

  const assign = async (userId: string, email: string, slug: string, branchCode?: string) => {
    const roleId = await findId(client, `SELECT id FROM "${schema}".roles WHERE slug = $1`, [slug]);
    if (!roleId) return;
    let branchId: string | null = null;
    if (branchCode) {
      branchId = await findId(client, `SELECT id FROM "${schema}".branches WHERE code = $1`, [branchCode]);
    }
    const exists = await findId(
      client,
      `SELECT id FROM "${schema}".user_roles WHERE user_id = $1 AND role_id = $2`,
      [userId, roleId],
    );
    if (!exists) {
      await client.query(
        `INSERT INTO "${schema}".user_roles (id, user_id, user_email, role_id, branch_id) VALUES ($1,$2,$3,$4,$5)`,
        [uuid(), userId, email, roleId, branchId],
      );
    }
  };
  await assign(ownerId, "owner@demo.local", "admin");
  await assign(managerId, "manager.ctg@demo.local", "branch_manager", "CTG");
  await assign(agentId, "agent@demo.local", "agent");
  await assign(pilgrimId, "pilgrim@demo.local", "pilgrim");

  const pkgCount = await client.query(`SELECT count(id) AS c FROM "${schema}".packages`);
  if (!Number(pkgCount.rows[0]?.c)) {
    const hqId = await findId(client, `SELECT id FROM "${schema}".branches WHERE code = 'HQ'`);
    const kinds = [
      { name: "Hajj 2027", kind: "hajj", days: 400 },
      { name: "Ramadan Umrah", kind: "ramadan_umrah", days: 180 },
      { name: "Off-season Umrah", kind: "offseason_umrah", days: 90 },
      { name: "Ziyarah Turkey", kind: "ziyarah", days: 60 },
    ];
    for (const k of kinds) {
      const id = uuid();
      const dep = new Date();
      dep.setDate(dep.getDate() + k.days);
      await client.query(
        `INSERT INTO "${schema}".packages (id, name, kind, description, departure_date, booking_opens_at, booking_closes_at, branch_id, is_active, is_published, is_deleted, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,true,false,$6,$6)`,
        [id, k.name, k.kind, `${k.name} with Nur Travels`, dep.toISOString().slice(0, 10), now, dep, hqId],
      );
      for (const [name, price, seats] of [
        ["Economy", "250000", 40],
        ["Standard", "350000", 25],
        ["VIP", "550000", 8],
      ] as const) {
        await client.query(
          `INSERT INTO "${schema}".package_tiers (id, package_id, name, price, currency, seats_total, seats_confirmed, seats_held, is_active, is_published, is_deleted, created_at, updated_at)
           VALUES ($1,$2,$3,$4,'BDT',$5,0,0,true,true,false,$6,$6)`,
          [uuid(), id, name, price, Number(seats), now],
        );
      }
    }
    await client.query(
      `INSERT INTO "${schema}".cancellation_rules (id, days_before_departure, charge_percent, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,90,10,true,true,false,$3,$3), ($2,30,25,true,true,false,$3,$3)`,
      [uuid(), uuid(), now],
    );
    const tierId = await findId(client, `SELECT id FROM "${schema}".package_tiers WHERE name='Standard' LIMIT 1`);
    const bookingId = uuid();
    await client.query(
      `INSERT INTO "${schema}".bookings (id, user_id, tier_id, branch_id, status, frozen_price, currency, pilgrim_count, payment_mode, amount_received, hold_expires_at, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'confirmed','700000','BDT',2,'installment','210000',$5,true,false,false,$6,$6)`,
      [bookingId, pilgrimId, tierId, hqId, new Date(Date.now() + 86400000), now],
    );
    await client.query(
      `INSERT INTO "${schema}".booking_pilgrims (id, booking_id, full_name, passport_number, nationality, cancelled, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,$3,'Demo Pilgrim','A1234567','BD',false,true,false,false,$4,$4),
              ($2,$3,'Companion','A7654321','BD',false,true,false,false,$4,$4)`,
      [uuid(), uuid(), bookingId, now],
    );
    await client.query(`UPDATE "${schema}".package_tiers SET seats_confirmed=seats_confirmed+2 WHERE id=$1`, [tierId]);
    await client.query(`INSERT INTO "${schema}".payments (id, booking_id, source, amount, currency, created_at, updated_at) VALUES ($1,$2,'manual','210000','BDT',$3,$3)`, [uuid(), bookingId, now]);
    await client.query(`INSERT INTO "${schema}".manual_payments (id, booking_id, amount, method, recorded_by_id, approved_by_id, status, created_at, updated_at) VALUES ($1,$2,'210000','cash',$3,$4,'approved',$5,$5)`, [uuid(), bookingId, agentId, ownerId, now]);
    const planId = uuid();
    await client.query(
      `INSERT INTO "${schema}".installment_plans (id, booking_id, down_payment, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,$2,'210000',true,false,false,$3,$3)`,
      [planId, bookingId, now],
    );
    const due0 = now.toISOString().slice(0, 10);
    const due1 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const due2 = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
    await client.query(
      `INSERT INTO "${schema}".installments (id, plan_id, sequence, due_date, amount_due, amount_paid, status, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,$4,0,$5,'210000','210000','paid',true,false,false,$8,$8),
              ($2,$4,1,$6,'245000','0','open',true,false,false,$8,$8),
              ($3,$4,2,$7,'245000','0','open',true,false,false,$8,$8)`,
      [uuid(), uuid(), uuid(), planId, due0, due1, due2, now],
    );
    await client.query(
      `INSERT INTO "${schema}".manual_payments (id, booking_id, amount, method, recorded_by_id, status, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,$2,'50000','cash',$3,'pending',true,false,false,$4,$4)`,
      [uuid(), bookingId, agentId, now],
    );
    await client.query(
      `INSERT INTO "${schema}".refund_requests (id, booking_id, amount, status, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,$2,'10000','requested',true,false,false,$3,$3)`,
      [uuid(), bookingId, now],
    );
    const vendorId = uuid();
    await client.query(
      `INSERT INTO "${schema}".vendors (id, name, kind, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,'Makkah Hotel Co','hotel',true,true,false,$2,$2)`,
      [vendorId, now],
    );
    await client.query(
      `INSERT INTO "${schema}".vendor_disbursements (id, vendor_id, booking_id, amount_sar, fx_rate, amount_bdt, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,$2,$3,'2000','32.5','65000',true,false,false,$4,$4)`,
      [uuid(), vendorId, bookingId, now],
    );
    await client.query(
      `INSERT INTO "${schema}".stock_items (id, name, quantity, unit_cost, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,'Ihram set',80,'1200',true,true,false,$3,$3),
              ($2,'Travel bag',60,'800',true,true,false,$3,$3)`,
      [uuid(), uuid(), now],
    );
    await client.query(
      `INSERT INTO "${schema}".tenant_gateway_instances (id, gateway_slug, credentials, is_sandbox, is_gateway_active, is_default, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,'stub',$2,true,true,false,true,false,false,$3,$3)
       ON CONFLICT (gateway_slug) DO NOTHING`,
      [uuid(), JSON.stringify({ stub: "1" }), now],
    );
  }

  await applyDynamicIntegrations(client, schema, now);
  await maybeInviteTenant(client, now);

  await client.end();
  console.log("Demo seed complete.");
  console.log("Platform admin: admin@wufud.local");
  console.log("Tenant admin:   owner@demo.local");
  console.log("Branch manager: manager.ctg@demo.local");
  console.log("Agent:          agent@demo.local");
  console.log("Pilgrim:        pilgrim@demo.local");
  console.log(`Password:       ${PASSWORD}`);
}

function envStr(name: string) {
  return (process.env[name] ?? "").trim();
}

async function applyDynamicIntegrations(client: Pg, demoSchema: string, now: Date) {
  const sslId = envStr("SSLCOMMERZ_STORE_ID");
  const sslPass = envStr("SSLCOMMERZ_STORE_PASSWORD");
  const stripePk = envStr("STRIPE_PUBLISHABLE_KEY");
  const stripeSk = envStr("STRIPE_SECRET_KEY");
  const smtpUser = envStr("EMAIL_SMTP_USER") || envStr("SMTP_USER");
  const smtpPass = envStr("EMAIL_SMTP_PASSWORD") || envStr("SMTP_PASS");
  const smtpHost = envStr("EMAIL_SMTP_HOST") || (smtpUser ? "smtp.gmail.com" : envStr("SMTP_HOST") || "smtp.gmail.com");
  const smtpPort = Number(envStr("EMAIL_SMTP_PORT") || envStr("SMTP_PORT") || "465");
  const smtpFrom = envStr("EMAIL_FROM") || envStr("SMTP_FROM") || smtpUser;
  const smtpSsl = (envStr("EMAIL_SMTP_SECURE") || envStr("SMTP_SECURE") || "true").toLowerCase() !== "false";

  if (sslId && sslPass) {
    await client.query(
      `UPDATE payment_gateway_catalog SET platform_credentials = $2, is_sandbox = true, is_enabled_for_tenants = true, updated_at = $3 WHERE slug = $1`,
      ["sslcommerz", JSON.stringify({ store_id: sslId, store_password: sslPass }), now],
    );
  }
  if (stripePk && stripeSk) {
    await client.query(
      `UPDATE payment_gateway_catalog SET platform_credentials = $2, is_sandbox = true, is_enabled_for_tenants = true, updated_at = $3 WHERE slug = $1`,
      ["stripe", JSON.stringify({ publishable_key: stripePk, secret_key: stripeSk }), now],
    );
  }

  const schemas = [demoSchema];
  const { rows: tenants } = await client.query<{ schema_name: string }>(
    "SELECT schema_name FROM tenants WHERE is_deleted = false",
  );
  for (const t of tenants) {
    if (!schemas.includes(t.schema_name)) schemas.push(t.schema_name);
  }

  for (const schema of schemas) {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await client.query(TENANT_DDL.replaceAll("__SCHEMA__", schema));
    await upsertTenantGateway(client, schema, "stub", { stub: "1" }, true, now);
    if (sslId && sslPass) {
      await upsertTenantGateway(client, schema, "sslcommerz", { store_id: sslId, store_password: sslPass }, true, now);
    }
    if (stripePk && stripeSk) {
      await upsertTenantGateway(client, schema, "stripe", { publishable_key: stripePk, secret_key: stripeSk }, true, now);
    }
    if (smtpUser && smtpPass) {
      await upsertEmailAccount(client, `"${schema}".tenant_email_accounts`, {
        label: "Primary SMTP",
        host: smtpHost,
        port: smtpPort,
        username: smtpUser,
        password: smtpPass,
        fromAddress: smtpFrom.includes("<") ? smtpUser : smtpFrom || smtpUser,
        fromName: "Wufud",
        useSsl: smtpSsl,
        now,
      });
    }
  }

  if (smtpUser && smtpPass) {
    await upsertEmailAccount(client, "platform_email_accounts", {
      label: "Primary SMTP",
      host: smtpHost,
      port: smtpPort,
      username: smtpUser,
      password: smtpPass,
      fromAddress: smtpFrom.includes("<") ? smtpUser : smtpFrom || smtpUser,
      fromName: "Wufud",
      useSsl: smtpSsl,
      now,
    });
  }
}

async function upsertTenantGateway(
  client: Pg,
  schema: string,
  slug: string,
  credentials: Record<string, string>,
  active: boolean,
  now: Date,
) {
  const existing = await findId(client, `SELECT id FROM "${schema}".tenant_gateway_instances WHERE gateway_slug = $1`, [slug]);
  if (existing) {
    await client.query(
      `UPDATE "${schema}".tenant_gateway_instances SET credentials = $2, is_sandbox = true, is_gateway_active = $3, is_deleted = false, updated_at = $4 WHERE id = $1`,
      [existing, JSON.stringify(credentials), active, now],
    );
    return;
  }
  await client.query(
    `INSERT INTO "${schema}".tenant_gateway_instances (id, gateway_slug, credentials, is_sandbox, is_gateway_active, is_default, is_active, is_published, is_deleted, created_at, updated_at)
     VALUES ($1,$2,$3,true,$4,false,true,false,false,$5,$5)`,
    [uuid(), slug, JSON.stringify(credentials), active, now],
  );
}

async function ensureOneDefault(client: Pg, table: string, preferWhere: string) {
  const has = await findId(client, `SELECT id FROM ${table} WHERE is_default = true AND is_deleted = false`);
  if (has) return;
  const prefer = await findId(client, `SELECT id FROM ${table} WHERE ${preferWhere} AND is_deleted = false`);
  const any = prefer ?? (await findId(client, `SELECT id FROM ${table} WHERE is_deleted = false ORDER BY created_at LIMIT 1`));
  if (!any) return;
  await client.query(`UPDATE ${table} SET is_default = (id = $1) WHERE is_deleted = false`, [any]);
}

async function upsertEmailAccount(
  client: Pg,
  table: string,
  input: {
    label: string;
    host: string;
    port: number;
    username: string;
    password: string;
    fromAddress: string;
    fromName: string;
    useSsl: boolean;
    now: Date;
  },
) {
  const existing = await findId(client, `SELECT id FROM ${table} WHERE username = $1 AND is_deleted = false`, [input.username]);
  if (existing) {
    await client.query(
      `UPDATE ${table} SET label=$2, host=$3, port=$4, password=$5, from_address=$6, from_name=$7, use_ssl=$8, updated_at=$9 WHERE id=$1`,
      [existing, input.label, input.host, input.port, input.password, input.fromAddress, input.fromName, input.useSsl, input.now],
    );
    await ensureOneDefault(client, table, `id = '${existing}'`);
    return;
  }
  const id = uuid();
  const count = await client.query(`SELECT count(id) AS c FROM ${table} WHERE is_deleted = false`);
  const isDefault = !Number(count.rows[0]?.c);
  await client.query(
    `INSERT INTO ${table} (id, label, host, port, username, password, from_address, from_name, use_ssl, is_default, is_active, is_published, is_deleted, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,false,false,$11,$11)`,
    [id, input.label, input.host, input.port, input.username, input.password, input.fromAddress, input.fromName, input.useSsl, isDefault, input.now],
  );
  await ensureOneDefault(client, table, `id = '${id}'`);
}

async function maybeInviteTenant(client: Pg, now: Date) {
  const email = envStr("INVITE_TENANT_EMAIL").toLowerCase();
  if (!email) return;
  const slug = (envStr("INVITE_TENANT_SLUG") || "tenant1").toLowerCase().replace(/[^a-z0-9-]/g, "");
  const name = envStr("INVITE_TENANT_NAME") || "Tenant One";
  const schema = `t_${slug.replace(/-/g, "_")}`;
  const features = JSON.stringify(Object.fromEntries(PACKAGE_GATED_KEYS.map((k) => [k, true])));

  let tenantId = await findId(client, "SELECT id FROM tenants WHERE slug = $1", [slug]);
  if (!tenantId) {
    tenantId = uuid();
    await client.query(
      `INSERT INTO tenants (id, name, slug, schema_name, status, is_enabled, plan, features, max_users, max_branches, max_roles, owner_email, timezone, currency, locale, version, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'trial',true,'growth',$5,50,5,10,$6,'Asia/Dhaka','BDT','en',0,true,true,false,$7,$7)`,
      [tenantId, name, slug, schema, features, email, now],
    );
    await client.query(
      `INSERT INTO domains (id, tenant_id, domain, is_primary, verified_at, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,$2,$3,true,$4,true,true,false,$4,$4)`,
      [uuid(), tenantId, `${slug}.${PLATFORM_HOST}`, now],
    );
  }
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await client.query(TENANT_DDL.replaceAll("__SCHEMA__", schema));
  await seedTenantRoles(client, schema, name);
  await applyDynamicIntegrations(client, schema, now);

  const existingUser = await findId(client, "SELECT id FROM users WHERE email = $1", [email]);
  if (existingUser) {
    console.log(`User ${email} already exists; skip invitation.`);
    return;
  }

  const token = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const existingInvite = await findId(
    client,
    "SELECT id FROM invitations WHERE email = $1 AND tenant_id = $2 AND accepted_at IS NULL AND is_deleted = false",
    [email, tenantId],
  );
  if (existingInvite) {
    const sent = await client.query<{ metadata: { email_sent?: boolean } }>(
      "SELECT metadata FROM invitations WHERE id = $1",
      [existingInvite],
    );
    if (sent.rows[0]?.metadata?.email_sent) {
      console.log(`Invitation already emailed to ${email}`);
      return;
    }
    await client.query(
      `UPDATE invitations SET token_hash = $2, expires_at = $3, metadata = $4, updated_at = $5 WHERE id = $1`,
      [existingInvite, tokenHash, new Date(now.getTime() + 7 * 86400000), JSON.stringify({ role_slug: "admin", email_sent: false }), now],
    );
  } else {
    await client.query(
      `INSERT INTO invitations (id, email, full_name, token_hash, type, expires_at, tenant_id, metadata, is_active, is_published, is_deleted, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'tenant_owner',$5,$6,$7,true,false,false,$8,$8)`,
      [uuid(), email, name, tokenHash, new Date(now.getTime() + 7 * 86400000), tenantId, JSON.stringify({ role_slug: "admin", email_sent: false }), now],
    );
  }

  const originProto = PLATFORM_HOST.includes("localhost") ? "http" : "https";
  const originPort = PLATFORM_HOST.includes("localhost") ? `:${process.env.WEB_PORT ?? "3000"}` : "";
  const acceptUrl = `${originProto}://${slug}.${PLATFORM_HOST}${originPort}/invite?token=${encodeURIComponent(token)}`;

  const mailbox = await client.query<{ host: string; port: number; username: string; password: string; from_address: string; from_name: string; use_ssl: boolean }>(
    `SELECT host, port, username, password, from_address, from_name, use_ssl FROM platform_email_accounts WHERE is_deleted = false ORDER BY is_default DESC, created_at ASC LIMIT 1`,
  );
  const box = mailbox.rows[0];
  if (!box) {
    console.log(`Invitation created for ${email} but no mailbox is configured. Accept URL: ${acceptUrl}`);
    return;
  }
  const transport = nodemailer.createTransport({
    host: box.host,
    port: Number(box.port),
    secure: Boolean(box.use_ssl) || Number(box.port) === 465,
    auth: { user: box.username, pass: String(box.password ?? "").replace(/\s+/g, "") },
  });
  const from = box.from_name ? `${box.from_name} <${box.from_address}>` : box.from_address;
  try {
    await transport.sendMail({
      from,
      to: email,
      subject: `You're invited to ${name} on Wufud`,
      text: `You've been invited to join ${name} on Wufud.\n\nOpen this link to set your password: ${acceptUrl}\n\nThis invitation expires in 7 days.`,
      html: `<p>You've been invited to join <strong>${name}</strong> on Wufud.</p><p><a href="${acceptUrl}">Accept invitation and set your password</a></p><p>This invitation expires in 7 days.</p>`,
    });
    await client.query(
      `UPDATE invitations SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{email_sent}', 'true', true) WHERE email = $1 AND tenant_id = $2 AND accepted_at IS NULL`,
      [email, tenantId],
    );
    console.log(`Tenant invitation emailed to ${email}`);
  } catch (err) {
    console.error(`Failed to email invitation to ${email}: ${(err as Error).message}`);
    console.log(`Accept URL (share manually): ${acceptUrl}`);
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
