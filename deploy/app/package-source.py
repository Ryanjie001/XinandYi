import hashlib,json,pathlib,tarfile,datetime
root=pathlib.Path(__file__).resolve().parents[2]
out=root/"work"/"deploy"
out.mkdir(parents=True,exist_ok=True)
release=datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
archive=out/("xinanyi-"+release+".tar.gz")
entries=["src","public","prisma","scripts","deploy/app","docs","README.md","AGENTS.md","package.json","package-lock.json","tsconfig.json","next-env.d.ts","next.config.ts","postcss.config.mjs","prisma.config.ts"]
def safe(info):
 p=pathlib.PurePosixPath(info.name)
 if info.issym() or info.islnk():raise RuntimeError("Source package cannot contain symlinks.")
 if p.is_absolute() or ".." in p.parts:raise RuntimeError("Unsafe archive path.")
 if any(x in [".git","node_modules","work",".next",".next-production"] or x.startswith(".env") for x in p.parts):return None
 if p.parts[:2]==("src","generated"):return None
 info.uid=0;info.gid=0;info.uname="root";info.gname="root";info.mode=0o755 if info.isdir() else 0o644
 return info
with tarfile.open(archive,"w:gz") as tar:
 for entry in entries:tar.add(root/entry,arcname=entry,filter=safe)
digest=hashlib.sha256(archive.read_bytes()).hexdigest()
manifest={"release":release,"archive":str(archive),"sha256":digest,"bytes":archive.stat().st_size}
(out/"release.json").write_text(json.dumps(manifest,indent=2)+"\n")
print(json.dumps(manifest))
