#!/usr/bin/env python3
import json,os,pathlib,secrets,urllib.parse
base=pathlib.Path("/opt/xinanyi/secrets")
target=pathlib.Path("/etc/xinanyi")
target.mkdir(mode=0o700,exist_ok=True)
os.chmod(target,0o700)
cos=json.loads((base/"app-cos.json").read_text())
required=["COS_BUCKET","COS_REGION","COS_SECRET_ID","COS_SECRET_KEY"]
if not all(cos.get(k) for k in required):raise SystemExit("COS configuration is incomplete.")
def read_env(file):
 if not file.exists():return {}
 return {k:json.loads(v) if v.startswith('"') else v for k,v in (line.split("=",1) for line in file.read_text().splitlines() if line and not line.startswith("#"))}
def write_env(file,data):
 for k,v in data.items():
  if "\n" in v or "\r" in v or "\0" in v:raise SystemExit("Invalid environment value.")
 file.write_text("".join(k+"="+json.dumps(v,ensure_ascii=True)+"\n" for k,v in data.items()))
 os.chmod(file,0o600)
old=read_env(target/"app.env")
password=(base/"mysql-prod-app").read_text().strip()
migrate_password=(base/"mysql-prod-migrate").read_text().strip()
env={"NODE_ENV":"production","NEXT_TELEMETRY_DISABLED":"1","DATABASE_ENV":"production","APP_URL":"https://203.0.113.1","BETTER_AUTH_SECRET":old.get("BETTER_AUTH_SECRET") or secrets.token_hex(32),"DATABASE_URL":"mysql://xinanyi_prod_app:"+urllib.parse.quote(password,safe="")+"@127.0.0.1:3306/xinanyi_prod?connection_limit=3","COS_PREFIX":"xinanyi/production","NODE_OPTIONS":"--max-old-space-size=384","MALLOC_ARENA_MAX":"2",**{k:cos[k] for k in required}}
write_env(target/"app.env",env)
write_env(target/"migrate.env",{"DATABASE_ENV":"production","DATABASE_URL":env["DATABASE_URL"],"MIGRATION_DATABASE_URL":"mysql://xinanyi_prod_migrator:"+urllib.parse.quote(migrate_password,safe="")+"@127.0.0.1:3306/xinanyi_prod?connection_limit=2"})
print(json.dumps({"environment":"production","origin":env["APP_URL"],"photosPrefix":env["COS_PREFIX"],"secrets":"root-only","existingAuthSecret":"preserved" if old.get("BETTER_AUTH_SECRET") else "created"}))
