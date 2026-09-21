import { MikroORM } from "@mikro-orm/postgresql";
import config from "../mikro-orm.public.config";
import { Migration20260921000000 } from "../migrations/public/Migration20260921000000";

export async function migratePublic() {
  const orm = await MikroORM.init(config);
  const knex = orm.em.getConnection().getKnex();
  const mig = new Migration20260921000000(orm.em.getDriver(), orm.config);
  await mig.up();
  const sql = (mig as unknown as { getQueries(): { query: string }[] }).getQueries?.() ?? [];
  if (!sql.length) {
    // Migration.addSql buffers; execute via raw helper
  }
  await orm.close(true);
}

export async function runPublicSql() {
  const orm = await MikroORM.init(config);
  const conn = orm.em.getConnection();
  const mig = new Migration20260921000000(orm.em.getDriver(), orm.config);
  const up = mig.up.bind(mig);
  const statements: string[] = [];
  const original = mig.addSql.bind(mig);
  mig.addSql = (q: string) => {
    statements.push(q);
    return original(q);
  };
  await up();
  for (const s of statements) {
    await conn.execute(s);
  }
  await orm.close(true);
}
