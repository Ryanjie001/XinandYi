#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
. /etc/os-release
test "$ID" = ubuntu
test "$VERSION_ID" = 24.04
install -d -m 0700 /opt/xinanyi
if [ ! -e /opt/xinanyi/.managed-by-xinanyi ]; then
  printf '%s\n' 'Xin & Yi server infrastructure' > /opt/xinanyi/.managed-by-xinanyi
fi
if ! command -v docker >/dev/null 2>&1; then
  apt-get update -o Acquire::Retries=2 -o Acquire::http::Timeout=25 -o Acquire::https::Timeout=25
  apt-get install -y --no-install-recommends ca-certificates curl gnupg
  install -d -m 0755 /etc/apt/keyrings
  curl --fail --show-error --silent --location --retry 2 --connect-timeout 15 --max-time 90 https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  actual_fingerprint="$(gpg --batch --show-keys --with-colons /etc/apt/keyrings/docker.asc | awk -F: '$1=="fpr" {print $10; exit}')"
  test "$actual_fingerprint" = 9DC858229FC7DD38854AE2D88D81803C0EBFCD88
  chmod 0644 /etc/apt/keyrings/docker.asc
  cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: noble
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
  apt-get update -o Acquire::Retries=2 -o Acquire::https::Timeout=25
  apt-get install -y --no-install-recommends docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi
python3 - <<'PY'
import json, pathlib
p = pathlib.Path("/etc/docker/daemon.json")
settings = json.loads(p.read_text()) if p.exists() else {}
settings.setdefault("log-driver", "local")
if settings["log-driver"] == "local":
    settings.setdefault("log-opts", {}).update({"max-size": "10m", "max-file": "3"})
settings.setdefault("live-restore", True)
settings.setdefault("max-concurrent-downloads", 2)
p.parent.mkdir(parents=True, exist_ok=True)
new = json.dumps(settings, indent=2) + "\n"
old = p.read_text() if p.exists() else ""
if new != old:
    if old:
        pathlib.Path("/opt/xinanyi/docker-daemon.before.json").write_text(old)
    p.write_text(new)
    pathlib.Path("/opt/xinanyi/.docker-config-changed").touch()
PY
systemctl enable docker
if [ -e /opt/xinanyi/.docker-config-changed ]; then
  if [ -n "$(docker ps -q 2>/dev/null || true)" ]; then
    printf '%s\n' 'Docker has existing containers; configuration saved without restarting.' >&2
  else
    systemctl restart docker
    rm -f /opt/xinanyi/.docker-config-changed
  fi
else
  systemctl start docker
fi
if [ "$(awk '/^SwapTotal:/ {print $2}' /proc/meminfo)" -eq 0 ]; then
  if [ -e /opt/xinanyi/swapfile ]; then
    test "$(stat -c %s /opt/xinanyi/swapfile)" -eq 2147483648
  else
    fallocate -l 2G /opt/xinanyi/swapfile
    chmod 0600 /opt/xinanyi/swapfile
    mkswap /opt/xinanyi/swapfile
  fi
  swapon /opt/xinanyi/swapfile
  grep -qF '/opt/xinanyi/swapfile none swap sw 0 0' /etc/fstab || printf '%s\n' '/opt/xinanyi/swapfile none swap sw 0 0' >> /etc/fstab
fi
printf '%s\n' 'vm.swappiness=10' > /etc/sysctl.d/90-xinanyi-memory.conf
sysctl -p /etc/sysctl.d/90-xinanyi-memory.conf
docker --version
docker compose version
free -m
