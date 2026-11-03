import concurrent.futures, gzip, hashlib, io, json, os, pathlib, struct, tarfile, threading, time, urllib.request, urllib.error
ROOT = pathlib.Path(__file__).resolve().parents[2] / "work" / "infra" / "mysql-image"
ROOT.mkdir(parents=True, exist_ok=True)
REGISTRY = "https://registry-1.docker.io/v2/library/mysql"
TAG = "8.4.13"
ACCEPT = ", ".join(["application/vnd.oci.image.index.v1+json", "application/vnd.docker.distribution.manifest.list.v2+json", "application/vnd.oci.image.manifest.v1+json", "application/vnd.docker.distribution.manifest.v2+json"])
token_lock = threading.Lock()
token = None

def request(url, accept=None):
    global token
    with token_lock:
        if token is None:
            with urllib.request.urlopen("https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/mysql:pull", timeout=30) as response:
                token = json.load(response)["token"]
        current = token
    headers = {"Authorization": "Bearer " + current}
    if accept: headers["Accept"] = accept
    try:
        return urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=60)
    except urllib.error.HTTPError as error:
        if error.code == 401:
            with token_lock: token = None
        raise

def metadata(ref):
    with request(REGISTRY + "/manifests/" + ref, ACCEPT) as response:
        raw = response.read()
        expected = response.headers.get("Docker-Content-Digest")
    digest = "sha256:" + hashlib.sha256(raw).hexdigest()
    if expected and expected != digest: raise RuntimeError("Manifest digest mismatch")
    if ref.startswith("sha256:") and ref != digest: raise RuntimeError("Requested manifest digest mismatch")
    return json.loads(raw), digest

index, index_digest = metadata(TAG)
if "manifests" in index:
    selected = next(item for item in index["manifests"] if item.get("platform", {}).get("os") == "linux" and item.get("platform", {}).get("architecture") == "amd64")
    manifest, platform_digest = metadata(selected["digest"])
else:
    manifest, platform_digest = index, index_digest
blobs = [manifest["config"]] + manifest["layers"]
total = sum(item["size"] for item in blobs)
print("Official mysql:" + TAG + ", linux/amd64, compressed " + str(round(total / 1024**2, 1)) + " MiB", flush=True)
print("Verified platform manifest: " + platform_digest, flush=True)

def download(item):
    digest = item["digest"]
    expected = digest.split(":")[1]
    dest = ROOT / (expected + ".blob")
    if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest() == expected: return dest
    for attempt in range(3):
        part = dest.with_suffix(".part")
        try:
            hasher = hashlib.sha256()
            with request(REGISTRY + "/blobs/" + digest) as response, part.open("wb") as output:
                while True:
                    block = response.read(1024 * 1024)
                    if not block: break
                    output.write(block)
                    hasher.update(block)
            if hasher.hexdigest() != expected: raise RuntimeError("Blob digest mismatch")
            os.replace(part, dest)
            print("Verified layer " + expected[:12] + ": " + str(round(dest.stat().st_size / 1024**2, 1)) + " MiB", flush=True)
            return dest
        except Exception as error:
            if attempt == 2: raise
            print("Retrying layer " + expected[:12] + " (" + type(error).__name__ + ")", flush=True)
            time.sleep(2)
    raise RuntimeError("Download failed")

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
    list(executor.map(download, blobs))
config_digest = manifest["config"]["digest"].split(":")[1]
config_bytes = (ROOT / (config_digest + ".blob")).read_bytes()
config = json.loads(config_bytes)
if config.get("os") != "linux" or config.get("architecture") != "amd64":
    raise RuntimeError("Unexpected image platform")
layer_names = [item["digest"].split(":")[1] + "/layer.tar" for item in manifest["layers"]]
docker_manifest = json.dumps([{"Config": config_digest + ".json", "RepoTags": ["mysql:" + TAG], "Layers": layer_names}]).encode()
archive = ROOT / ("mysql-" + TAG + "-amd64.tar.gz")
print("Packaging verified official image for server transfer.", flush=True)
with tarfile.open(archive, "w:gz", compresslevel=3) as tar:
    for name, payload in [("manifest.json", docker_manifest), (config_digest + ".json", config_bytes)]:
        info = tarfile.TarInfo(name); info.size = len(payload)
        tar.addfile(info, io.BytesIO(payload))
    for item, name in zip(manifest["layers"], layer_names):
        blob = ROOT / (item["digest"].split(":")[1] + ".blob")
        with blob.open("rb") as handle:
            magic = handle.read(2)
            if magic == b"\x1f\x8b":
                handle.seek(-4, 2)
                size = struct.unpack("<I", handle.read(4))[0]
            else:
                size = blob.stat().st_size
        info = tarfile.TarInfo(name); info.size = size
        opener = gzip.open if magic == b"\x1f\x8b" else open
        with opener(blob, "rb") as layer:
            tar.addfile(info, layer)
archive_sha = hashlib.sha256()
with archive.open("rb") as handle:
    for block in iter(lambda: handle.read(1024 * 1024), b""): archive_sha.update(block)
lock = {"source": "docker.io/library/mysql", "tag": TAG, "platform": "linux/amd64", "indexDigest": index_digest, "manifestDigest": platform_digest, "configDigest": "sha256:" + config_digest, "rootfsDiffIds": config["rootfs"]["diff_ids"], "archive": archive.name, "archiveSha256": archive_sha.hexdigest(), "archiveBytes": archive.stat().st_size}
(ROOT / "image-lock.json").write_text(json.dumps(lock, indent=2) + "\n", encoding="utf8")
print(json.dumps(lock, indent=2), flush=True)
