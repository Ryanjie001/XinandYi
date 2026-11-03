import "server-only";
import { createDatabase } from "@/lib/db-factory";
const globalDb = globalThis as unknown as { xinanyiDb?: ReturnType<typeof createDatabase> };
export function database() {
  if (!globalDb.xinanyiDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not configured.");
    globalDb.xinanyiDb = createDatabase(url, 3);
  }
  return globalDb.xinanyiDb;
}
