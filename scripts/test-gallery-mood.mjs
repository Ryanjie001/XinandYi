import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import mysql from "mysql2/promise";
import COS from "cos-nodejs-sdk-v5";
import sharp from "sharp";
process.loadEnvFile(".env.local");
const uri = new URL(process.env.MIGRATION_DATABASE_URL || "");
assert.equal(process.env.DATABASE_ENV, "development");
assert.equal(uri.hostname, "127.0.0.1");
assert.equal(uri.port, "13306");
assert.equal(uri.pathname, "/xinanyi_dev");
assert.equal(process.env.COS_PREFIX, "xinanyi/development");
const db = await mysql.createConnection({
  host: uri.hostname,
  port: +uri.port,
  user: decodeURIComponent(uri.username),
  password: decodeURIComponent(uri.password),
  database: "xinanyi_dev",
});
const cos = new COS({ SecretId: process.env.COS_SECRET_ID, SecretKey: process.env.COS_SECRET_KEY });
const base = "http://127.0.0.1:3000",
  tag = "QA-gallery-mood-" + randomBytes(6).toString("hex");
const accounts = JSON.parse(fs.readFileSync("work/private/initial-accounts.json", "utf8"));
const cookies = {},
  photoIds = [];
let albumId, moodId, letterId;
async function request(path, person, method = "GET", payload) {
  const headers = {};
  if (person) headers.Cookie = cookies[person];
  if (method !== "GET") headers.Origin = base;
  if (payload && !(payload instanceof FormData)) headers["Content-Type"] = "application/json";
  return fetch(base + path, {
    method,
    headers,
    body: payload ? (payload instanceof FormData ? payload : JSON.stringify(payload)) : undefined,
    redirect: "manual",
  });
}
async function result(response, status = 200) {
  assert.equal(response.status, status, `Unexpected status from ${new URL(response.url).pathname}`);
  return response.json();
}
async function upload(person) {
  const image = await sharp({
    create: { width: 20, height: 20, channels: 3, background: "#eef5ff" },
  })
    .png()
    .toBuffer();
  const form = new FormData();
  form.set("photo", new Blob([image], { type: "image/png" }), "test.png");
  const value = await result(await request("/api/photos", person, "POST", form), 201);
  photoIds.push(value.image.slice(12));
  return value.image;
}
try {
  for (const person of ["新", "怡"]) {
    const response = await request("/api/auth/sign-in/email", null, "POST", accounts[person]);
    assert.equal(response.status, 200, "Development login failed");
    cookies[person] = response.headers
      .getSetCookie()
      .map((x) => x.split(";")[0])
      .join("; ");
  }
  let state = await result(await request("/api/state", "新"));
  let date = "1900-01-01";
  while (state.moods.some((m) => m.author === "新" && m.date === date))
    date = new Date(Date.parse(date) + 86400000).toISOString().slice(0, 10);
  state = await result(
    await request("/api/data/moods", "新", "PUT", { date, mood: "开心", note: tag }),
  );
  moodId = state.moods.find((m) => m.note === tag).id;
  state = await result(
    await request(`/api/data/moods/${moodId}/comments`, "怡", "POST", { body: tag }),
  );
  const comment = state.moods.find((m) => m.id === moodId).comments.find((c) => c.body === tag);
  assert.equal(comment.author, "怡");
  assert.equal(
    (await request(`/api/data/moods/${moodId}/comments/${comment.id}`, "新", "DELETE", {})).status,
    403,
  );
  state = await result(
    await request(`/api/data/moods/${moodId}/comments/${comment.id}`, "怡", "DELETE", {}),
  );
  assert.equal(state.moods.find((m) => m.id === moodId).comments.length, 0);
  state = await result(await request("/api/data/albums", "新", "POST", { name: tag }));
  albumId = state.albums.find((a) => a.name === tag).id;
  const standalone = await upload("新");
  state = await result(await request("/api/data/gallery", "新", "POST", { image: standalone }));
  assert.ok(state.gallery.some((p) => p.image === standalone));
  assert.equal((await request(standalone, "怡")).status, 302);
  assert.equal(
    (
      await request("/api/data/letters", "新", "POST", {
        title: tag,
        body: tag,
        unlockDate: "2099-01-01",
        images: [standalone],
      })
    ).status,
    400,
  );
  const categorized = await upload("怡");
  state = await result(
    await request("/api/data/gallery", "怡", "POST", { image: categorized, albumId }),
  );
  assert.ok(state.gallery.some((p) => p.image === categorized));
  assert.ok(state.albums.find((a) => a.id === albumId).images.includes(categorized));
  state = await result(await request(`/api/data/albums/${albumId}`, "新", "DELETE", {}));
  albumId = undefined;
  assert.ok(state.gallery.some((p) => p.image === categorized));
  assert.equal((await request(categorized, "新")).status, 302);
  const locked = await upload("新");
  state = await result(
    await request("/api/data/letters", "新", "POST", {
      title: tag,
      body: tag,
      unlockDate: "2099-01-01",
      images: [locked],
    }),
  );
  letterId = state.letters.find((x) => x.title === tag).id;
  assert.equal((await request("/api/data/gallery", "新", "POST", { image: locked })).status, 400);
  assert.equal((await request(locked, "怡")).status, 404);
  await result(await request(`/api/data/letters/${letterId}`, "新", "DELETE", {}));
  letterId = undefined;
  await result(await request(`/api/data/moods/${moodId}`, "新", "DELETE", {}));
  moodId = undefined;
  console.log(
    "PASS: mood comments, ownership, independent uploads, shared access, album removal, gallery and letter isolation",
  );
} finally {
  if (letterId) await request(`/api/data/letters/${letterId}`, "新", "DELETE", {}).catch(() => {});
  if (moodId) await request(`/api/data/moods/${moodId}`, "新", "DELETE", {}).catch(() => {});
  if (albumId) await request(`/api/data/albums/${albumId}`, "新", "DELETE", {}).catch(() => {});
  for (const id of photoIds) {
    const [rows] = await db.execute("SELECT bucket,region,objectKey FROM photo WHERE id=?", [id]);
    if (!rows.length) continue;
    const p = rows[0];
    assert.equal(p.bucket, process.env.COS_BUCKET);
    assert.equal(p.region, process.env.COS_REGION);
    assert.equal(p.objectKey, `${process.env.COS_PREFIX}/photos/${id}.jpg`);
    await db.execute("DELETE FROM gallery_photo WHERE photoId=?", [id]);
    await db.execute("DELETE FROM photo WHERE id=?", [id]);
    await cos.deleteObject({ Bucket: p.bucket, Region: p.region, Key: p.objectKey });
  }
  await db.end();
}
