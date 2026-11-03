import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import path from "node:path";
import mysql from "mysql2/promise";
process.loadEnvFile(path.resolve(".env.local"));
const forbidden = new Set([1044, 1045, 1142]);
function options(value, database) {
  const uri = new URL(value);
  assert.equal(uri.protocol, "mysql:");
  assert.equal(uri.hostname, "127.0.0.1");
  assert.equal(uri.port, "13306");
  assert.equal(uri.pathname, "/" + database);
  return {
    host: uri.hostname,
    port: Number(uri.port),
    user: decodeURIComponent(uri.username),
    password: decodeURIComponent(uri.password),
    database,
    charset: "utf8mb4",
    connectTimeout: 12000,
  };
}
let app, migrator;
const table = "__xinanyi_check_" + randomBytes(6).toString("hex");
let created = false;
let unexpectedDdl = false;
async function denied(sql, connection = app) {
  try {
    await connection.query(sql);
  } catch (error) {
    assert.ok(forbidden.has(error.errno), "Unexpected permission error code: " + error.errno);
    return;
  }
  throw new Error("A database operation unexpectedly exceeded the application's privileges.");
}
try {
  assert.equal(process.env.DATABASE_ENV, "development");
  app = await mysql.createConnection(options(process.env.DATABASE_URL, "xinanyi_dev"));
  migrator = await mysql.createConnection(
    options(process.env.MIGRATION_DATABASE_URL, "xinanyi_dev"),
  );
  const [info] = await app.query(
    "SELECT DATABASE() AS db, CURRENT_USER() AS account, VERSION() AS version, @@character_set_connection AS charset",
  );
  assert.equal(info[0].db, "xinanyi_dev");
  assert.equal(info[0].account, "xinanyi_dev_app@%");
  assert.equal(info[0].charset, "utf8mb4");
  await migrator.query(
    "CREATE TABLE " +
      table +
      " (id INT PRIMARY KEY, value VARCHAR(100) NOT NULL) CHARACTER SET utf8mb4",
  );
  created = true;
  await app.execute("INSERT INTO " + table + " (id, value) VALUES (?, ?)", [1, "新&怡 🌸"]);
  let [rows] = await app.execute("SELECT value FROM " + table + " WHERE id = ?", [1]);
  assert.equal(rows[0].value, "新&怡 🌸");
  await app.execute("UPDATE " + table + " SET value = ? WHERE id = ?", ["一起记录 💗", 1]);
  [rows] = await app.execute("SELECT value FROM " + table + " WHERE id = ?", [1]);
  assert.equal(rows[0].value, "一起记录 💗");
  await app.execute("DELETE FROM " + table + " WHERE id = ?", [1]);
  [rows] = await app.query("SELECT COUNT(*) AS total FROM " + table);
  assert.equal(rows[0].total, 0);
  await denied("USE xinanyi_prod");
  await denied("USE xinanyi_prod", migrator);
  try {
    await app.query("CREATE TABLE " + table + "_forbidden (id INT)");
    unexpectedDdl = true;
  } catch (error) {
    assert.ok(forbidden.has(error.errno), "Unexpected DDL permission error code.");
  }
  assert.equal(unexpectedDdl, false, "Application account must not have CREATE TABLE permission.");
  console.log(
    JSON.stringify(
      {
        status: "passed",
        ...info[0],
        checks: [
          "SSH tunnel",
          "utf8mb4 and emoji",
          "CRUD",
          "development/production isolation",
          "DDL denied for application account",
        ],
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error("Database verification failed: " + (error.code || error.message));
  process.exitCode = 1;
} finally {
  if (created && migrator) await migrator.query("DROP TABLE IF EXISTS xinanyi_dev." + table);
  if (unexpectedDdl && migrator)
    await migrator.query("DROP TABLE IF EXISTS xinanyi_dev." + table + "_forbidden");
  if (app) await app.end();
  if (migrator) await migrator.end();
}
