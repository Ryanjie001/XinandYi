import assert from "node:assert/strict";
import fs from "node:fs";

process.loadEnvFile(".env.local");
const database = new URL(process.env.DATABASE_URL || "");
assert.equal(process.env.DATABASE_ENV, "development");
assert.equal(database.hostname, "127.0.0.1");
assert.equal(database.port, "13306");
assert.equal(database.pathname, "/xinanyi_dev");
const base = "http://127.0.0.1:3000";
const accounts = JSON.parse(fs.readFileSync("work/private/initial-accounts.json", "utf8"));
let cookie;
for (const person of ["怡", "新"]) {
  const response = await fetch(base + "/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify(accounts[person]),
  });
  if (response.ok) {
    cookie = response.headers.getSetCookie().map((item) => item.split(";")[0]).join("; ");
    break;
  }
}
if (!cookie) throw Error("Neither initial development account could sign in.");
const request = (path, method = "GET", data) => fetch(base + path, {
  method,
  headers: { cookie, origin: base, ...(data ? { "content-type": "application/json" } : {}) },
  ...(data ? { body: JSON.stringify(data) } : {}),
});
let original, savedVersion;
try {
  const state = await request("/api/state");
  assert.equal(state.status, 200);
  original = (await state.json()).settings;
  const invalid = await request("/api/data/settings", "PATCH", { ...original, xinLunarBirthday: "13-01" });
  assert.equal(invalid.status, 400);
  const data = {
    ...original,
    xinBirthday: "2000-03-15",
    yiBirthday: "2001-05-20",
    xinLunarBirthday: "02-01",
    yiLunarBirthday: "03-30",
    xinLunarLeap: true,
    yiLunarLeap: false,
    xinBirthdayCalendar: "lunar",
    yiBirthdayCalendar: "solar",
  };
  const update = await request("/api/data/settings", "PATCH", data);
  assert.equal(update.status, 200);
  const updated = (await update.json()).settings;
  savedVersion = updated.version;
  for (const key of ["xinBirthday", "yiBirthday", "xinLunarBirthday", "yiLunarBirthday", "xinLunarLeap", "yiLunarLeap", "xinBirthdayCalendar", "yiBirthdayCalendar"]) {
    assert.equal(updated[key], data[key], key);
  }
  const reload = await request("/api/state");
  assert.equal(reload.status, 200);
  const reloaded = (await reload.json()).settings;
  assert.equal(reloaded.xinLunarBirthday, "02-01");
  assert.equal(reloaded.xinBirthdayCalendar, "lunar");
  console.log("Birthday settings saved, reloaded and validation checked.");
} finally {
  if (savedVersion !== undefined) {
    const restore = await request("/api/data/settings", "PATCH", { ...original, version: savedVersion });
    if (!restore.ok) throw Error("Could not restore development settings; check for a concurrent change.");
    console.log("Original development settings restored.");
  }
  await request("/api/auth/sign-out", "POST", {});
}
