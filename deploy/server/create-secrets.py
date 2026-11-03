#!/usr/bin/env python3
import argparse
import json
import os
import pathlib
import re
import secrets
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument("--image-id", required=True)
args = parser.parse_args()
if os.geteuid() != 0:
    raise SystemExit("Run as root.")
if not re.fullmatch(r"sha256:[0-9a-f]{64}", args.image_id):
    raise SystemExit("Invalid image identifier.")
actual = subprocess.check_output(["docker", "image", "inspect", args.image_id, "--format", "{{.Id}}"], text=True).strip()
if actual != args.image_id:
    raise SystemExit("Loaded image does not match the verified image.")
base = pathlib.Path("/opt/xinanyi")
base.mkdir(mode=0o700, exist_ok=True)
secret_dir = base / "secrets"
secret_dir.mkdir(mode=0o700, exist_ok=True)
os.chmod(secret_dir, 0o700)
names = ["mysql-root", "mysql-dev-app", "mysql-dev-migrate", "mysql-prod-app", "mysql-prod-migrate", "mysql-backup"]
if (base / "data/mysql/mysql").exists() and any(not (secret_dir / name).exists() for name in names):
    raise SystemExit("Database already exists but a credential file is missing; refusing to replace credentials.")
values = {}
for name in names:
    target = secret_dir / name
    if not target.exists():
        target.write_text(secrets.token_hex(32) + "\n", encoding="ascii")
    value = target.read_text(encoding="ascii").strip()
    if not re.fullmatch(r"[0-9a-f]{64}", value):
        raise SystemExit("Unexpected credential format: " + name)
    # Parent is root-only; file is readable by the MySQL user through its secret mount.
    os.chmod(target, 0o444)
    values[name] = value
profiles = [("root", "root", "mysql-root"), ("dev_app", "xinanyi_dev_app", "mysql-dev-app"), ("dev_migrate", "xinanyi_dev_migrator", "mysql-dev-migrate"), ("prod_app", "xinanyi_prod_app", "mysql-prod-app"), ("prod_migrate", "xinanyi_prod_migrator", "mysql-prod-migrate"), ("backup", "xinanyi_backup", "mysql-backup")]
cnf = "[client]\nprotocol=socket\ndefault-character-set=utf8mb4\n"
for group, user, name in profiles:
    cnf += "\n[client_" + group + "]\nuser=" + user + "\npassword=" + values[name] + "\n"
cnf_path = secret_dir / "mysql-clients.cnf"
cnf_path.write_text(cnf, encoding="ascii")
os.chmod(cnf_path, 0o444)
env = "DATABASE_ENV=development\nMYSQL_TUNNEL_PORT=13306\n"
env += "DATABASE_URL=mysql://xinanyi_dev_app:" + values["mysql-dev-app"] + "@127.0.0.1:13306/xinanyi_dev?connection_limit=5&pool_timeout=10\n"
env += "MIGRATION_DATABASE_URL=mysql://xinanyi_dev_migrator:" + values["mysql-dev-migrate"] + "@127.0.0.1:13306/xinanyi_dev?connection_limit=2&pool_timeout=10\n"
env += "SHADOW_DATABASE_URL=mysql://xinanyi_dev_migrator:" + values["mysql-dev-migrate"] + "@127.0.0.1:13306/xinanyi_shadow?connection_limit=2\n"
profile = base / "client-dev.env"
profile.write_text(env, encoding="ascii")
os.chmod(profile, 0o600)
server_env = base / ".env"
server_env.write_text("MYSQL_IMAGE=" + args.image_id + "\n", encoding="ascii")
os.chmod(server_env, 0o600)
for directory in ["data/mysql", "backups", "server", "mysql/conf.d", "mysql/init"]:
    (base / directory).mkdir(parents=True, exist_ok=True)
os.chmod(base / "backups", 0o700)
print(json.dumps({"credentials": "generated-or-preserved", "developmentProfile": str(profile), "image": args.image_id}))
