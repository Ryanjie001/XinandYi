#!/usr/bin/env python3
import json,os,pathlib,subprocess,sys,time,urllib.request
release=pathlib.Path(sys.argv[1]).resolve()
base=pathlib.Path("/opt/xinanyi/server")
if not str(release).startswith("/srv/xinanyi/releases/") or not (release/".next-production/BUILD_ID").is_file():raise SystemExit("Release has not been built.")
marker=json.loads((base/"production-bootstrap.json").read_text())
if marker.get("status")!="complete":raise SystemExit("Production data has not been initialized.")
if not pathlib.Path("/etc/letsencrypt/live/xinanyi-ip/fullchain.pem").exists():raise SystemExit("Trusted IP certificate is missing.")
current=pathlib.Path("/srv/xinanyi/current")
if current.exists() and not current.is_symlink():raise SystemExit("Existing current path is not a managed release symlink.")
previous=str(current.resolve()) if current.exists() else None
temporary=pathlib.Path("/srv/xinanyi/.current-next")
if temporary.is_symlink():temporary.unlink()
temporary.symlink_to(release,target_is_directory=True)
os.replace(temporary,current)
unit=pathlib.Path("/etc/systemd/system/xinanyi-web.service")
unit.write_text((base/"xinanyi-web.service").read_text())
cache=release/".next-production/cache";cache.mkdir(parents=True,exist_ok=True)
subprocess.run(["chown","-R","xinanyi:xinanyi",str(cache)],check=True)
subprocess.run(["systemctl","daemon-reload"],check=True)
subprocess.run(["systemctl","enable","--now","xinanyi-web.service"],check=True)
subprocess.run(["systemctl","restart","xinanyi-web.service"],check=True)
for attempt in range(30):
 try:
  with urllib.request.urlopen("http://127.0.0.1:3000/login",timeout=3) as response:
   if response.status==200:break
 except Exception:pass
 time.sleep(1)
else:raise SystemExit("Website failed its startup health check.")
nginx=pathlib.Path("/etc/nginx/sites-available/xinanyi")
backup=base/"nginx-before-https.conf"
if not backup.exists():backup.write_text(nginx.read_text())
nginx.write_text((base/"nginx.conf").read_text())
try:subprocess.run(["nginx","-t"],check=True)
except Exception:
 nginx.write_text(backup.read_text());raise
subprocess.run(["systemctl","reload","nginx"],check=True)
result={"release":str(release),"previousRelease":previous,"origin":"https://203.0.113.1","service":"xinanyi-web","status":"active"}
(base/"active-release.json").write_text(json.dumps(result,indent=2)+"\n")
print(json.dumps(result))
