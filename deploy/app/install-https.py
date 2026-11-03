#!/usr/bin/env python3
import json,os,pathlib,subprocess
base=pathlib.Path("/opt/xinanyi/server")
certbot="/opt/xinanyi-certbot/bin/certbot"
args=[certbot,"certonly","--non-interactive","--agree-tos","--register-unsafely-without-email","--preferred-profile","shortlived","--webroot","--webroot-path","/var/www/xinanyi-acme","--ip-address","203.0.113.1","--cert-name","xinanyi-ip","--key-type","ecdsa","--keep-until-expiring"]
certificate=pathlib.Path("/etc/letsencrypt/live/xinanyi-ip/fullchain.pem")
if not certificate.exists():
 print("Validating the IP certificate with the staging CA...",flush=True)
 subprocess.run(args+["--staging","--config-dir","/etc/letsencrypt-staging","--work-dir","/var/lib/letsencrypt-staging","--logs-dir","/var/log/letsencrypt-staging"],check=True)
 print("Requesting the trusted production IP certificate...",flush=True)
subprocess.run(args,check=True)
hook=pathlib.Path("/etc/letsencrypt/renewal-hooks/deploy/xinanyi-reload-nginx")
hook.parent.mkdir(parents=True,exist_ok=True)
hook.write_text((base/"reload-nginx.sh").read_text())
os.chmod(hook,0o755)
for name in ["xinanyi-certbot-renew.service","xinanyi-certbot-renew.timer"]:
 pathlib.Path("/etc/systemd/system",name).write_text((base/name).read_text())
subprocess.run(["systemctl","daemon-reload"],check=True)
subprocess.run(["systemctl","enable","--now","xinanyi-certbot-renew.timer"],check=True)
print(json.dumps({"certificate":str(certificate),"renewalTimer":"enabled","reloadHook":"installed"}))
