import { defineConfig } from "prisma/config";
try {
  process.loadEnvFile(".env.local");
} catch {}
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx scripts/seed.mts" },
  datasource: {
    url:
      process.env.MIGRATION_DATABASE_URL ||
      process.env.DATABASE_URL ||
      "mysql://build:build@127.0.0.1:3306/xinanyi_dev",
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
