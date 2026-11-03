#!/usr/bin/env bash
set -euo pipefail
umask 077
cd /opt/xinanyi
install -d -m 0700 backups
exec 9>backups/.backup.lock
flock -n 9 || exit 0
timestamp="$(date -u +%Y%m%dT%H%M%S%NZ)"
name="xinanyi-$timestamp.sql.gz"
temporary="backups/$name.partial"
trap 'rm -f -- "$temporary"' EXIT
docker compose exec -T mysql mysqldump \
  --defaults-file=/run/secrets/mysql-clients.cnf \
  --defaults-group-suffix=_backup \
  --single-transaction --no-tablespaces --routines --events --triggers \
  --set-gtid-purged=OFF --databases xinanyi_dev xinanyi_prod | gzip -6 > "$temporary"
gzip -t "$temporary"
mv -- "$temporary" "backups/$name"
(cd backups && sha256sum "$name" > "$name.sha256")
printf '%s\n' "$name" > backups/latest
find /opt/xinanyi/backups -maxdepth 1 -type f -name 'xinanyi-*.sql.gz*' -mmin +20160 -delete
printf '%s\n' "Database backup completed: $name"
