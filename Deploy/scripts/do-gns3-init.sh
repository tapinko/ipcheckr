#!/bin/bash

set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/ipcheckr}"
GITHUB_BRANCH="${GITHUB_BRANCH:-master}"
ENV_FILE="$DEPLOY_DIR/ipcheckr.env"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ${NC} $*"; }
log_success() { echo -e "${GREEN}✓${NC} $*"; }
log_error()   { echo -e "${RED}✗${NC} $*"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $*"; }

if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root or with sudo"
    exit 1
fi

download_from_github() {
    local path="$1" dest="$2"
    local url="https://raw.githubusercontent.com/tapinko/ipcheckr/${GITHUB_BRANCH}/${path}"
    log_info "Downloading ${path} (branch: ${GITHUB_BRANCH})..."
    if ! curl -fsSL -o "$dest" "$url"; then
        log_error "Failed to download ${path} (${url})"
        exit 1
    fi
    log_success "Downloaded ${path}"
}

detect_distro() {
    if [[ -f /etc/os-release ]]; then
        # shellcheck disable=SC1091
        source /etc/os-release
        DISTRO_ID="$ID"
        DISTRO_NAME="$NAME"
        DISTRO_VERSION="$VERSION_ID"
    else
        log_error "Cannot detect Linux distribution"
        exit 1
    fi
    log_info "Detected: $DISTRO_NAME ($DISTRO_ID) version $DISTRO_VERSION"
}

ensure_connector_env() {
    local target="/etc/ipcheckr/gns3/connector.env"
    [[ -f "$target" ]] && return
    log_info "Preparing connector env at ${target}..."
    mkdir -p /etc/ipcheckr/gns3
    local tmp="/tmp/connector.env"
    download_from_github "GNS3/launcher/systemd/connector.env" "$tmp"
    install -m 0640 "$tmp" "$target"
    chown root:root "$target" 2>/dev/null || log_warning "Could not set ownership on ${target}"
    log_success "Connector env created at ${target}"
}

run_gns3_setup() {
    local version="$1" method="$2"
    log_info "Setting up GNS3 Launcher (version: ${version}, method: ${method})..."
    local tmp="/tmp/gns3-init.sh"
    download_from_github "GNS3/launcher/scripts/gns3-init.sh" "$tmp"
    chmod +x "$tmp"
    local ver_arg="$version"
    [[ -z "$ver_arg" || "$ver_arg" == "latest" ]] && ver_arg="--no-version"
    bash "$tmp" "$ver_arg" "$DISTRO_ID" "$GITHUB_BRANCH" "$method"
    log_success "GNS3 setup completed"
}

run_nginx_setup() {
    local nginx_version="$1" gns3_port="$2" web_port="$3"
    log_info "Setting up Nginx..."
    local tmp="/tmp/nginx-init.sh"
    download_from_github "GNS3/nginx/scripts/nginx-init.sh" "$tmp"
    chmod +x "$tmp"
    local ver_arg="$nginx_version"
    [[ -z "$ver_arg" || "$ver_arg" == "latest" ]] && ver_arg="--no-version"
    bash "$tmp" "$ver_arg" "$DISTRO_ID" "$GITHUB_BRANCH" "$gns3_port" "$web_port"
    log_success "Nginx setup completed"
}

update_gns3_port_config() {
    local port="$1"
    log_info "Updating GNS3 port to ${port} in system configs..."

    local connector_env="/etc/ipcheckr/gns3/connector.env"
    if [[ -f "$connector_env" ]]; then
        sed -i "s/^PORT=.*/PORT=${port}/" "$connector_env"
        log_success "Updated connector.env"
    else
        log_warning "connector.env not found at ${connector_env} (skipping)"
    fi

    local socket_path="/etc/systemd/system/ipcheckr-gns3.socket"
    if [[ -f "$socket_path" ]]; then
        systemctl stop ipcheckr-gns3.socket 2>/dev/null || true
        systemctl disable ipcheckr-gns3.socket 2>/dev/null || true
        systemctl mask ipcheckr-gns3.socket 2>/dev/null || true
        rm -f /etc/systemd/system/sockets.target.wants/ipcheckr-gns3.socket 2>/dev/null || true
        sed -i "s/ListenStream=0\.0\.0\.0:.*/ListenStream=0.0.0.0:${port}/" "$socket_path"
        systemctl daemon-reload
        log_success "Updated ipcheckr-gns3.socket (kept masked to prevent double bind)"
    else
        log_warning "ipcheckr-gns3.socket not found (skipping)"
    fi

    systemctl restart ipcheckr-gns3.service || log_warning "ipcheckr-gns3.service could not be restarted — start it manually if needed"
}

main() {
    detect_distro

    local gns3_version="2.2.52"
    local gns3_method="pypi"
    local gns3_port="6769"
    local nginx_version="latest"
    local nginx_gns3_port="5555"
    local web_port="8081"

    if [[ -f "$ENV_FILE" ]]; then
        log_info "Reading settings from ${ENV_FILE}..."
        # shellcheck disable=SC1090
        source "$ENV_FILE"
        gns3_version="${GNS3_VERSION:-$gns3_version}"
        gns3_method="${GNS3_INSTALL_METHOD:-$gns3_method}"
        gns3_port="${GNS3_LAUNCHER_PORT:-$gns3_port}"
        nginx_version="${NGINX_VERSION:-$nginx_version}"
        nginx_gns3_port="${NGINX_GNS3_PORT:-$nginx_gns3_port}"
        web_port="${WEB_PORT:-$web_port}"
    else
        log_warning "No env file found at ${ENV_FILE} — using built-in defaults"
    fi

    log_info "GNS3 Init Only"
    log_info "  Version: ${gns3_version}, Method: ${gns3_method}, Port: ${gns3_port}"
    log_info "  Nginx GNS3 port: ${nginx_gns3_port}, Web port: ${web_port}"

    ensure_connector_env
    run_gns3_setup "$gns3_version" "$gns3_method"
    update_gns3_port_config "$gns3_port"
    run_nginx_setup "$nginx_version" "$nginx_gns3_port" "$web_port"

    log_success "GNS3 init-only completed."
}

main "$@"