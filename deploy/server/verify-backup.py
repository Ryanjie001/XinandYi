#!/usr/bin/env python3
import gzip
import json
import pathlib
import secrets
import subprocess

BASE = pathlib.Path("/opt/xinanyi")
prefix = ["docker", "compose", "--project-directory", str(BASE), "exec", "-T", "mysql"]
def command(program, profile, *extra):
    return prefix + [program, "--defaults-file=/run/secrets/mysql-clients.cnf", "--defaults-group-suffix=_" + profile, *extra]
def sql(query, profile="root", database=None):
    args = command("mysql", profile, "--batch", "--skip-column-names", "--default-character-set=utf8mb4")
    if database: args += ["--database=" + database]
    return subprocess.check_output(args, input=query.encode("utf8")).decode("utf8").strip()

suffix = secrets.token_hex(6)
table = "__xinanyi_restore_" + suffix
restore_db = "xinanyi_restore_" + suffix
archive = BASE / "backups" / ("restore-verification-" + suffix + ".sql.gz")
created_table = created_db = False
try:
    sql("CREATE TABLE xinanyi_dev." + table + " (id INT PRIMARY KEY, value VARCHAR(100) NOT NULL) CHARACTER SET utf8mb4; INSERT INTO xinanyi_dev." + table + " VALUES (1, '新&怡 restore 💗');")
    created_table = True
    dump = subprocess.check_output(command("mysqldump", "backup", "--single-transaction", "--no-tablespaces", "--set-gtid-purged=OFF", "--default-character-set=utf8mb4", "xinanyi_dev"))
    with gzip.open(archive, "wb") as handle: handle.write(dump)
    archive.chmod(0o600)
    with gzip.open(archive, "rb") as handle: restored = handle.read()
    if restored != dump: raise RuntimeError("Compressed backup differs from the dump.")
    sql("CREATE DATABASE " + restore_db + " CHARACTER SET utf8mb4;")
    created_db = True
    subprocess.run(command("mysql", "root", "--default-character-set=utf8mb4", "--database=" + restore_db), input=restored, check=True)
    value = sql("SELECT value FROM " + table + " WHERE id=1", database=restore_db)
    if value != "新&怡 restore 💗": raise RuntimeError("Restored data does not match the source.")
    print(json.dumps({"backupRestore": "passed", "utf8mb4": "passed", "temporaryDatabase": restore_db, "archive": str(archive)}))
finally:
    if created_db: sql("DROP DATABASE " + restore_db)
    if created_table: sql("DROP TABLE xinanyi_dev." + table)
