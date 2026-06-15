#!/bin/bash

set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/ipcheckr}"
GITHUB_BRANCH="${GITHUB_BRANCH:-master}"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}ℹ${NC} $*"; }
log_error() { echo -e "${RED}✗${NC} $*"; }

if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root or with sudo"
    exit 1
fi

mkdir -p "$DEPLOY_DIR"

ENV_FILE="${DEPLOY_DIR}/ipcheckr.env"
if [[ -f "$ENV_FILE" ]]; then
    SAVED=$(grep '^BRANCH=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 || true)
    if [[ -n "$SAVED" && "$SAVED" =~ ^[A-Za-z0-9._-]+$ ]]; then
        GITHUB_BRANCH="$SAVED"
    fi
fi

log_info "GitHub branch: ${GITHUB_BRANCH}"

check_whiptail() {
    command -v whiptail &>/dev/null && return
    if command -v apt-get &>/dev/null; then
        apt-get update -qq && apt-get install -y whiptail
    elif command -v yum &>/dev/null; then
        yum install -y newt
    else
        log_error "Cannot install whiptail. Please install it manually."
        exit 1
    fi
}

download_and_run() {
    local name="$1"; shift
    local tmp="/tmp/ipcheckr-${name}"
    local url="https://raw.githubusercontent.com/tapinko/ipcheckr/${GITHUB_BRANCH}/Deploy/scripts/${name}"
    log_info "Downloading ${name}..."
    if ! curl -fsSL -o "$tmp" "$url"; then
        log_error "Failed to download ${name} (${url})"
        exit 1
    fi
    chmod +x "$tmp"
    export DEPLOY_DIR GITHUB_BRANCH
    bash "$tmp" "$@"
}

check_whiptail

CHOICE=$(whiptail --title "IPCheckr Manager" \
    --menu "Select an action:" 18 65 5 \
    "1" "Install IPCheckr" \
    "2" "Update IPCheckr" \
    "3" "Update / Change GNS3 Version" \
    "4" "Configure LDAP" \
    "5" "GNS3 Init Only" \
    3>&1 1>&2 2>&3) || { log_info "Cancelled."; exit 0; }

case "$CHOICE" in
    1) download_and_run "do-install.sh" ;;
    2) download_and_run "do-update.sh" ;;
    3) download_and_run "do-gns3-version.sh" ;;
    4) download_and_run "do-ldap.sh" ;;
    5) download_and_run "do-gns3-init.sh" ;;
    *) log_error "Invalid selection"; exit 1 ;;
esac