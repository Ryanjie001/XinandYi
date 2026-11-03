#!/usr/bin/env python3
import hashlib,json,os,pathlib,re,subprocess,tarfile,urllib.request
if os.geteuid()!=0: raise SystemExit("Run as root.")
base=pathlib.Path("/opt/xinanyi")
base.mkdir(exist_ok=True)
runtime=base/"server"/"app-runtime.json"
runtime.parent.mkdir(exist_ok=True)
subprocess.run(["apt-get","update","-qq"],check=True)
subprocess.run(["apt-get","install","-y","--no-install-recommends","nginx","python3-venv","ca-certificates","xz-utils"],check=True,env={**os.environ,"DEBIAN_FRONTEND":"noninteractive","NEEDRESTART_MODE":"a"})
url="https://nodejs.org/dist/latest-v22.x/"
sums=urllib.request.urlopen(url+"SHASUMS256.txt",timeout=30).read().decode()
matches=[line.split() for line in sums.splitlines() if re.search(r"node-v22\.\d+\.\d+-linux-x64\.tar\.xz$",line)]
if len(matches)!=1: raise SystemExit("Could not select official Node.js archive.")
digest,name=matches[0]
folder=base/"images"/"node"
folder.mkdir(parents=True,exist_ok=True)
archive=folder/name
if not archive.exists() or hashlib.sha256(archive.read_bytes()).hexdigest()!=digest:
 with urllib.request.urlopen(url+name,timeout=60) as response,archive.open("wb") as out:
  while data:=response.read(1024*1024):out.write(data)
if hashlib.sha256(archive.read_bytes()).hexdigest()!=digest:raise SystemExit("Node.js archive checksum mismatch.")
node_root=pathlib.Path("/opt")/name.removesuffix(".tar.xz")
if not node_root.exists():
 with tarfile.open(archive) as tar:
  if any(not m.name.startswith(node_root.name+"/") and m.name!=node_root.name for m in tar.getmembers()):raise SystemExit("Unexpected Node.js archive paths.")
  tar.extractall("/opt",filter="data")
for command in ["node","npm","npx"]:
 link=pathlib.Path("/usr/local/bin")/command
 target=node_root/"bin"/command
 if link.exists() or link.is_symlink():
  if link.resolve()!=target.resolve():raise SystemExit("Existing runtime command differs: "+command)
 else:link.symlink_to(target)
if subprocess.run(["id","-u","xinanyi"],capture_output=True).returncode:
 subprocess.run(["useradd","--system","--user-group","--home-dir","/var/lib/xinanyi","--no-create-home","--shell","/usr/sbin/nologin","xinanyi"],check=True)
for folder in ["/srv/xinanyi/releases","/var/www/xinanyi-acme/.well-known/acme-challenge"]:
 pathlib.Path(folder).mkdir(parents=True,exist_ok=True)
for folder in ["/etc/xinanyi","/var/lib/xinanyi"]:
 pathlib.Path(folder).mkdir(mode=0o700,exist_ok=True)
os.chmod("/etc/xinanyi",0o700)
subprocess.run(["chown","xinanyi:xinanyi","/var/lib/xinanyi"],check=True)
os.chmod("/var/lib/xinanyi",0o750)
venv=pathlib.Path("/opt/xinanyi-certbot")
if not (venv/"bin/python").exists():subprocess.run(["python3","-m","venv",str(venv)],check=True)
certbot_version=json.load(urllib.request.urlopen("https://pypi.org/pypi/certbot/json",timeout=30))["info"]["version"]
if tuple(map(int,certbot_version.split(".")[:2]))<(5,4):raise SystemExit("Certbot release is too old for IP certificates.")
subprocess.run([str(venv/"bin/pip"),"install","--disable-pip-version-check","--no-cache-dir","--index-url","https://pypi.org/simple","certbot=="+certbot_version],check=True)
available=pathlib.Path("/etc/nginx/sites-available/xinanyi")
available.write_text("""server {
 listen 80 default_server;
 listen [::]:80 default_server;
 server_name 203.0.113.1;
 server_tokens off;
 location ^~ /.well-known/acme-challenge/ { root /var/www/xinanyi-acme; default_type text/plain; }
 location / { return 503; }
}
""")
default=pathlib.Path("/etc/nginx/sites-enabled/default")
if default.is_symlink() and default.resolve()==pathlib.Path("/etc/nginx/sites-available/default"):default.unlink()
enabled=pathlib.Path("/etc/nginx/sites-enabled/xinanyi")
if not enabled.exists():enabled.symlink_to(available)
pathlib.Path("/var/www/xinanyi-acme/.well-known/acme-challenge/xinanyi-deployment-probe").write_text("xinanyi-acme-ready\n")
subprocess.run(["nginx","-t"],check=True)
subprocess.run(["systemctl","enable","--now","nginx"],check=True)
subprocess.run(["systemctl","reload","nginx"],check=True)
info={"nodeVersion":subprocess.check_output(["node","--version"],text=True).strip(),"nodeArchive":name,"nodeSha256":digest,"certbotVersion":certbot_version}
runtime.write_text(json.dumps(info,indent=2)+"\n")
print(json.dumps(info))
