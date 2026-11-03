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
  tag = "QA-feature-" + randomBytes(6).toString("hex");
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
let memoryId, albumId, moodId;
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
  assert.equal((await request("/api/drafts/new")).status, 401);
  for (const person of ["新", "怡"]) {
    const response = await request("/api/auth/sign-in/email", null, "POST", accounts[person]);
    assert.equal(response.status, 200, `${person} development login failed`);
    cookies[person] = response.headers
      .getSetCookie()
      .map((item) => item.split(";")[0])
      .join("; ");
  }
  const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#dfefff" } })
    .png()
    .toBuffer();
  const form = new FormData();
  form.set("photo", new Blob([png], { type: "image/png" }), "test.png");
  const uploaded = await json(await request("/api/photos", "新", "POST", form), 201);
  const image = uploaded.image;
  photos.push(image.split("/").pop());
  let result = await json(
    await request("/api/data/memories", "新", "POST", {
      title: tag,
      body: "test",
      date: "2020-01-01",
      images: [image],
    }),
  );
  let memory = result.memories.find((item) => item.title === tag);
  assert.ok(memory);
  memoryId = memory.id;
  result = await json(
    await request(`/api/data/memories/${memoryId}/comments`, "怡", "POST", { body: tag }),
  );
  const comment = result.memories
    .find((item) => item.id === memoryId)
    .comments.find((item) => item.body === tag);
  assert.ok(comment);
  assert.equal(
    (await request(`/api/data/memories/${memoryId}/comments/${comment.id}`, "新", "DELETE", {}))
      .status,
    403,
  );
  result = await json(await request("/api/state", "新"));
  assert.equal(result.memories.find((item) => item.id === memoryId).unreadComments, 1);
  result = await json(await request(`/api/data/memories/${memoryId}/read`, "新", "POST", {}));
  assert.equal(result.memories.find((item) => item.id === memoryId).unreadComments, 0);
  for (let i = 0; i < 2; i++)
    result = await json(
      await request(`/api/data/memories/${memoryId}/reaction`, "怡", "PUT", { liked: true }),
    );
  assert.deepEqual(result.memories.find((item) => item.id === memoryId).likes, ["怡"]);
  result = await json(
    await request(`/api/data/memories/${memoryId}/reaction`, "怡", "PUT", { liked: false }),
  );
  assert.equal(result.memories.find((item) => item.id === memoryId).likes.length, 0);
  console.log("Comments, unread status, permissions and likes passed.");
  result = await json(await request("/api/data/albums", "新", "POST", { name: tag }));
  albumId = result.albums.find((item) => item.name === tag)?.id;
  assert.ok(albumId);
  result = await json(await request(`/api/data/albums/${albumId}/images`, "新", "PUT", { image }));
  assert.ok(result.albums.find((item) => item.id === albumId).images.includes(image));
  const draft = { title: tag + "-draft", body: "unfinished", date: "2020-01-01", images: [image] };
  await json(await request(`/api/drafts/${memoryId}`, "新", "PUT", draft));
  assert.equal((await json(await request(`/api/drafts/${memoryId}`, "新"))).title, draft.title);
  assert.equal(await json(await request(`/api/drafts/${memoryId}`, "怡")), null);
  assert.equal((await request(`/api/drafts/${memoryId}`, "怡", "PUT", draft)).status, 403);
  const [pins] = await db.execute(
    "SELECT COUNT(*) AS n FROM draft_photo dp JOIN memory_draft d ON dp.draftId=d.id WHERE d.draftKey=? AND dp.photoId=?",
    [memoryId, photos[0]],
  );
  assert.equal(pins[0].n, 1);
  memory = (await json(await request("/api/state", "新"))).memories.find(
    (item) => item.id === memoryId,
  );
  result = await json(
    await request(`/api/data/memories/${memoryId}`, "新", "PATCH", {
      ...draft,
      version: memory.version,
      draftKey: memoryId,
    }),
  );
  assert.equal(await json(await request(`/api/drafts/${memoryId}`, "新")), null);
  memory = result.memories.find((item) => item.id === memoryId);
  await json(await request(`/api/drafts/${memoryId}`, "新", "PUT", draft));
  await json(
    await request(`/api/data/memories/${memoryId}`, "新", "DELETE", { version: memory.version }),
  );
  assert.equal(await json(await request(`/api/drafts/${memoryId}`, "新")), null);
  assert.equal((await request(image, "怡")).status, 302);
  result = await json(
    await request(`/api/data/albums/${albumId}/images`, "怡", "DELETE", { image }),
  );
  assert.ok(!result.albums.find((item) => item.id === albumId).images.includes(image));
  console.log("Album retention, draft privacy, photo pinning and publish cleanup passed.");
  let moodDate;
  for (let day = 0; day < 60; day++) {
    const candidate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(Date.now() - day * 86400000));
    const [rows] = await db.execute(
      "SELECT COUNT(*) AS n FROM mood_entry WHERE authorId=? AND date=?",
      ["xin", candidate],
    );
    if (!rows[0].n) {
      moodDate = candidate;
      break;
    }
  }
  assert.ok(moodDate, "No safe date available for test mood");
  result = await json(
    await request("/api/data/moods", "新", "PUT", { date: moodDate, mood: "开心", note: tag }),
  );
  let mood = result.moods.find((item) => item.note === tag);
  assert.ok(mood);
  moodId = mood.id;
  assert.equal((await request(`/api/data/moods/${moodId}`, "怡", "DELETE", {})).status, 403);
  result = await json(
    await request("/api/data/moods", "新", "PUT", {
      date: moodDate,
      mood: "平静",
      note: tag,
      version: mood.version,
    }),
  );
  assert.equal(result.moods.find((item) => item.id === moodId).mood, "平静");
  assert.equal(
    (
      await request("/api/data/moods", "新", "PUT", {
        date: moodDate,
        mood: "开心",
        note: tag,
        version: mood.version,
      })
    ).status,
    409,
  );
  await json(await request(`/api/data/moods/${moodId}`, "新", "DELETE", {}));
  console.log("Daily mood save, update, conflict and ownership passed.");
} finally {
  if (memoryId)
    await db.execute("DELETE FROM memory_draft WHERE draftKey=? AND authorId=?", [memoryId, "xin"]);
  await db.execute("DELETE FROM album WHERE name=?", [tag]);
  await db.execute("DELETE FROM memory WHERE title LIKE ?", [tag + "%"]);
  if (moodId) await db.execute("DELETE FROM mood_entry WHERE id=? AND note=?", [moodId, tag]);
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
