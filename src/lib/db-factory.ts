import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";
export function createDatabase(url: string, limit = 5) {
  const parsed = new URL(url);
  if (parsed.protocol !== "mysql:") throw new Error("MySQL connection configuration is invalid.");
  const adapter = new PrismaMariaDb({
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.slice(1)),
    connectionLimit: limit,
    connectTimeout: 10000,
    acquireTimeout: 10000,
    idleTimeout: 60,
    timezone: "+00:00",
    initSql: "SET time_zone = '+00:00'",
  });
  return new PrismaClient({ adapter, log: ["error"] });
}
