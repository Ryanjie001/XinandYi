import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { hashPassword } from "better-auth/crypto";
import { createDatabase } from "../src/lib/db-factory";
import { seedData } from "./seed-data";
process.loadEnvFile(".env.local");
if (
  process.env.DATABASE_ENV !== "development" ||
  new URL(process.env.MIGRATION_DATABASE_URL!).pathname !== "/xinanyi_dev"
)
  throw new Error("Seed is restricted to the development database.");
const db = createDatabase(process.env.MIGRATION_DATABASE_URL!, 2);
try {
  const accounts: Record<string, unknown> = {};
  for (const [id, person] of [
    ["xin", "新"],
    ["yi", "怡"],
  ]) {
    const email = id + "@xinandyi.local";
    if (await db.user.findUnique({ where: { id } })) continue;
    const password = randomBytes(18).toString("base64url") + "aA9!";
    const digest = await hashPassword(password);
    await db.user.create({
      data: {
        id,
        name: person,
        person,
        email,
        emailVerified: true,
        accounts: {
          create: { id: randomUUID(), accountId: id, providerId: "credential", password: digest },
        },
      },
    });
    accounts[person] = { email, password };
  }
  const folder = path.resolve("work/private");
  fs.mkdirSync(folder, { recursive: true });
  if (process.platform === "win32") {
    const user = execFileSync("whoami.exe", { encoding: "utf8" }).trim();
    execFileSync(
      "icacls.exe",
      [
        folder,
        "/inheritance:r",
        "/grant:r",
        user + ":(OI)(CI)(F)",
        "*S-1-5-18:(OI)(CI)(F)",
        "*S-1-5-32-544:(OI)(CI)(F)",
      ],
      { stdio: "ignore" },
    );
  } else fs.chmodSync(folder, 0o700);
  if (Object.keys(accounts).length) {
    const file = path.join(folder, "initial-accounts.json");
    const prior = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
    fs.writeFileSync(file, JSON.stringify({ ...prior, ...accounts }, null, 2), { mode: 0o600 });
  }
  await db.coupleSettings.upsert({ where: { id: "us" }, create: { id: "us" }, update: {} });
  for (const m of seedData.memories) {
    const { author, ...data } = m;
    await db.memory.upsert({
      where: { id: m.id },
      create: { ...data, authorId: author === "新" ? "xin" : "yi" },
      update: {},
    });
  }
  for (const w of seedData.wishes) {
    const { author, ...data } = w;
    await db.wish.upsert({
      where: { id: w.id },
      create: { ...data, authorId: author === "新" ? "xin" : "yi" },
      update: {},
    });
  }
  console.log(
    "Development seed complete. Existing credentials preserved. Initial credentials: work/private/initial-accounts.json",
  );
} finally {
  await db.$disconnect();
}
