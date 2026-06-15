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

update_env_var() {
    local file="$1" key="$2" value="$3"
    [[ -f "$file" ]] || touch "$file"
    if grep -q "^${key}=" "$file"; then
        sed -i "s|^${key}=.*|${key}=${value}|" "$file"
    else
        [[ -s "$file" ]] && [[ $(tail -c1 "$file") != $'\n' ]] && echo >> "$file"
        echo "${key}=${value}" >> "$file"
    fi
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

run_gns3_setup() {
    local version="$1" method="$2"
    log_info "Running GNS3 setup (version: ${version}, method: ${method})..."
    local tmp="/tmp/gns3-init.sh"
    download_from_github "GNS3/launcher/scripts/gns3-init.sh" "$tmp"
    chmod +x "$tmp"
    local ver_arg="$version"
    [[ -z "$ver_arg" || "$ver_arg" == "latest" ]] && ver_arg="--no-version"
    bash "$tmp" "$ver_arg" "$DISTRO_ID" "$GITHUB_BRANCH" "$method"
    log_success "GNS3 setup completed"
}

main() {
    detect_distro

    local current_version="unknown"
    local current_method="pypi"
    if [[ -f "$ENV_FILE" ]]; then
        current_version=$(grep '^GNS3_VERSION=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 || echo "unknown")
        current_method=$(grep '^GNS3_INSTALL_METHOD=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 || echo "pypi")
    fi

    local method
    method=$(whiptail --title "GNS3 Install Method" \
        --menu "Current method: ${current_method}\n\nSelect install method:" 13 70 2 \
        "pypi" "Install via PyPI (pin version)" \
        "repo" "Install via package manager" \
        3>&1 1>&2 2>&3) || { log_info "Cancelled."; exit 0; }

    local version
    case "$method" in
        pypi)
            version=$(whiptail --title "GNS3 Version" \
                --inputbox "Enter gns3-server version for PyPI\n(current: ${current_version})" \
                10 60 "$current_version" \
                3>&1 1>&2 2>&3)
            if [[ -z "$version" ]]; then
                log_error "Version cannot be empty for PyPI install"
                exit 1
            fi
            ;;
        repo)
            version="latest"
            ;;
        *) log_error "Invalid selection"; exit 1 ;;
    esac

    if ! whiptail --title "Confirm GNS3 Update" \
        --yesno "Update GNS3 server:\n  Method:  ${method}\n  Version: ${version}\n\nThe GNS3 service will be reinstalled and restarted. Proceed?" \
        12 65; then
        log_info "Cancelled."
        exit 0
    fi

    run_gns3_setup "$version" "$method"

    if [[ -f "$ENV_FILE" ]]; then
        update_env_var "$ENV_FILE" "GNS3_VERSION" "$version"
        update_env_var "$ENV_FILE" "GNS3_INSTALL_METHOD" "$method"
        log_success "Updated GNS3_VERSION and GNS3_INSTALL_METHOD in ${ENV_FILE}"
    fi

    log_success "GNS3 version change complete (${method}: ${version})"
}

main "$@"