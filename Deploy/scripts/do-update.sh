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

docker_compose_cmd() {
    if docker compose version &>/dev/null; then
        echo "docker compose"
    elif command -v docker-compose &>/dev/null; then
        echo "docker-compose"
    else
        log_error "docker compose not available"
        exit 1
    fi
}

main() {
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "No existing configuration found at ${ENV_FILE}. Run Install first."
        exit 1
    fi

    if [[ ! -f "$DEPLOY_DIR/compose.yml" ]]; then
        log_error "compose.yml not found in ${DEPLOY_DIR}. Run Install first."
        exit 1
    fi

    # shellcheck disable=SC1090
    source "$ENV_FILE"

    local current_image="${DOCKER_IMAGE:-tapinko/ipcheckr:latest}"
    local image_base="${current_image%%:*}"
    local current_tag="${current_image#*:}"
    [[ "$current_tag" == "$image_base" ]] && current_tag="latest"

    local action
    action=$(whiptail --title "Update IPCheckr" \
        --menu "Current image: ${current_image}\n\nSelect update action:" 14 70 2 \
        "1" "Update to latest" \
        "2" "Switch to a specific version tag" \
        3>&1 1>&2 2>&3) || { log_info "Cancelled."; exit 0; }

    local new_tag
    case "$action" in
        1) new_tag="latest" ;;
        2)
            new_tag=$(whiptail --title "Target Version" \
                --inputbox "Enter the version tag (e.g. v1.2.3)\n(current: ${current_tag})" \
                10 60 "$current_tag" \
                3>&1 1>&2 2>&3)
            if [[ -z "$new_tag" ]]; then
                log_error "Version tag cannot be empty"
                exit 1
            fi
            ;;
        *) log_error "Invalid selection"; exit 1 ;;
    esac

    local new_image="${image_base}:${new_tag}"

    if ! whiptail --title "Confirm Update" \
        --yesno "Update IPCheckr image:\n  From: ${current_image}\n  To:   ${new_image}\n\nProceed?" \
        12 65; then
        log_info "Update cancelled."
        exit 0
    fi

    log_info "Pulling image: ${new_image}..."
    docker pull "$new_image"
    log_success "Image pulled successfully"

    update_env_var "$ENV_FILE" "DOCKER_IMAGE" "$new_image"
    log_success "Updated DOCKER_IMAGE in ${ENV_FILE}"

    log_info "Restarting containers with new image..."
    local dc_cmd
    dc_cmd=$(docker_compose_cmd)
    cd "$DEPLOY_DIR"
    $dc_cmd --env-file "$ENV_FILE" -f compose.yml up -d --force-recreate --remove-orphans

    log_info "Waiting for containers to be ready..."
    sleep 10
    $dc_cmd --env-file "$ENV_FILE" -f compose.yml ps

    log_success "Update complete — IPCheckr is now running ${new_image}"
    log_warning "SECURITY: ${ENV_FILE} contains plaintext passwords — delete it when no longer needed"
    log_warning "  rm ${ENV_FILE}"
}

main "$@"