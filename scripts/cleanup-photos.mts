import COS from "cos-nodejs-sdk-v5";
import { createDatabase } from "../src/lib/db-factory";
process.loadEnvFile(".env.local");
if (
  process.env.DATABASE_ENV !== "development" ||
  new URL(process.env.MIGRATION_DATABASE_URL!).pathname !== "/xinanyi_dev" ||
  process.env.COS_PREFIX !== "xinanyi/development"
)
  throw new Error("Cleanup is restricted to development.");
const db = createDatabase(process.env.MIGRATION_DATABASE_URL!, 1);
const execute = process.argv.includes("--execute"),
  cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
const cos = new COS({
  SecretId: process.env.COS_SECRET_ID!,
  SecretKey: process.env.COS_SECRET_KEY!,
});
let candidates = 0,
  removed = 0;
try {
  const photos = await db.photo.findMany({
    where: { createdAt: { lt: cutoff }, memories: { none: {} }, covers: { none: {} } },
    take: 50,
    orderBy: { createdAt: "asc" },
  });
  for (const p of photos) {
    if (
      p.bucket !== process.env.COS_BUCKET ||
      p.region !== process.env.COS_REGION ||
      !p.objectKey.startsWith(process.env.COS_PREFIX + "/photos/")
    )
      continue;
    candidates++;
    if (!execute) continue;
    const marked = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM photo WHERE id=${p.id} FOR UPDATE`;
      const current = await tx.photo.findUnique({
        where: { id: p.id },
        include: { _count: { select: { memories: true, covers: true } } },
      });
      if (!current || current._count.memories || current._count.covers) return false;
      await tx.photo.update({ where: { id: p.id }, data: { status: "deleting" } });
      return true;
    });
    if (!marked) continue;
    await cos.deleteObject({ Bucket: p.bucket, Region: p.region, Key: p.objectKey });
    await db.photo.delete({ where: { id: p.id } });
    removed++;
  }
  console.log(JSON.stringify({ mode: execute ? "execute" : "dry-run", candidates, removed }));
} finally {
  await db.$disconnect();
}
