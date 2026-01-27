#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 3 ]; then
	echo "Usage: $0 <gns3-version> <distro> <branch>" >&2
	exit 1
fi

GNS3_VERSION="$1"
DISTRO="$2"
BRANCH="$3"

BASE_URL="https://raw.githubusercontent.com/tapinko/ipcheckr/${BRANCH}/GNS3/launcher"
CONNECTOR_URL="${BASE_URL}/ipcheckr-gns3-connector.sh"
INSTALLER_URL="${BASE_URL}/scripts/gns3-install.sh"
GNS3_UNIT_URL="${BASE_URL}/systemd/gns3@.service"
SERVICE_URL="${BASE_URL}/systemd/ipcheckr-gns3.service"
SOCKET_URL="${BASE_URL}/systemd/ipcheckr-gns3.socket"
ENV_URL="${BASE_URL}/systemd/connector.env.example"

CONNECTOR_TMP="/tmp/ipcheckr-gns3-connector.sh"
INSTALLER_TMP="/tmp/gns3-install.sh"
GNS3_UNIT_PATH="/etc/systemd/system/gns3@.service"
SERVICE_PATH="/etc/systemd/system/ipcheckr-gns3.service"
SOCKET_PATH="/etc/systemd/system/ipcheckr-gns3.socket"
CONNECTOR_PATH="/usr/local/bin/ipcheckr-gns3-connector"
ENV_TMP="/tmp/connector.env"
ENV_DIR="/etc/ipcheckr/gns3"
ENV_PATH="${ENV_DIR}/connector.env"
SERVICE_USER="gns3svc"
SERVICE_HOME="/var/lib/gns3"

sudo apt-get update && sudo apt-get install -y socat

if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
	sudo useradd --system --home "$SERVICE_HOME" --shell /usr/sbin/nologin "$SERVICE_USER"
fi
sudo mkdir -p "$SERVICE_HOME"
sudo chown -R "$SERVICE_USER":"$SERVICE_USER" "$SERVICE_HOME"
sudo mkdir -p "$ENV_DIR"

curl -fsSL -o "$CONNECTOR_TMP" "$CONNECTOR_URL"
sudo install -m 0755 "$CONNECTOR_TMP" "$CONNECTOR_PATH"

if [ ! -f "$ENV_PATH" ]; then
	curl -fsSL -o "$ENV_TMP" "$ENV_URL"
	sudo install -m 0640 "$ENV_TMP" "$ENV_PATH"
	sudo chown root:root "$ENV_PATH" 2>/dev/null || true
else
	echo "connector env already present at $ENV_PATH; leaving in place"
fi

curl -fsSL -o "$INSTALLER_TMP" "$INSTALLER_URL"
chmod +x "$INSTALLER_TMP"
"$INSTALLER_TMP" "$GNS3_VERSION" "$DISTRO"

curl -fsSL -o "$SERVICE_PATH" "$SERVICE_URL"
curl -fsSL -o "$SOCKET_PATH" "$SOCKET_URL"
curl -fsSL -o "$GNS3_UNIT_PATH" "$GNS3_UNIT_URL"
sudo chmod 644 "$SERVICE_PATH" "$SOCKET_PATH" "$GNS3_UNIT_PATH"

sudo sed -i 's|/usr/local/bin/ipcheckr-gns3-launcher|/usr/local/bin/ipcheckr-gns3-connector|g' "$SERVICE_PATH"

sudo sed -i "s|^User=.*|User=${SERVICE_USER}|g" "$GNS3_UNIT_PATH"
sudo sed -i "s|^Group=.*|Group=${SERVICE_USER}|g" "$GNS3_UNIT_PATH"

sudo groupadd -f ipcheckr

sudo systemctl daemon-reload
sudo systemctl enable --now ipcheckr-gns3.socket
sudo systemctl enable ipcheckr-gns3.service
sudo systemctl restart ipcheckr-gns3.service