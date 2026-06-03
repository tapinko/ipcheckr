#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <branch> <deploy_dir>" >&2
    exit 1
fi

BRANCH="$1"
DEPLOY_DIR="$2"

BASE_URL="https://raw.githubusercontent.com/tapinko/ipcheckr/${BRANCH}/Updater"
UPDATER_SCRIPT_URL="${BASE_URL}/ipcheckr-updater.sh"
SERVICE_URL="${BASE_URL}/systemd/ipcheckr-updater.service"
ENV_TEMPLATE_URL="${BASE_URL}/systemd/updater.env"

UPDATER_PATH="/usr/local/bin/ipcheckr-updater"
SERVICE_PATH="/etc/systemd/system/ipcheckr-updater.service"
ENV_DIR="/etc/ipcheckr/updater"
ENV_PATH="${ENV_DIR}/updater.env"

if ! command -v socat &>/dev/null; then
    if command -v apt-get &>/dev/null; then
        apt-get install -y -q socat
    elif command -v yum &>/dev/null; then
        yum install -y -q socat
    else
        echo "ERROR: socat not found and cannot install it automatically" >&2
        exit 1
    fi
fi

curl -fsSL -o /tmp/ipcheckr-updater.sh "$UPDATER_SCRIPT_URL"
install -m 0755 /tmp/ipcheckr-updater.sh "$UPDATER_PATH"

curl -fsSL -o "$SERVICE_PATH" "$SERVICE_URL"
chmod 644 "$SERVICE_PATH"

if [ ! -f "$ENV_PATH" ]; then
    mkdir -p "$ENV_DIR"
    curl -fsSL -o /tmp/updater.env "$ENV_TEMPLATE_URL"
    sed -i "s|^DEPLOY_DIR=.*|DEPLOY_DIR=${DEPLOY_DIR}|" /tmp/updater.env
    install -m 0640 /tmp/updater.env "$ENV_PATH"
    echo "Updater env created at ${ENV_PATH}"
else
    # update DEPLOY_DIR if it changed
    sed -i "s|^DEPLOY_DIR=.*|DEPLOY_DIR=${DEPLOY_DIR}|" "$ENV_PATH"
    echo "Updater env already exists at ${ENV_PATH}; DEPLOY_DIR updated"
fi

systemctl daemon-reload
systemctl enable --now ipcheckr-updater.service
echo "IPCheckr updater service enabled and started"