import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import mysql from "mysql2/promise";
import COS from "cos-nodejs-sdk-v5";
import sharp from "sharp";

process.loadEnvFile(".env.local");
const url = new URL(process.env.MIGRATION_DATABASE_URL || "");
assert.equal(process.env.DATABASE_ENV, "development");
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.port, "13306");
assert.equal(url.pathname, "/xinanyi_dev");
assert.equal(process.env.COS_PREFIX, "xinanyi/development");
const base = "http://127.0.0.1:3000",
  tag = "QA-future-" + randomBytes(6).toString("hex"),
  secret = tag + "-secret";
const accounts = JSON.parse(fs.readFileSync("work/private/initial-accounts.json", "utf8"));
const cookies = {},
  photos = [];
const db = await mysql.createConnection({
  host: url.hostname,
  port: Number(url.port),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: "xinanyi_dev",
});
let anniversaryId, letterId;
const date = (offset) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + offset * 86400000));
async function request(path, person, method = "GET", data) {
  const headers = {};
  if (person) headers.Cookie = cookies[person];
  if (method !== "GET") headers.Origin = base;
  if (data && !(data instanceof FormData)) headers["Content-Type"] = "application/json";
  return fetch(base + path, {
    method,
    headers,
    body: data ? (data instanceof FormData ? data : JSON.stringify(data)) : undefined,
    redirect: "manual",
  });
}
async function json(response, status = 200) {
  assert.equal(response.status, status, `Unexpected status for ${response.url}`);
  return response.json();
}
try {
  assert.equal((await request("/api/state")).status, 401);
  for (const person of ["新", "怡"]) {
    const response = await request("/api/auth/sign-in/email", null, "POST", accounts[person]);
    assert.equal(response.status, 200, `${person} development login failed`);
    cookies[person] = response.headers
      .getSetCookie()
      .map((item) => item.split(";")[0])
      .join("; ");
  }
  let state = await json(
    await request("/api/data/anniversaries", "新", "POST", {
      name: tag,
      date: "2020-02-29",
      yearly: true,
    }),
  );
  let anniversary = state.anniversaries.find((item) => item.name === tag);
  assert.ok(anniversary);
  anniversaryId = anniversary.id;
  state = await json(
    await request(`/api/data/anniversaries/${anniversaryId}`, "怡", "PATCH", {
      name: tag,
      date: "2020-02-29",
      yearly: false,
      version: anniversary.version,
    }),
  );
  assert.equal(state.anniversaries.find((item) => item.id === anniversaryId).yearly, false);
  assert.equal(
    (
      await request(`/api/data/anniversaries/${anniversaryId}`, "新", "PATCH", {
        name: tag,
        date: "2020-02-29",
        yearly: true,
        version: anniversary.version,
      })
    ).status,
    409,
  );
  anniversary = state.anniversaries.find((item) => item.id === anniversaryId);
  await json(
    await request(`/api/data/anniversaries/${anniversaryId}`, "新", "DELETE", {
      version: anniversary.version,
    }),
  );
  console.log("Solar anniversaries, sharing and version conflicts passed.");
  const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#dfefff" } })
    .png()
    .toBuffer();
  const form = new FormData();
  form.set("photo", new Blob([png], { type: "image/png" }), "test.png");
  const uploaded = await json(await request("/api/photos", "新", "POST", form), 201);
  const image = uploaded.image,
    photoId = image.split("/").pop();
  photos.push(photoId);
  const input = { title: tag, body: secret, unlockDate: date(1), images: [image] };
  assert.equal(
    (await request("/api/data/letters", "新", "POST", { ...input, unlockDate: date(0) })).status,
    400,
  );
  state = await json(await request("/api/data/letters", "新", "POST", input));
  letterId = state.letters.find((item) => item.title === tag)?.id;
  assert.ok(letterId);
  assert.equal((await request("/api/data/letters", "新", "POST", input)).status, 400);
  state = await json(await request("/api/state", "怡"));
  const locked = state.letters.find((item) => item.id === letterId);
  assert.ok(locked?.locked);
  assert.equal(locked.title, null);
  assert.ok(!JSON.stringify(state).includes(secret));
  assert.ok(!JSON.stringify(state).includes(photoId));
  assert.equal((await request(`/api/letters/${letterId}`, "怡")).status, 403);
  assert.equal((await request(`/api/letters/${letterId}/photos/${photoId}`, "怡")).status, 403);
  assert.equal((await request(image, "怡")).status, 404);
  assert.equal(
    (
      await request("/api/data/memories", "怡", "POST", {
        title: tag,
        body: "",
        date: date(-1),
        images: [image],
      })
    ).status,
    400,
  );
  assert.equal((await request(`/api/data/letters/${letterId}`, "怡", "DELETE", {})).status, 403);
  const authorView = await json(await request(`/api/letters/${letterId}`, "新"));
  assert.equal(authorView.body, secret);
  assert.equal((await request(`/api/letters/${letterId}/photos/${photoId}`, "新")).status, 302);
  await db.execute("UPDATE future_letter SET unlockDate=? WHERE id=? AND title=?", [
    date(-1),
    letterId,
    tag,
  ]);
  const recipientView = await json(await request(`/api/letters/${letterId}`, "怡"));
  assert.equal(recipientView.body, secret);
  assert.equal((await request(`/api/letters/${letterId}/photos/${photoId}`, "怡")).status, 302);
  state = await json(await request("/api/state", "怡"));
  assert.equal(state.letters.find((item) => item.id === letterId).locked, false);
  await json(await request(`/api/data/letters/${letterId}`, "新", "DELETE", {}));
  console.log(
    "Letter contents and photos are protected before opening and available after opening.",
  );
} finally {
  if (anniversaryId)
    await db.execute("DELETE FROM anniversary WHERE id=? AND name=?", [anniversaryId, tag]);
  if (letterId)
    await db.execute("DELETE FROM future_letter WHERE id=? AND title=?", [letterId, tag]);
  const cos = new COS({
    SecretId: process.env.COS_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY,
  });
  for (const id of photos) {
    const [rows] = await db.execute("SELECT objectKey, bucket, region FROM photo WHERE id=?", [id]);
    if (rows.length) {
      const photo = rows[0];
      assert.ok(photo.objectKey.startsWith("xinanyi/development/photos/"));
      await cos.deleteObject({ Bucket: photo.bucket, Region: photo.region, Key: photo.objectKey });
      await db.execute("DELETE FROM photo WHERE id=?", [id]);
    }
  }
  for (const person of Object.keys(cookies))
    await request("/api/auth/sign-out", person, "POST", {}).catch(() => {});
  await db.end();
  console.log("Test-only development data cleaned up.");
}
