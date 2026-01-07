#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 2 ]; then
	echo "Usage: $0 <gns3-version> <distro>" >&2
	exit 1
fi

GNS3_VERSION="$1"
DISTRO="$2"

CONNECTOR_URL="https://raw.githubusercontent.com/tapinko/ipcheckr/master/GNS3/launcher/src/ipcheckr-gns3-connector.sh"
CONNECTOR_TMP="/tmp/ipcheckr-gns3-connector.sh"
INSTALLER_URL="https://raw.githubusercontent.com/tapinko/ipcheckr/master/GNS3/launcher/scripts/gns3-install.sh"
INSTALLER_TMP="/tmp/gns3-install.sh"
GNS3_UNIT_URL="https://raw.githubusercontent.com/tapinko/ipcheckr/master/GNS3/launcher/systemd/gns3@.service"
GNS3_UNIT_PATH="/etc/systemd/system/gns3@.service"
SERVICE_URL="https://raw.githubusercontent.com/tapinko/ipcheckr/master/GNS3/launcher/systemd/ipcheckr-gns3.service"
SOCKET_URL="https://raw.githubusercontent.com/tapinko/ipcheckr/master/GNS3/launcher/systemd/ipcheckr-gns3.socket"
SERVICE_PATH="/etc/systemd/system/ipcheckr-gns3.service"
SOCKET_PATH="/etc/systemd/system/ipcheckr-gns3.socket"
CONNECTOR_PATH="/usr/local/bin/ipcheckr-gns3-connector"
SERVICE_USER="gns3svc"
SERVICE_HOME="/var/lib/gns3"

sudo apt-get update && sudo apt-get install -y socat

if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
	sudo useradd --system --home "$SERVICE_HOME" --shell /usr/sbin/nologin "$SERVICE_USER"
fi
sudo mkdir -p "$SERVICE_HOME"
sudo chown -R "$SERVICE_USER":"$SERVICE_USER" "$SERVICE_HOME"

curl -fsSL -o "$CONNECTOR_TMP" "$CONNECTOR_URL"
sudo install -m 0755 "$CONNECTOR_TMP" "$CONNECTOR_PATH"

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