import { Client } from "pg";

/** One-time expansion preserves current account access; explicit new overrides win. */
export async function migrateAccountFeatures(client: Client, schema: string) {
  if (!/^t_[a-z0-9_]+$/.test(schema)) throw new Error("Invalid tenant schema");
  await client.query(`CREATE TABLE IF NOT EXISTS "${schema}".app_migrations (name text PRIMARY KEY)`);
  const done = await client.query(`SELECT 1 FROM "${schema}".app_migrations WHERE name = 'accounts-pages-v1'`);
  if (done.rowCount) return;
  const keys = ["vendors", "disbursements", "stock", "expenses", "settlements", "pos"];
  await client.query("BEGIN");
  try {
    for (const key of keys) {
      await client.query(`UPDATE public.tenants SET features = jsonb_set(coalesce(features, '{}'::jsonb), ARRAY[$1], coalesce(features->'accounts', 'false'::jsonb)) WHERE schema_name=$2 AND NOT coalesce(features, '{}'::jsonb) ? $1`, [key, schema]);
      await client.query(`INSERT INTO "${schema}".role_permissions (id, role_id, feature_key, permission_level) SELECT gen_random_uuid(), role_id, $1, permission_level FROM "${schema}".role_permissions WHERE feature_key='accounts' ON CONFLICT (role_id, feature_key) DO NOTHING`, [key]);
      await client.query(`INSERT INTO public.tenant_feature_overrides (id, tenant_id, feature_key, enabled) SELECT gen_random_uuid(), o.tenant_id, $1, o.enabled FROM public.tenant_feature_overrides o JOIN public.tenants t ON t.id=o.tenant_id WHERE o.feature_key='accounts' AND t.schema_name=$2 ON CONFLICT (tenant_id, feature_key) DO NOTHING`, [key, schema]);
    }
    await client.query(`INSERT INTO "${schema}".app_migrations(name) VALUES ('accounts-pages-v1')`);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}

export async function migrateAccountPlanFeatures(client: Client) {
  await client.query("CREATE TABLE IF NOT EXISTS public.app_migrations (name text PRIMARY KEY)");
  await client.query("BEGIN");
  try {
    const done = await client.query("SELECT 1 FROM public.app_migrations WHERE name='accounts-plan-pages-v1'");
    if (!done.rowCount) {
      await client.query(`UPDATE public.plans SET features = features || '["vendors","disbursements","stock","expenses","settlements","pos"]'::jsonb WHERE jsonb_typeof(features)='array' AND features ? 'accounts' AND NOT features ? 'pos'`);
      await client.query("INSERT INTO public.app_migrations(name) VALUES ('accounts-plan-pages-v1')");
    }
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}
