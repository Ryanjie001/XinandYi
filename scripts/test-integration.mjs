import assert from "node:assert/strict";
import fs from "node:fs";
import { randomBytes, createHash } from "node:crypto";
import mysql from "mysql2/promise";
import COS from "cos-nodejs-sdk-v5";
import sharp from "sharp";
process.loadEnvFile(".env.local");
assert.equal(process.env.DATABASE_ENV, "development");
assert.equal(new URL(process.env.DATABASE_URL).pathname, "/xinanyi_dev");
const base = "http://127.0.0.1:3000",
  tag = "QA-" + randomBytes(6).toString("hex");
const accounts = JSON.parse(fs.readFileSync("work/private/initial-accounts.json", "utf8"));
const cookies = {},
  photos = [],
  checks = [];
let db;
let success = false;
fs.writeFileSync("work/integration-run.json", JSON.stringify({ tag, photos }));
async function request(path, person, method = "GET", data, origin = base) {
  const headers = {};
  if (person) headers.Cookie = cookies[person];
  if (method !== "GET") headers.Origin = origin;
  if (data && !(data instanceof FormData)) headers["Content-Type"] = "application/json";
  return fetch(base + path, {
    method,
    headers,
    body: data ? (data instanceof FormData ? data : JSON.stringify(data)) : undefined,
    redirect: "manual",
  });
}
async function ok(r, status = 200) {
  assert.equal(r.status, status, "Unexpected API status");
  return r.json();
}
async function login(person) {
  const r = await request("/api/auth/sign-in/email", null, "POST", accounts[person]);
  assert.equal(r.status, 200, "Account sign-in failed");
  cookies[person] = r.headers
    .getSetCookie()
    .map((x) => x.split(";")[0])
    .join("; ");
  return cookies[person];
}
try {
  assert.equal((await request("/")).status, 307);
  assert.equal((await request("/api/state")).status, 401);
  assert.equal((await request("/api/photos/00000000-0000-0000-0000-000000000000")).status, 401);
  assert.equal((await request("/api/data/memories", null, "POST", { title: "x" })).status, 401);
  assert.equal((await request("/api/auth/sign-up/email", null, "POST", {})).status, 404);
  checks.push("Unauthenticated data/pages/photos blocked; signup closed");
  assert.equal(
    (
      await request("/api/auth/sign-in/email", null, "POST", {
        email: accounts["新"].email,
        password: "incorrect-password-123",
      })
    ).status,
    401,
  );
  await login("新");
  await login("怡");
  assert.ok(cookies["新"].includes("session_token"), "Session cookie missing");
  const session = await request("/api/auth/get-session", "新");
  assert.equal(session.status, 200);
  assert.equal((await session.json()).user.id, "xin");
  const initial = await ok(await request("/api/state", "新"));
  assert.ok(initial.storageReady);
  checks.push("Both fixed accounts authenticate with database sessions");
  assert.equal(
    (await request("/api/data/wishes", "新", "POST", {}, "https://untrusted.invalid")).status,
    403,
  );
  const fields = {
    title: tag + "-memory",
    body: "中文与 emoji 💙",
    date: "2026-10-26",
    images: [],
  };
  assert.equal(
    (await request("/api/data/memories", "新", "POST", { ...fields, date: "2026-02-30" })).status,
    400,
  );
  assert.equal(
    (
      await request("/api/data/memories", "新", "POST", {
        ...fields,
        images: ["https://untrusted.invalid/photo"],
      })
    ).status,
    400,
  );
  let value = await ok(
    await request("/api/data/memories", "新", "POST", { ...fields, author: "怡" }),
  );
  const m = value.memories.find((m) => m.title === fields.title);
  assert.equal(m.author, "新");
  assert.equal(
    (await request("/api/data/memories/" + m.id, "怡", "PATCH", { ...fields, version: m.version }))
      .status,
    403,
  );
  assert.equal(
    (await request("/api/data/memories/" + m.id, "怡", "DELETE", { version: m.version })).status,
    403,
  );
  await ok(
    await request("/api/data/memories/" + m.id, "新", "PATCH", {
      ...fields,
      body: "更新后 💙",
      version: m.version,
    }),
  );
  assert.equal(
    (await request("/api/data/memories/" + m.id, "新", "PATCH", { ...fields, version: m.version }))
      .status,
    409,
  );
  value = await ok(await request("/api/state", "怡"));
  assert.equal(value.memories.find((x) => x.id === m.id).body, "更新后 💙");
  checks.push("Persistent shared CRUD; author enforced; stale edits and invalid inputs rejected");
  const settings = initial.settings;
  await ok(await request("/api/data/settings", "新", "PATCH", settings));
  assert.equal((await request("/api/data/settings", "怡", "PATCH", settings)).status, 409);
  checks.push("Settings use optimistic concurrency");
  const png = await sharp({ create: { width: 32, height: 24, channels: 3, background: "#dfefff" } })
    .png()
    .toBuffer();
  const form = new FormData();
  form.set("photo", new Blob([png], { type: "image/png" }), "qa.png");
  const photo = await ok(await request("/api/photos", "新", "POST", form), 201);
  photos.push(photo.image.slice(12));
  fs.writeFileSync("work/integration-run.json", JSON.stringify({ tag, photos }));
  assert.equal((await request(photo.image, "怡")).status, 404);
  assert.equal((await request(photo.image)).status, 401);
  let imageResponse = await request(photo.image, "新");
  assert.equal(imageResponse.status, 302);
  const signed = imageResponse.headers.get("location");
  assert.ok(signed.startsWith("https://"));
  assert.equal((await fetch(signed.split("?")[0])).status, 403, "COS must not be public");
  const fetched = await fetch(signed);
  assert.equal(fetched.status, 200);
  const metadata = await sharp(Buffer.from(await fetched.arrayBuffer())).metadata();
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.width, 32);
  assert.ok(!metadata.exif);
  value = await ok(
    await request("/api/data/memories", "新", "POST", {
      ...fields,
      title: tag + "-photo",
      images: [photo.image],
    }),
  );
  assert.equal((await request(photo.image, "怡")).status, 302);
  checks.push("Private COS upload, decode/reencode, signed download, attachment authorization");
  const badForm = new FormData();
  badForm.set("photo", new Blob(["not-an-image"], { type: "image/jpeg" }), "bad.jpg");
  assert.equal((await request("/api/photos", "新", "POST", badForm)).status, 400);
  const wishFields = { title: tag + "-wish", note: "共同完成", category: "小日常" };
  value = await ok(await request("/api/data/wishes", "新", "POST", wishFields));
  const wish = value.wishes.find((w) => w.title === wishFields.title);
  const [a, b] = await Promise.all([
    request("/api/data/wishes/" + wish.id + "/record", "新", "POST", {
      note: "完成了 💙",
      images: [],
    }),
    request("/api/data/wishes/" + wish.id + "/record", "怡", "POST", {
      note: "一起完成",
      images: [],
    }),
  ]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  value = await ok(await request("/api/state", "新"));
  assert.equal(value.memories.filter((m) => m.wishId === wish.id).length, 1);
  const doneWish = value.wishes.find((w) => w.id === wish.id),
    record = value.memories.find((m) => m.wishId === wish.id);
  assert.ok(doneWish.completedAt && doneWish.memoryId);
  await ok(
    await request("/api/data/wishes/" + wish.id, "怡", "DELETE", { version: doneWish.version }),
  );
  value = await ok(await request("/api/state", "新"));
  assert.ok(value.memories.find((m) => m.id === record.id));
  assert.ok(!value.memories.find((m) => m.id === record.id).wishId);
  checks.push("Concurrent wish-to-journal is idempotent; deleting wish retains journal");
  const importBody = {
    sourceHash: createHash("sha256").update(tag).digest("hex"),
    settings: { startDate: "", xinBirthday: "", yiBirthday: "", coverImage: "" },
    memories: [{ ...fields, id: tag, author: "怡", title: tag + "-import" }],
    wishes: [],
  };
  await ok(await request("/api/import", "新", "POST", importBody));
  await ok(await request("/api/import", "新", "POST", importBody));
  value = await ok(await request("/api/state", "怡"));
  assert.equal(value.memories.filter((m) => m.title === tag + "-import").length, 1);
  checks.push("Explicit legacy import is idempotent");
  await ok(await request("/api/auth/sign-out", "新", "POST", {}));
  assert.equal((await request("/api/state", "新")).status, 401);
  checks.push("Signout invalidates server session");
  success = true;
} catch (error) {
  console.error("Integration check failed: " + (error.code || error.message));
  process.exitCode = 1;
} finally {
  // Delete only this run's explicitly labelled development fixtures.
  const url = new URL(process.env.MIGRATION_DATABASE_URL);
  db = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: "xinanyi_dev",
  });
  const [rows] = await db.execute("SELECT id FROM memory WHERE title LIKE ?", [tag + "%"]);
  for (const row of rows) await db.execute("DELETE FROM memory WHERE id = ?", [row.id]);
  await db.execute("DELETE FROM wish WHERE title LIKE ?", [tag + "%"]);
  await db.execute("DELETE FROM import_batch WHERE hash = ?", [
    createHash("sha256").update(tag).digest("hex"),
  ]);
  const cos = new COS({
    SecretId: process.env.COS_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY,
  });
  for (const id of photos) {
    const [rows] = await db.execute("SELECT objectKey, bucket, region FROM photo WHERE id = ?", [
      id,
    ]);
    if (rows.length) {
      const p = rows[0];
      assert.ok(p.objectKey.startsWith("xinanyi/development/photos/"));
      await cos.deleteObject({ Bucket: p.bucket, Region: p.region, Key: p.objectKey });
      await db.execute("DELETE FROM photo WHERE id = ?", [id]);
    }
  }
  for (const person of Object.keys(cookies))
    await request("/api/auth/sign-out", person, "POST", {}).catch(() => {});
  await db.end();
}

if (success && !process.exitCode) {
  console.log(JSON.stringify({ status: "passed", cleanup: "passed", checks }, null, 2));
  fs.writeFileSync(
    "work/integration-result.json",
    JSON.stringify(
      { date: new Date().toISOString(), status: "passed", cleanup: "passed", checks },
      null,
      2,
    ),
  );
}
