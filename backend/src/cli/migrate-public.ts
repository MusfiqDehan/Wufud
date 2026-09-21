import { Client } from "pg";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const candidates = [
    join(__dirname, "../migrations/public/001_public.sql"),
    join(process.cwd(), "src/migrations/public/001_public.sql"),
    join(process.cwd(), "dist/migrations/public/001_public.sql"),
  ];
  const path = candidates.find((p) => existsSync(p));
  if (!path) throw new Error("001_public.sql not found");
  const sql = readFileSync(path, "utf8");
  const client = new Client({
    connectionString: process.env.DATABASE_URL ?? "postgresql://wufud:wufud@localhost:5432/wufud",
  });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log("Public schema migrated.");
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
