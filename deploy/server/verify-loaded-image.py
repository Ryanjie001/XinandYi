#!/usr/bin/env python3
import json
import pathlib
import subprocess
base = pathlib.Path("/opt/xinanyi")
lock = json.loads((base / "mysql/image-lock.json").read_text())
image = json.loads(subprocess.check_output(["docker", "image", "inspect", "mysql:" + lock["tag"]], text=True))[0]
runtime_id = image["Id"]
if runtime_id != lock["configDigest"]:
    manifest = json.loads(subprocess.check_output(["ctr", "-n", "moby", "content", "get", runtime_id], text=True))
    if manifest.get("config", {}).get("digest") != lock["configDigest"]:
        raise SystemExit("Loaded image config differs from the verified official image.")
if image["RootFS"]["Layers"] != lock["rootfsDiffIds"]:
    raise SystemExit("Loaded image layers differ from the verified official image.")
record = {"runtimeImageId": runtime_id, "sourceConfigDigest": lock["configDigest"], "sourceManifestDigest": lock["manifestDigest"], "tag": lock["tag"]}
(base / "mysql/runtime-image.json").write_text(json.dumps(record, indent=2) + "\n")
print(runtime_id)
