#!/usr/bin/env bash
# Intentionally not executable: the official image sources this file.
xinanyi_initialize() {
  local dev_app dev_migrate prod_app prod_migrate backup
  dev_app="$(cat /run/secrets/mysql-dev-app)"
  dev_migrate="$(cat /run/secrets/mysql-dev-migrate)"
  prod_app="$(cat /run/secrets/mysql-prod-app)"
  prod_migrate="$(cat /run/secrets/mysql-prod-migrate)"
  backup="$(cat /run/secrets/mysql-backup)"
  local value
  for value in "$dev_app" "$dev_migrate" "$prod_app" "$prod_migrate" "$backup"; do
    if [[ ! "$value" =~ ^[0-9a-f]{64}$ ]]; then
      printf '%s\n' 'Invalid generated database credential.' >&2
      return 1
    fi
  done
  docker_process_sql <<EOSQL
CREATE DATABASE IF NOT EXISTS xinanyi_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS xinanyi_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS xinanyi_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'xinanyi_dev_app'@'%' IDENTIFIED BY '$dev_app' WITH MAX_USER_CONNECTIONS 5;
CREATE USER IF NOT EXISTS 'xinanyi_dev_migrator'@'%' IDENTIFIED BY '$dev_migrate' WITH MAX_USER_CONNECTIONS 2;
CREATE USER IF NOT EXISTS 'xinanyi_prod_app'@'%' IDENTIFIED BY '$prod_app' WITH MAX_USER_CONNECTIONS 10;
CREATE USER IF NOT EXISTS 'xinanyi_prod_migrator'@'%' IDENTIFIED BY '$prod_migrate' WITH MAX_USER_CONNECTIONS 2;
CREATE USER IF NOT EXISTS 'xinanyi_backup'@'%' IDENTIFIED BY '$backup' WITH MAX_USER_CONNECTIONS 2;
GRANT SELECT, INSERT, UPDATE, DELETE ON xinanyi_dev.* TO 'xinanyi_dev_app'@'%';
GRANT ALL PRIVILEGES ON xinanyi_dev.* TO 'xinanyi_dev_migrator'@'%';
GRANT ALL PRIVILEGES ON xinanyi_shadow.* TO 'xinanyi_dev_migrator'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON xinanyi_prod.* TO 'xinanyi_prod_app'@'%';
GRANT ALL PRIVILEGES ON xinanyi_prod.* TO 'xinanyi_prod_migrator'@'%';
GRANT SELECT, SHOW VIEW, TRIGGER, EVENT ON xinanyi_dev.* TO 'xinanyi_backup'@'%';
GRANT SELECT, SHOW VIEW, TRIGGER, EVENT ON xinanyi_prod.* TO 'xinanyi_backup'@'%';
GRANT SHOW_ROUTINE ON *.* TO 'xinanyi_backup'@'%';
EOSQL
}
xinanyi_initialize
unset -f xinanyi_initialize
