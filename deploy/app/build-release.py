#!/usr/bin/env python3
import hashlib,json,os,pathlib,secrets,subprocess,sys,tarfile,urllib.parse
if len(sys.argv) not in (3,4):raise SystemExit("Usage: build-release.py ARCHIVE SHA256 [--resume]")
resume=len(sys.argv)==4 and sys.argv[3]=="--resume"
archive=pathlib.Path(sys.argv[1]).resolve()
expected=sys.argv[2]
if hashlib.sha256(archive.read_bytes()).hexdigest()!=expected:raise SystemExit("Release checksum mismatch.")
release_name=archive.name.removeprefix("xinanyi-").removesuffix(".tar.gz")
if not release_name or not release_name.replace("T","").replace("Z","").isdigit():raise SystemExit("Invalid release identifier.")
release=pathlib.Path("/srv/xinanyi/releases")/release_name
current=pathlib.Path("/srv/xinanyi/current")
if current.exists() and current.resolve()==release.resolve():raise SystemExit("Refusing to rebuild the active release.")
release.mkdir(parents=True,exist_ok=True)
with tarfile.open(archive) as tar:
 if resume:
  for name in ["package.json","package-lock.json","prisma/schema.prisma"]:
   if (release/name).read_bytes()!=tar.extractfile(name).read():raise SystemExit("Resume inputs differ from verified release.")
 else:tar.extractall(release,filter="data")
def load_env(file):
 return {k:json.loads(v) if v.startswith('"') else v for k,v in (line.split("=",1) for line in pathlib.Path(file).read_text().splitlines() if line and not line.startswith("#"))}
runtime_env={**os.environ,"NEXT_TELEMETRY_DISABLED":"1","NODE_OPTIONS":"--max-old-space-size=768","APP_URL":"https://203.0.113.1","BETTER_AUTH_SECRET":secrets.token_hex(32),"DATABASE_URL":"mysql://build:build@127.0.0.1:3306/xinanyi_prod","npm_config_maxsockets":"4","npm_config_fetch_retries":"5","npm_config_fetch_retry_mintimeout":"5000","npm_config_fetch_retry_maxtimeout":"15000"}
def run(args,env=runtime_env):
 subprocess.run(args,cwd=release,env=env,check=True)
if not resume:
 print("Installing locked Linux dependencies (verified cache preferred)...",flush=True)
 run(["npm","ci","--no-audit","--no-fund","--include=dev","--prefer-offline"])
 run(["npx","--no-install","prisma","generate"])
elif not (release/"src/generated/prisma/client.ts").exists():raise SystemExit("Generate the Linux Prisma client before resuming.")
print("Building the production website...",flush=True)
run(["npm","run","build"])
migration_env={**os.environ,**load_env("/etc/xinanyi/migrate.env"),"NEXT_TELEMETRY_DISABLED":"1","NODE_OPTIONS":"--max-old-space-size=384"}
p=subprocess.run(["npx","--no-install","prisma","migrate","deploy"],cwd=release,env=migration_env,capture_output=True,text=True)
output=p.stdout+p.stderr
for value in migration_env.values():
 if len(value)>15:output=output.replace(value,"[REDACTED]")
print(output,end="")
if p.returncode:raise SystemExit(p.returncode)
cache=release/".next-production/cache"
cache.mkdir(parents=True,exist_ok=True)
subprocess.run(["chown","-R","xinanyi:xinanyi",str(cache)],check=True)
print(json.dumps({"release":str(release),"checksum":expected,"build":"passed","migrations":"applied"}))
