import { Client } from "pg";

/** Rebuild derived counters from retained booking/hold history, with an audit trail. */
async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://wufud:wufud@localhost:55432/wufud" });
  await client.connect();
  try {
    const tenants = await client.query<{ schema_name: string }>("select schema_name from public.tenants where is_deleted=false");
    for (const { schema_name: schema } of tenants.rows) {
      if (!/^t_[a-z0-9_]+$/.test(schema)) throw new Error("Invalid tenant schema");
      await client.query("BEGIN");
      try {
        await client.query(`LOCK TABLE "${schema}".package_tiers, "${schema}".bookings, "${schema}".seat_holds IN EXCLUSIVE MODE`);
        await client.query(`UPDATE "${schema}".seat_holds h SET is_open=false, updated_at=now() FROM "${schema}".bookings b WHERE h.booking_id=b.id AND h.is_open AND b.status<>'held'`);
        const result = await client.query(`WITH expected AS (
          SELECT t.id, t.seats_held old_held, t.seats_confirmed old_confirmed,
            (SELECT coalesce(sum(h.seats),0) FROM "${schema}".seat_holds h WHERE h.tier_id=t.id AND h.is_open)::int held,
            (SELECT coalesce(sum(b.pilgrim_count),0) FROM "${schema}".bookings b WHERE b.tier_id=t.id AND b.status IN ('confirmed','defaulted'))::int confirmed
          FROM "${schema}".package_tiers t
        ), changed AS (
          UPDATE "${schema}".package_tiers t SET seats_held=e.held, seats_confirmed=e.confirmed, updated_at=now() FROM expected e
          WHERE t.id=e.id AND (t.seats_held<>e.held OR t.seats_confirmed<>e.confirmed)
          RETURNING t.id, e.old_held, e.old_confirmed, e.held, e.confirmed
        ) INSERT INTO "${schema}".audit_logs (id, action, target_type, target_id, metadata, created_at, updated_at)
          SELECT gen_random_uuid(), 'quota.rebuild', 'package_tier', id, jsonb_build_object('oldHeld',old_held,'oldConfirmed',old_confirmed,'held',held,'confirmed',confirmed), now(), now() FROM changed`);
        await client.query("COMMIT");
        console.log(`${schema}: repaired ${result.rowCount} tier counters`);
      } catch (error) { await client.query("ROLLBACK"); throw error; }
    }
  } finally { await client.end(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
