#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 2 ]; then
	exit 1
fi

NGINX_VERSION="$1"
DISTRO="$2"

INSTALLER_URL="https://raw.githubusercontent.com/tapinko/ipcheckr/master/GNS3/nginx/scripts/nginx-install.sh"
INSTALLER_TMP="/tmp/nginx-install.sh"

curl -fsSL -o "$INSTALLER_TMP" "$INSTALLER_URL"
chmod +x "$INSTALLER_TMP"
"$INSTALLER_TMP" "$NGINX_VERSION" "$DISTRO"