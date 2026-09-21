import { defineConfig } from "@mikro-orm/postgresql";
import { Migrator } from "@mikro-orm/migrations";
import { SeedManager } from "@mikro-orm/seeder";
import { PUBLIC_ENTITIES } from "./database/entities";
import { env } from "./shared/config/env";

export default defineConfig({
  clientUrl: env.DATABASE_URL,
  entities: PUBLIC_ENTITIES,
  schema: "public",
  debug: env.NODE_ENV === "development",
  extensions: [Migrator, SeedManager],
  migrations: {
    path: "dist/migrations/public",
    pathTs: "src/migrations/public",
  },
  seeder: {
    path: "dist/database/seeders",
    pathTs: "src/database/seeders",
  },
});
