#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 server (Kamatera) for the deploy workflow.
#
#   scp deploy/bootstrap.sh root@<server-ip>:
#   ssh root@<server-ip> bash bootstrap.sh '<public key of the GitHub deploy key>'
#
# Installs Docker, opens only SSH/HTTP/HTTPS, creates the `deploy` user CI logs in as, and creates
# /opt/present-picker with its .env (admin password and session secret are generated and printed once).
# Safe to run again: it never overwrites an existing .env or data folder.
set -euo pipefail

DEPLOY_PUBKEY="${1:?usage: bash bootstrap.sh '<ssh public key of the GitHub deploy key>'}"
APP_DIR=/opt/present-picker

export DEBIAN_FRONTEND=noninteractive
# A fresh server runs unattended-upgrades on first boot and holds the dpkg lock; wait for it instead of failing.
apt_get() { apt-get -o DPkg::Lock::Timeout=900 "$@"; }
apt_get update
apt_get install -y ca-certificates curl ufw unattended-upgrades

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

# Small plans have 1 GB of RAM; swap keeps a memory spike from killing the app.
if [ ! -f /swapfile ]; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Only Caddy publishes ports (80/443); the app container is reachable from Caddy only.
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# The user CI deploys as. Being in the docker group is root-equivalent, so its key must stay in GitHub secrets only.
if ! id deploy >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash deploy
fi
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
grep -qxF "$DEPLOY_PUBKEY" /home/deploy/.ssh/authorized_keys 2>/dev/null \
  || echo "$DEPLOY_PUBKEY" >> /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

install -d -o deploy -g deploy "$APP_DIR"
# The container runs as `node` (uid 1000), which must own the data folder.
install -d -m 750 -o 1000 -g 1000 "$APP_DIR/data"

if [ ! -f "$APP_DIR/.env" ]; then
  ip=$(curl -4 -fsS https://api.ipify.org)
  admin_password=$(openssl rand -base64 18)
  cat > "$APP_DIR/.env" <<EOF
# Read by docker compose (SITE_ADDRESS) and passed to the app container (everything else).
# Replace SITE_ADDRESS with your own domain once its DNS A record points at $ip, then redeploy.
SITE_ADDRESS=${ip//./-}.sslip.io

NODE_ENV=production
NUXT_ADMIN_PASSWORD=$admin_password
NUXT_SESSION_SECRET=$(openssl rand -hex 32)

# Access to the MIC2 webhook playground (/admin/mic2) only.
# NUXT_MIC2_LOGIN=
# NUXT_MIC2_PASSWORD=
EOF
  chown deploy:deploy "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
  echo
  echo "Created $APP_DIR/.env"
  echo "  Site:           https://${ip//./-}.sslip.io"
  echo "  Admin password: $admin_password   (change it in $APP_DIR/.env if you like)"
fi

echo
echo "Server ready. Host key for the DEPLOY_KNOWN_HOSTS secret is printed by: ssh-keyscan -t ed25519 <server-ip>"
