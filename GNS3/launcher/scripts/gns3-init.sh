#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 2 ]; then
	exit 1
fi

GNS3_VERSION="$1"
DISTRO="$2"

CONNECTOR_URL="https://github.com/tapinko/ipcheckr/releases/latest/download/ipcheckr-gns3-connector"
CONNECTOR_TMP="/tmp/ipcheckr-gns3-connector"
INSTALLER_URL="https://raw.githubusercontent.com/tapinko/ipcheckr/master/GNS3/launcher/scripts/gns3-install.sh"
INSTALLER_TMP="/tmp/gns3-install.sh"

curl -fsSL -o "$CONNECTOR_TMP" "$CONNECTOR_URL"
sudo install -m 0755 "$CONNECTOR_TMP" /usr/local/bin/ipcheckr-gns3-connector

curl -fsSL -o "$INSTALLER_TMP" "$INSTALLER_URL"
chmod +x "$INSTALLER_TMP"
"$INSTALLER_TMP" "$GNS3_VERSION" "$DISTRO"
