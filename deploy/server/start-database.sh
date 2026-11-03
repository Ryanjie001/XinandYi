#!/usr/bin/env bash
set -euo pipefail
cd /opt/xinanyi
python3 - <<'PY'
import hashlib, json, pathlib
base = pathlib.Path("/opt/xinanyi")
lock = json.loads((base / "mysql/image-lock.json").read_text())
archive = base / "images" / lock["archive"]
digest = hashlib.sha256()
with archive.open("rb") as handle:
    for block in iter(lambda: handle.read(1024 * 1024), b""):
        digest.update(block)
if digest.hexdigest() != lock["archiveSha256"]:
    raise SystemExit("Transferred image archive checksum mismatch.")
print("Transferred official MySQL image checksum verified.")
PY
if ! docker image inspect mysql:8.4.13 >/dev/null 2>&1; then
  docker load -i images/mysql-8.4.13-amd64.tar.gz
fi
image_id="$(python3 server/verify-loaded-image.py)"
python3 server/create-secrets.py --image-id "$image_id"
chmod 0644 mysql/init/10-databases.sh mysql/conf.d/low-memory.cnf
docker compose config --quiet
docker compose up -d --wait --wait-timeout 240
install -m 0644 systemd/xinanyi-backup.service /etc/systemd/system/xinanyi-backup.service
install -m 0644 systemd/xinanyi-backup.timer /etc/systemd/system/xinanyi-backup.timer
systemctl daemon-reload
systemctl enable --now xinanyi-backup.timer
docker compose ps
docker compose exec -T mysql mysql --defaults-file=/run/secrets/mysql-clients.cnf --defaults-group-suffix=_root --batch --execute="SELECT VERSION() AS version; SHOW DATABASES; SELECT User, Host, max_user_connections FROM mysql.user WHERE User LIKE 'xinanyi_%';"
docker stats --no-stream --format '{{.Name}}: {{.MemUsage}} / CPU {{.CPUPerc}}'
