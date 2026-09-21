import { migrateAccountFeatures, migrateAccountPlanFeatures } from "./migrate-account-features";
import { Client } from "pg";
import { TENANT_DDL } from "../tenancy/tenant-ddl";

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL ?? "postgresql://wufud:wufud@localhost:5432/wufud",
  });
  await client.connect();
  await migrateAccountPlanFeatures(client);
  const { rows } = await client.query<{ schema_name: string; slug: string }>(
    "SELECT schema_name, slug FROM tenants WHERE is_deleted = false",
  );
  for (const t of rows) {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${t.schema_name}"`);
    await client.query(TENANT_DDL.replaceAll("__SCHEMA__", t.schema_name));
    await migrateAccountFeatures(client, t.schema_name);
    console.log(`Migrated ${t.slug} (${t.schema_name})`);
  }
  await client.end();
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
