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

download_from_github() {
    local path="$1" dest="$2"
    local url="https://raw.githubusercontent.com/tapinko/ipcheckr/${GITHUB_BRANCH}/${path}"
    log_info "Downloading ${path}..."
    if ! curl -fsSL -o "$dest" "$url"; then
        log_error "Failed to download ${path} (${url})"
        exit 1
    fi
    log_success "Downloaded ${path}"
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

input_text() {
    whiptail --title "$1" --inputbox "$2" 10 60 "$3" 3>&1 1>&2 2>&3
}

input_password_required() {
    local title="$1" desc="$2" value
    while true; do
        value=$(whiptail --title "$title" --passwordbox "$desc" 10 60 3>&1 1>&2 2>&3)
        [[ -n "$value" ]] && { echo "$value"; return; }
        whiptail --title "$title" --msgbox "ERROR: Value cannot be empty" 10 60
    done
}

load_settings() {
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "No existing configuration found at ${ENV_FILE}. Run Install first."
        exit 1
    fi
    # shellcheck disable=SC1090
    source "$ENV_FILE"
}

configure_ldap() {
    local v

    if [[ -z "${DB_PASSWORD:-}" ]]; then
        DB_PASSWORD=$(input_password_required "Database Password" \
            "Database password not found in ${ENV_FILE}.\nEnter password for user '${DB_USER:-ipcheckr}':")
        DB_ROOT_PASSWORD="$DB_PASSWORD"
    else
        log_info "Using existing database password from ${ENV_FILE}"
        [[ -z "${DB_ROOT_PASSWORD:-}" ]] && DB_ROOT_PASSWORD="$DB_PASSWORD"
    fi

    v=$(input_text "DNS Nameserver" \
        "DNS nameserver IP\n(current: ${DNS_NAMESERVER:-8.8.8.8})" "${DNS_NAMESERVER:-8.8.8.8}")
    DNS_NAMESERVER="${v:-${DNS_NAMESERVER:-8.8.8.8}}"

    v=$(input_text "DNS Search Domain" \
        "DNS search domain for LDAP\n(current: ${DNS_SEARCH_DOMAIN:-ldap.example.local})" "${DNS_SEARCH_DOMAIN:-ldap.example.local}")
    DNS_SEARCH_DOMAIN="${v:-${DNS_SEARCH_DOMAIN:-ldap.example.local}}"

    v=$(input_text "LDAP Server" \
        "LDAP server address\n(current: ${LDAP_HOST:-server.ldap.example.local})" "${LDAP_HOST:-server.ldap.example.local}")
    LDAP_HOST="${v:-${LDAP_HOST:-server.ldap.example.local}}"

    v=$(input_text "LDAP Port" \
        "LDAP port\n(current: ${LDAP_PORT:-636})" "${LDAP_PORT:-636}")
    LDAP_PORT="${v:-${LDAP_PORT:-636}}"

    LDAP_FETCH_CERT="true"
    LDAP_STARTTLS="false"
}

review_ldap() {
    local txt="Review LDAP/DNS configuration:\n\n"
    txt+="DNS Nameserver:    ${DNS_NAMESERVER}\n"
    txt+="DNS Search Domain: ${DNS_SEARCH_DOMAIN}\n"
    txt+="LDAP Host:         ${LDAP_HOST}\n"
    txt+="LDAP Port:         ${LDAP_PORT}\n"
    whiptail --title "Review LDAP Configuration" \
        --yesno "${txt}\nApply these settings and restart containers?" 16 65
}

apply_and_restart() {
    log_info "Updating LDAP settings in ${ENV_FILE}..."

    for key in DNS_NAMESERVER DNS_SEARCH_DOMAIN LDAP_HOST LDAP_PORT LDAP_FETCH_CERT LDAP_STARTTLS \
               DB_ROOT_PASSWORD DB_PASSWORD; do
        update_env_var "$ENV_FILE" "$key" "${!key:-}"
    done
    chmod 600 "$ENV_FILE"
    log_success "Updated ${ENV_FILE}"

    if [[ ! -f "$DEPLOY_DIR/compose.yml" ]]; then
        log_warning "compose.yml not found — downloading..."
        download_from_github "Docker/compose.yml" "$DEPLOY_DIR/compose.yml"
    fi

    local dc_cmd
    dc_cmd=$(docker_compose_cmd)
    cd "$DEPLOY_DIR"
    log_info "Restarting containers to apply LDAP/DNS changes..."
    $dc_cmd --env-file "$ENV_FILE" -f compose.yml up -d --force-recreate --remove-orphans
    log_success "Containers restarted"

    sleep 10
    $dc_cmd --env-file "$ENV_FILE" -f compose.yml ps
}

main() {
    log_info "IPCheckr LDAP Configuration starting..."
    load_settings

    configure_ldap
    while ! review_ldap; do
        configure_ldap
    done

    apply_and_restart
    log_success "LDAP configuration applied successfully."
    log_warning "SECURITY: ${ENV_FILE} contains plaintext passwords — delete it when no longer needed"
    log_warning "  rm ${ENV_FILE}"
}

main "$@"