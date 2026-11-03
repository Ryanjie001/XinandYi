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
  tag = "QA-photo-delete-" + randomBytes(6).toString("hex");
const accounts = JSON.parse(fs.readFileSync("work/private/initial-accounts.json", "utf8")),
  cookies = {};
let albumId,
  memoryId,
  photoId,
  previousCover,
  expectedCoverVersion,
  draft = false;
async function req(path, person, method = "GET", payload) {
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
async function json(r, status = 200) {
  assert.equal(r.status, status, `Unexpected status from ${new URL(r.url).pathname}`);
  return r.json();
}
async function preview(image, person = "新") {
  return json(await req("/api/photo-deletion?image=" + encodeURIComponent(image), person));
}
try {
  for (const person of ["新", "怡"]) {
    const r = await req("/api/auth/sign-in/email", null, "POST", accounts[person]);
    assert.equal(r.status, 200);
    cookies[person] = r.headers
      .getSetCookie()
      .map((x) => x.split(";")[0])
      .join("; ");
  }
  assert.equal(
    (
      await req(
        "/api/photo-deletion?image=" +
          encodeURIComponent("/api/photos/00000000-0000-0000-0000-000000000000"),
      )
    ).status,
    401,
  );
  const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#dfefff" } })
    .png()
    .toBuffer();
  const form = new FormData();
  form.set("photo", new Blob([png], { type: "image/png" }), "test.png");
  const image = (await json(await req("/api/photos", "新", "POST", form), 201)).image;
  photoId = image.slice(12);
  let state = await json(await req("/api/data/albums", "新", "POST", { name: tag }));
  albumId = state.albums.find((a) => a.name === tag).id;
  state = await json(await req("/api/data/gallery", "新", "POST", { image, albumId }));
  state = await json(
    await req("/api/data/memories", "新", "POST", {
      title: tag,
      body: "test",
      date: "2020-01-01",
      images: [image],
    }),
  );
  memoryId = state.memories.find((m) => m.title === tag).id;
  previousCover = state.settings.coverImage;
  state = await json(
    await req("/api/data/settings", "新", "PATCH", { ...state.settings, coverImage: image }),
  );
  expectedCoverVersion = state.settings.version;
  let info = await preview(image, "怡");
  assert.ok(info.cover);
  assert.ok(info.memories.some((m) => m.id === memoryId));
  assert.ok(info.albums.some((a) => a.id === albumId));
  await json(
    await req(`/api/drafts/${memoryId}`, "新", "PUT", {
      title: tag,
      body: "draft",
      date: "2020-01-01",
      images: [image],
    }),
  );
  draft = true;
  assert.equal(
    (await req("/api/data/photos/delete", "新", "POST", { image, fingerprint: info.fingerprint }))
      .status,
    409,
  );
  info = await preview(image);
  assert.equal(info.draftCount, 1);
  assert.equal(
    (await req("/api/data/photos/delete", "新", "POST", { image, fingerprint: info.fingerprint }))
      .status,
    409,
  );
  await json(await req(`/api/drafts/${memoryId}`, "新", "DELETE", {}));
  draft = false;
  info = await preview(image);
  assert.equal(info.draftCount, 0);
  state = await json(
    await req("/api/data/photos/delete", "怡", "POST", { image, fingerprint: info.fingerprint }),
  );
  assert.equal(state.settings.coverImage, "");
  assert.equal(state.settings.version, expectedCoverVersion + 1);
  expectedCoverVersion = state.settings.version;
  assert.deepEqual(state.memories.find((m) => m.id === memoryId).images, []);
  assert.equal(state.memories.find((m) => m.id === memoryId).body, "test");
  assert.ok(!state.gallery.some((p) => p.image === image));
  assert.ok(!state.albums.find((a) => a.id === albumId).images.includes(image));
  assert.equal((await req(image, "新")).status, 404);
  const [rows] = await db.execute("SELECT id FROM photo WHERE id=?", [photoId]);
  assert.equal(rows.length, 0);
  console.log(
    "PASS: impact preview, stale confirmation, draft protection, cross-account deletion, memory/cover/album cleanup and stored photo removal",
  );
} finally {
  if (cookies["新"]) {
    if (draft && memoryId) await req(`/api/drafts/${memoryId}`, "新", "DELETE", {}).catch(() => {});
    const r = await req("/api/state", "新").catch(() => null);
    if (r?.ok) {
      const state = await r.json();
      if (
        previousCover !== undefined &&
        state.settings.version === expectedCoverVersion &&
        (state.settings.coverImage === "" || state.settings.coverImage === `/api/photos/${photoId}`)
      ) {
        const restored = await req("/api/data/settings", "新", "PATCH", {
          ...state.settings,
          coverImage: previousCover,
        });
        if (!restored.ok) console.error("Test cover restore failed; manual review required.");
      } else if (previousCover !== undefined)
        console.error("Test cover changed concurrently; no automatic restore performed.");
      const m = state.memories.find((x) => x.id === memoryId && x.title === tag);
      if (m)
        await req("/api/data/memories/" + memoryId, "新", "DELETE", { version: m.version }).catch(
          () => {},
        );
      if (albumId && state.albums.some((a) => a.id === albumId && a.name === tag))
        await req("/api/data/albums/" + albumId, "新", "DELETE", {}).catch(() => {});
    }
  }
  if (photoId) {
    const [rows] = await db.execute("SELECT bucket,region,objectKey FROM photo WHERE id=?", [
      photoId,
    ]);
    if (rows.length) {
      const p = rows[0];
      assert.equal(p.objectKey, `${process.env.COS_PREFIX}/photos/${photoId}.jpg`);
      await db.execute("DELETE FROM gallery_photo WHERE photoId=?", [photoId]);
      await db.execute("DELETE FROM photo WHERE id=?", [photoId]);
      await cos.deleteObject({ Bucket: p.bucket, Region: p.region, Key: p.objectKey });
    }
  }
  await db.end();
}
