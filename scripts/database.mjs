import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const directory = path.join(root, "work", "ssh");
const config = path.join(directory, "config");
const statePath = path.join(directory, "database-tunnel.json");
const isWindows = process.platform === "win32";
const ssh = isWindows
  ? path.join(process.env.SystemRoot || "C:\\Windows", "System32", "OpenSSH", "ssh.exe")
  : "ssh";
const scp = isWindows
  ? path.join(process.env.SystemRoot || "C:\\Windows", "System32", "OpenSSH", "scp.exe")
  : "scp";
function run(program, args, inherit = false) {
  const result = spawnSync(program, args, {
    encoding: "utf8",
    windowsHide: true,
    stdio: inherit ? "inherit" : "pipe",
  });
  if (result.status !== 0 || result.error)
    throw new Error(path.basename(program) + " failed; check the project's SSH connection.");
  return result.stdout || "";
}
function secureFile(file, directoryMode = false) {
  if (!isWindows) {
    fs.chmodSync(file, directoryMode ? 0o700 : 0o600);
    return;
  }
  const user = run("whoami.exe", []).trim();
  const rights = directoryMode ? ":(OI)(CI)(F)" : ":(F)";
  run("icacls.exe", [
    file,
    "/inheritance:r",
    "/grant:r",
    user + rights,
    "*S-1-5-18" + rights,
    "*S-1-5-32-544" + rights,
  ]);
}
function processIdentity(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return null;
  if (isWindows) {
    const command =
      "$p=Get-Process -Id " +
      pid +
      " -ErrorAction SilentlyContinue; if($p){[pscustomobject]@{path=$p.Path;started=$p.StartTime.ToUniversalTime().Ticks.ToString()}|ConvertTo-Json -Compress}";
    const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (result.status !== 0 || !result.stdout.trim()) return null;
    try {
      return JSON.parse(result.stdout);
    } catch {
      return null;
    }
  }
  try {
    return {
      path: fs.readlinkSync("/proc/" + pid + "/exe"),
      started: fs.readFileSync("/proc/" + pid + "/stat", "utf8").split(" ")[21],
    };
  } catch {
    return null;
  }
}
function ownedTunnel() {
  if (!fs.existsSync(statePath)) return null;
  try {
    const saved = JSON.parse(fs.readFileSync(statePath, "utf8"));
    const actual = processIdentity(saved.pid);
    if (
      actual &&
      actual.path.toLowerCase() === saved.executable.toLowerCase() &&
      actual.started === saved.started
    )
      return saved;
  } catch {}
  return null;
}
function portOpen() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port: 13306 });
    let done = false;
    const finish = (value) => {
      if (!done) {
        done = true;
        socket.destroy();
        resolve(value);
      }
    };
    socket.setTimeout(350, () => finish(false));
    socket.on("error", () => finish(false));
    socket.on("connect", () => finish(true));
  });
}
async function startTunnel(foreground = false) {
  const existing = ownedTunnel();
  if (existing && (await portOpen())) {
    console.log("Xinanyi database tunnel is already available at 127.0.0.1:13306.");
    return;
  }
  if (await portOpen())
    throw new Error("Port 13306 belongs to another process; it was left unchanged.");
  if (!fs.existsSync(config))
    throw new Error("Project SSH configuration is missing in work/ssh/config.");
  const out = fs.openSync(path.join(directory, "database-tunnel.stdout.log"), "a");
  const err = fs.openSync(path.join(directory, "database-tunnel.stderr.log"), "a");
  const child = spawn(
    ssh,
    [
      "-F",
      config,
      "-N",
      "-L",
      "127.0.0.1:13306:127.0.0.1:3306",
      "-o",
      "ExitOnForwardFailure=yes",
      "xinanyi",
    ],
    { detached: !foreground, windowsHide: true, stdio: ["ignore", out, err] },
  );
  fs.closeSync(out);
  fs.closeSync(err);
  let failed = false;
  child.on("error", () => {
    failed = true;
  });
  for (let i = 0; i < 50; i++) {
    if (failed || child.exitCode !== null)
      throw new Error("SSH tunnel failed. See work/ssh/database-tunnel.stderr.log.");
    if (await portOpen()) {
      const identity = processIdentity(child.pid);
      if (!identity) {
        child.kill();
        throw new Error("Cannot identify the managed SSH process.");
      }
      fs.writeFileSync(
        statePath,
        JSON.stringify(
          {
            pid: child.pid,
            executable: identity.path,
            started: identity.started,
            localPort: 13306,
            host: "203.0.113.1",
          },
          null,
          2,
        ) + "\n",
      );
      if (!foreground) child.unref();
      else {
        process.on("SIGINT", () => child.kill());
        child.on("exit", (code) => {
          process.exitCode = code || 0;
        });
      }
      console.log("Xinanyi database tunnel is available at 127.0.0.1:13306.");
      return;
    }
    await delay(200);
  }
  child.kill();
  throw new Error("SSH tunnel did not become ready.");
}
function stopTunnel() {
  const existing = ownedTunnel();
  if (existing) {
    process.kill(existing.pid);
    console.log("Xinanyi database tunnel stopped.");
  } else console.log("No managed Xinanyi database tunnel is running.");
}
function syncEnvironment() {
  const text = run(ssh, ["-F", config, "xinanyi", "cat /opt/xinanyi/client-dev.env"]);
  const keys = new Set([
    "DATABASE_ENV",
    "MYSQL_TUNNEL_PORT",
    "DATABASE_URL",
    "MIGRATION_DATABASE_URL",
    "SHADOW_DATABASE_URL",
  ]);
  const received = text.split(/\r?\n/).filter((line) => line.trim());
  const seen = new Set();
  for (const line of received) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (!match || !keys.has(match[1]) || seen.has(match[1]))
      throw new Error("Invalid development database profile.");
    seen.add(match[1]);
  }
  if (seen.size !== keys.size) throw new Error("Incomplete development database profile.");
  const target = path.join(root, ".env.local");
  const previous = fs.existsSync(target) ? fs.readFileSync(target, "utf8").split(/\r?\n/) : [];
  const preserved = previous.filter((line) => !keys.has(line.split("=")[0]));
  while (preserved.at(-1) === "") preserved.pop();
  fs.writeFileSync(target, [...preserved, ...received, ""].join("\n"), { mode: 0o600 });
  secureFile(target);
  console.log(
    "Development database credentials saved to .env.local with restricted permissions; values were not printed.",
  );
}
async function backup() {
  const destination = path.join(root, "work", "backups");
  fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
  secureFile(destination, true);
  run(ssh, ["-F", config, "xinanyi", "bash /opt/xinanyi/server/backup-mysql.sh"], true);
  const name = run(ssh, ["-F", config, "xinanyi", "cat /opt/xinanyi/backups/latest"]).trim();
  if (!/^xinanyi-[0-9TZ]+\.sql\.gz$/.test(name)) throw new Error("Unexpected backup name.");
  run(scp, ["-F", config, "xinanyi:/opt/xinanyi/backups/" + name, destination], true);
  run(scp, ["-F", config, "xinanyi:/opt/xinanyi/backups/" + name + ".sha256", destination], true);
  const expected = fs
    .readFileSync(path.join(destination, name + ".sha256"), "utf8")
    .trim()
    .split(/\s+/)[0];
  if (!/^[0-9a-f]{64}$/.test(expected)) throw new Error("Invalid backup checksum.");
  const hash = crypto.createHash("sha256");
  for await (const chunk of fs.createReadStream(path.join(destination, name))) hash.update(chunk);
  if (hash.digest("hex") !== expected) throw new Error("Backup checksum mismatch.");
  console.log("Verified database backup saved to work/backups/" + name);
}
try {
  const action = process.argv[2];
  if (action === "tunnel-start") await startTunnel();
  else if (action === "tunnel-foreground") await startTunnel(true);
  else if (action === "tunnel-stop") stopTunnel();
  else if (action === "sync-env") syncEnvironment();
  else if (action === "backup") await backup();
  else throw new Error("Use tunnel-start, tunnel-stop, sync-env, or backup.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
