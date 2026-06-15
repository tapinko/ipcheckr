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

mkdir -p "$DEPLOY_DIR"

declare -A DEFAULTS=(
    [WEB_PORT]="8081"
    [TZ]="Europe/Bratislava"
    [DB_HOST]="db"
    [DB_PORT]="3306"
    [DB_NAME]="ipcheckr"
    [DB_USER]="ipcheckr"
    [DB_ROOT_PASSWORD]=""
    [DB_PASSWORD]=""
    [DNS_NAMESERVER]="8.8.8.8"
    [DNS_SEARCH_DOMAIN]="ldap.example.local"
    [LDAP_HOST]="server.ldap.example.local"
    [LDAP_PORT]="636"
    [LDAP_STARTTLS]="false"
    [LDAP_FETCH_CERT]="true"
    [GNS3_LAUNCHER_PORT]="6769"
    [GNS3_LAUNCHER_TIMEOUT]="5"
    [GNS3_LAUNCHER_RETRIES]="2"
    [GNS3_LAUNCHER_HOST]="host.docker.internal"
    [GNS3_USE_TLS]="true"
    [GNS3_LAUNCHER_SERVERNAME]="host.docker.internal"
    [GNS3_LAUNCHER_ALLOW_NAME_MISMATCH]="true"
    [NGINX_GNS3_PORT]="5555"
    [DOCKER_IMAGE]="tapinko/ipcheckr:latest"
    [CONTAINER_IPCHECKR]="ipcheckr"
    [CONTAINER_DATABASE]="ipcheckr-db"
    [MARIADB_IMAGE]="mariadb:12.0.2"
    [GNS3_VERSION]="2.2.52"
    [GNS3_INSTALL_METHOD]="pypi"
    [NGINX_VERSION]="latest"
    [BRANCH]="master"
    [INSTALL_GNS3]="true"
    [UPDATER_ENABLED]="true"
    [UPDATER_PORT]="6770"
)

declare -A CONFIG



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

install_docker() {
    log_info "Installing Docker from official repository..."
    case "$DISTRO_ID" in
        ubuntu)
            apt-get update
            apt-get install -y ca-certificates curl
            install -m 0755 -d /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
            chmod a+r /etc/apt/keyrings/docker.asc
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
            apt-get update
            apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            ;;
        debian)
            apt-get update
            apt-get install -y ca-certificates curl
            install -m 0755 -d /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
            chmod a+r /etc/apt/keyrings/docker.asc
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
            apt-get update
            apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            ;;
        centos|rhel|fedora)
            yum install -y -q yum-utils
            yum-config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
            yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            ;;
        *)
            log_error "Unsupported distribution: $DISTRO_ID"
            log_info "Please install Docker manually: https://docs.docker.com/engine/install/"
            exit 1
            ;;
    esac
    systemctl enable docker
    systemctl start docker
    log_success "Docker installed successfully"
}

check_docker() {
    if ! command -v docker &>/dev/null; then
        if yes_no "Install Docker" "Docker is not installed. Install it from the official repository?"; then
            install_docker
        else
            log_error "Docker is required. Please install it manually."
            exit 1
        fi
    else
        log_success "Docker is installed"
    fi

    if ! command -v docker-compose &>/dev/null && ! docker compose version &>/dev/null; then
        log_error "docker-compose not found. Run: apt-get install docker-compose-plugin"
        exit 1
    else
        log_success "Docker Compose is available"
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

ensure_env_file() {
    if [[ -f "$ENV_FILE" ]]; then
        log_info "Found existing ${ENV_FILE}; using it."
        return
    fi
    log_info "${ENV_FILE} not found — downloading template..."
    local tmp="/tmp/ipcheckr.env"
    download_from_github "Deploy/example.env" "$tmp"
    sed -i 's/^DB_ROOT_PASSWORD=.*/DB_ROOT_PASSWORD=/' "$tmp"
    sed -i 's/^DB_PASSWORD=.*/DB_PASSWORD=/' "$tmp"
    sed -i 's/^LDAP_BIND_PASSWORD=.*/LDAP_BIND_PASSWORD=/' "$tmp"
    mv "$tmp" "$ENV_FILE"
    log_success "Created ${ENV_FILE} from template"
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

load_existing_env() {
    ensure_env_file
    if [[ -f "$ENV_FILE" ]]; then
        log_info "Loading existing configuration from $ENV_FILE"
        # shellcheck disable=SC1090
        source "$ENV_FILE"
    fi
}

resolve_branch() {
    local candidate="${BRANCH:-$GITHUB_BRANCH}"
    if [[ -z "$candidate" ]]; then
        candidate="$GITHUB_BRANCH"
    elif [[ ! "$candidate" =~ ^[A-Za-z0-9._-]+$ ]]; then
        log_warning "Ignoring invalid BRANCH value '$candidate'; using '${GITHUB_BRANCH}'"
        candidate="$GITHUB_BRANCH"
    fi
    GITHUB_BRANCH="$candidate"
    log_info "Using GitHub branch: ${GITHUB_BRANCH}"
}

seed_config_defaults() {
    local key env_value
    local host_fqdn
    host_fqdn=$(hostname -f 2>/dev/null || hostname 2>/dev/null || echo "ipcheckr-gns3")
    DEFAULTS[GNS3_LAUNCHER_SERVERNAME]="$host_fqdn"
    for key in "${!DEFAULTS[@]}"; do
        env_value="${!key:-}"
        CONFIG[$key]="${env_value:-${DEFAULTS[$key]}}"
    done
}

save_env() {
    cat > "$ENV_FILE" <<EOF
WEB_PORT=${CONFIG[WEB_PORT]}
TZ=${CONFIG[TZ]}

DB_HOST=${CONFIG[DB_HOST]}
DB_PORT=${CONFIG[DB_PORT]}
DB_NAME=${CONFIG[DB_NAME]}
DB_USER=${CONFIG[DB_USER]}
DB_ROOT_PASSWORD=${CONFIG[DB_ROOT_PASSWORD]}
DB_PASSWORD=${CONFIG[DB_PASSWORD]}

DNS_NAMESERVER=${CONFIG[DNS_NAMESERVER]}
DNS_SEARCH_DOMAIN=${CONFIG[DNS_SEARCH_DOMAIN]}

LDAP_HOST=${CONFIG[LDAP_HOST]}
LDAP_PORT=${CONFIG[LDAP_PORT]}
LDAP_STARTTLS=${CONFIG[LDAP_STARTTLS]}
LDAP_FETCH_CERT=${CONFIG[LDAP_FETCH_CERT]}
LDAP_BIND_PASSWORD=

INSTALL_GNS3=${CONFIG[INSTALL_GNS3]}
GNS3_LAUNCHER_PORT=${CONFIG[GNS3_LAUNCHER_PORT]}
GNS3_LAUNCHER_TIMEOUT=${CONFIG[GNS3_LAUNCHER_TIMEOUT]}
GNS3_LAUNCHER_RETRIES=${CONFIG[GNS3_LAUNCHER_RETRIES]}
GNS3_LAUNCHER_HOST=${CONFIG[GNS3_LAUNCHER_HOST]}
GNS3_USE_TLS=${CONFIG[GNS3_USE_TLS]}
GNS3_LAUNCHER_SERVERNAME=${CONFIG[GNS3_LAUNCHER_SERVERNAME]}
GNS3_LAUNCHER_ALLOW_NAME_MISMATCH=${CONFIG[GNS3_LAUNCHER_ALLOW_NAME_MISMATCH]}
NGINX_GNS3_PORT=${CONFIG[NGINX_GNS3_PORT]}

UPDATER_ENABLED=${CONFIG[UPDATER_ENABLED]}
UPDATER_PORT=${CONFIG[UPDATER_PORT]}

DOCKER_IMAGE=${CONFIG[DOCKER_IMAGE]}
CONTAINER_IPCHECKR=${CONFIG[CONTAINER_IPCHECKR]}
CONTAINER_DATABASE=${CONFIG[CONTAINER_DATABASE]}
MARIADB_IMAGE=${CONFIG[MARIADB_IMAGE]}
GNS3_VERSION=${CONFIG[GNS3_VERSION]}
GNS3_INSTALL_METHOD=${CONFIG[GNS3_INSTALL_METHOD]}
NGINX_VERSION=${CONFIG[NGINX_VERSION]}

BRANCH=${GITHUB_BRANCH}
EOF
    chmod 600 "$ENV_FILE"
    log_success "Configuration saved to $ENV_FILE"
}


input_text() {
    whiptail --title "$1" --inputbox "$2" 10 60 "$3" 3>&1 1>&2 2>&3
}

input_password() {
    whiptail --title "$1" --passwordbox "$2" 10 60 3>&1 1>&2 2>&3
}

input_password_required() {
    local title="$1" desc="$2" value
    while true; do
        value=$(input_password "$title" "$desc")
        [[ -n "$value" ]] && { echo "$value"; return; }
        whiptail --title "$title" --msgbox "ERROR: Value cannot be empty" 10 60
    done
}

yes_no() {
    whiptail --title "$1" --yesno "$2" 10 60
}

show_info() {
    whiptail --title "$1" --msgbox "$2" 12 70
}

run_gns3_setup() {
    log_info "Setting up GNS3 Launcher..."
    local tmp="/tmp/gns3-init.sh"
    download_from_github "GNS3/launcher/scripts/gns3-init.sh" "$tmp"
    chmod +x "$tmp"
    local ver="${CONFIG[GNS3_VERSION]}"
    [[ -z "$ver" || "$ver" == "latest" ]] && ver="--no-version"
    bash "$tmp" "$ver" "$DISTRO_ID" "$GITHUB_BRANCH" "${CONFIG[GNS3_INSTALL_METHOD]}"
    log_success "GNS3 setup completed"
}

run_nginx_setup() {
    log_info "Setting up Nginx..."
    local tmp="/tmp/nginx-init.sh"
    download_from_github "GNS3/nginx/scripts/nginx-init.sh" "$tmp"
    chmod +x "$tmp"
    local ver="${CONFIG[NGINX_VERSION]}"
    [[ -z "$ver" || "$ver" == "latest" ]] && ver="--no-version"
    bash "$tmp" "$ver" "$DISTRO_ID" "$GITHUB_BRANCH" "${CONFIG[NGINX_GNS3_PORT]}" "${CONFIG[WEB_PORT]}"
    log_success "Nginx setup completed"
}

run_updater_setup() {
    log_info "Setting up IPCheckr Updater service..."
    local tmp="/tmp/updater-init.sh"
    download_from_github "Updater/scripts/updater-init.sh" "$tmp"
    chmod +x "$tmp"
    bash "$tmp" "$GITHUB_BRANCH" "$DEPLOY_DIR" "${CONFIG[UPDATER_PORT]}"
    log_success "Updater setup completed"
}

update_gns3_port_config() {
    log_info "Updating GNS3 port to ${CONFIG[GNS3_LAUNCHER_PORT]} in system configs..."

    local connector_env="/etc/ipcheckr/gns3/connector.env"
    if [[ -f "$connector_env" ]]; then
        sed -i "s/^PORT=.*/PORT=${CONFIG[GNS3_LAUNCHER_PORT]}/" "$connector_env"
        log_success "Updated connector.env"
    else
        log_warning "connector.env not found at $connector_env (skipping)"
    fi

    local socket_path="/etc/systemd/system/ipcheckr-gns3.socket"
    if [[ -f "$socket_path" ]]; then
        systemctl stop ipcheckr-gns3.socket 2>/dev/null || true
        systemctl disable ipcheckr-gns3.socket 2>/dev/null || true
        systemctl mask ipcheckr-gns3.socket 2>/dev/null || true
        rm -f /etc/systemd/system/sockets.target.wants/ipcheckr-gns3.socket 2>/dev/null || true
        sed -i "s/ListenStream=0\.0\.0\.0:.*/ListenStream=0.0.0.0:${CONFIG[GNS3_LAUNCHER_PORT]}/" "$socket_path"
        systemctl daemon-reload
        log_success "Updated ipcheckr-gns3.socket (kept masked to prevent double bind)"
    else
        log_warning "ipcheckr-gns3.socket not found (skipping)"
    fi

    systemctl restart ipcheckr-gns3.service || log_warning "ipcheckr-gns3.service could not be restarted — start it manually if needed"
}

setup_docker_compose() {
    log_info "Downloading Docker Compose file..."
    download_from_github "Docker/compose.yml" "$DEPLOY_DIR/compose.yml"
}

start_docker_compose() {
    log_info "Starting Docker containers..."
    local dc_cmd
    dc_cmd=$(docker_compose_cmd)

    if [[ ! -f "$DEPLOY_DIR/compose.yml" ]]; then
        log_error "compose.yml not found in $DEPLOY_DIR"
        return 1
    fi

    cd "$DEPLOY_DIR"

    log_info "Recreating containers to apply configuration changes..."
    $dc_cmd --env-file "$ENV_FILE" -f compose.yml up -d --force-recreate --remove-orphans
    log_success "Docker containers started"

    log_info "Waiting for containers to be ready..."
    sleep 10
    $dc_cmd --env-file "$ENV_FILE" -f compose.yml ps
}

get_server_ip() {
    hostname -I | awk '{print $1}'
}

show_summary() {
    local ver
    ver=$(docker inspect "${CONFIG[CONTAINER_IPCHECKR]}" \
        --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
        | grep '^APP_VERSION=' | cut -d= -f2 | tr -d '[:space:]' || true)
    ver="${ver:-unknown}"

    whiptail --title "Installation Complete" --msgbox \
        "Installed version: ${ver}\n\nWeb Interface:  https://$(get_server_ip):${CONFIG[WEB_PORT]}\nGNS3 Proxy:     https://$(get_server_ip):${CONFIG[NGINX_GNS3_PORT]}" \
        12 70
}

show_security_warning() {
    whiptail --title "SECURITY WARNING" --msgbox \
        "$(cat <<MSG
ipcheckr.env contains plaintext passwords.

Once you have verified the installation is working
correctly, delete the file to protect your credentials:

  rm ${ENV_FILE}

NOTE: You will need to re-enter passwords the next time
you run an installer or maintenance script.
MSG
)" 16 65
    log_warning "SECURITY: Delete ${ENV_FILE} after verifying the installation"
    log_warning "  rm ${ENV_FILE}"
}

configure_basic() {
    log_info "Starting BASIC configuration..."
    local v

    v=$(input_text "Web Port" "Port for the web interface\n(default: ${CONFIG[WEB_PORT]})" "${CONFIG[WEB_PORT]}")
    CONFIG[WEB_PORT]="${v:-${CONFIG[WEB_PORT]}}"

    v=$(input_text "Timezone" "Timezone (e.g. Europe/Bratislava, UTC)\n(default: ${CONFIG[TZ]})" "${CONFIG[TZ]}")
    CONFIG[TZ]="${v:-${CONFIG[TZ]}}"

    v=$(input_password_required "Database Password" "Password for database user '${CONFIG[DB_USER]}'\n(used for root and application user)")
    CONFIG[DB_PASSWORD]="$v"
    CONFIG[DB_ROOT_PASSWORD]="$v"

    v=$(input_text "DNS Nameserver" "DNS nameserver IP\n(default: ${CONFIG[DNS_NAMESERVER]})" "${CONFIG[DNS_NAMESERVER]}")
    CONFIG[DNS_NAMESERVER]="${v:-${CONFIG[DNS_NAMESERVER]}}"

    if yes_no "LDAP Authentication" "Configure LDAP authentication?"; then
        CONFIG[LDAP_FETCH_CERT]="true"
        CONFIG[LDAP_STARTTLS]="false"

        v=$(input_text "LDAP Server" "LDAP server address\n(current: ${CONFIG[LDAP_HOST]})" "${CONFIG[LDAP_HOST]}")
        CONFIG[LDAP_HOST]="${v:-${CONFIG[LDAP_HOST]}}"

        v=$(input_text "LDAP Port" "LDAP port\n(current: ${CONFIG[LDAP_PORT]})" "${CONFIG[LDAP_PORT]}")
        CONFIG[LDAP_PORT]="${v:-${CONFIG[LDAP_PORT]}}"

        v=$(input_text "DNS Search Domain" "DNS search domain for LDAP\n(current: ${CONFIG[DNS_SEARCH_DOMAIN]})" "${CONFIG[DNS_SEARCH_DOMAIN]}")
        CONFIG[DNS_SEARCH_DOMAIN]="${v:-${CONFIG[DNS_SEARCH_DOMAIN]}}"
    else
        CONFIG[LDAP_FETCH_CERT]="false"
        CONFIG[LDAP_STARTTLS]="false"
    fi

    if yes_no "Install GNS3" "Install and initialize GNS3 with Nginx reverse proxy?"; then
        CONFIG[INSTALL_GNS3]="true"

        local method
        method=$(whiptail --title "GNS3 Install Method" \
            --menu "Select how to install gns3-server:" 12 70 2 \
            "pypi" "Install via PyPI (pin version)" \
            "repo" "Install via package manager" \
            3>&1 1>&2 2>&3)

        case "$method" in
            pypi)
                CONFIG[GNS3_INSTALL_METHOD]="pypi"
                v=$(input_text "GNS3 Version" "gns3-server version for PyPI install\n(default: ${CONFIG[GNS3_VERSION]})" "${CONFIG[GNS3_VERSION]}")
                CONFIG[GNS3_VERSION]="${v:-${CONFIG[GNS3_VERSION]}}"
                ;;
            repo)
                CONFIG[GNS3_INSTALL_METHOD]="repo"
                CONFIG[GNS3_VERSION]="latest"
                ;;
            *)
                log_warning "No method selected; keeping defaults."
                ;;
        esac
    else
        CONFIG[INSTALL_GNS3]="false"
    fi
}

configure_advanced() {
    log_info "Starting ADVANCED configuration..."
    configure_basic

    show_info "Advanced Options" "Configure advanced options.\nLeave fields empty to keep the shown defaults."

    local v
    v=$(input_text "DB Host" "Database host\n(default: ${CONFIG[DB_HOST]})" "${CONFIG[DB_HOST]}")
    CONFIG[DB_HOST]="${v:-${CONFIG[DB_HOST]}}"

    v=$(input_text "DB Port" "Database port\n(default: ${CONFIG[DB_PORT]})" "${CONFIG[DB_PORT]}")
    CONFIG[DB_PORT]="${v:-${CONFIG[DB_PORT]}}"

    v=$(input_text "DB Name" "Database name\n(default: ${CONFIG[DB_NAME]})" "${CONFIG[DB_NAME]}")
    CONFIG[DB_NAME]="${v:-${CONFIG[DB_NAME]}}"

    v=$(input_text "DB User" "Database username\n(default: ${CONFIG[DB_USER]})" "${CONFIG[DB_USER]}")
    CONFIG[DB_USER]="${v:-${CONFIG[DB_USER]}}"

    v=$(input_text "API Container Name" "Container name for the API\n(default: ${CONFIG[CONTAINER_IPCHECKR]})" "${CONFIG[CONTAINER_IPCHECKR]}")
    CONFIG[CONTAINER_IPCHECKR]="${v:-${CONFIG[CONTAINER_IPCHECKR]}}"

    v=$(input_text "DB Container Name" "Container name for the database\n(default: ${CONFIG[CONTAINER_DATABASE]})" "${CONFIG[CONTAINER_DATABASE]}")
    CONFIG[CONTAINER_DATABASE]="${v:-${CONFIG[CONTAINER_DATABASE]}}"

    v=$(input_text "GNS3 Launcher Port" "Internal GNS3 launcher port\n(default: ${CONFIG[GNS3_LAUNCHER_PORT]})" "${CONFIG[GNS3_LAUNCHER_PORT]}")
    CONFIG[GNS3_LAUNCHER_PORT]="${v:-${CONFIG[GNS3_LAUNCHER_PORT]}}"

    v=$(input_text "Nginx GNS3 Port" "Nginx port for GNS3 connections\n(default: ${CONFIG[NGINX_GNS3_PORT]})" "${CONFIG[NGINX_GNS3_PORT]}")
    CONFIG[NGINX_GNS3_PORT]="${v:-${CONFIG[NGINX_GNS3_PORT]}}"

    v=$(input_text "GNS3 Launcher Timeout" "Timeout for GNS3 launcher calls in seconds\n(default: ${CONFIG[GNS3_LAUNCHER_TIMEOUT]})" "${CONFIG[GNS3_LAUNCHER_TIMEOUT]}")
    CONFIG[GNS3_LAUNCHER_TIMEOUT]="${v:-${CONFIG[GNS3_LAUNCHER_TIMEOUT]}}"

    v=$(input_text "GNS3 Launcher Retries" "Number of retry attempts\n(default: ${CONFIG[GNS3_LAUNCHER_RETRIES]})" "${CONFIG[GNS3_LAUNCHER_RETRIES]}")
    CONFIG[GNS3_LAUNCHER_RETRIES]="${v:-${CONFIG[GNS3_LAUNCHER_RETRIES]}}"
}

review_configuration() {
    local txt="Review your configuration:\n\n"
    txt+="Web Port:          ${CONFIG[WEB_PORT]}\n"
    txt+="Timezone:          ${CONFIG[TZ]}\n"
    txt+="DB Host:Port:      ${CONFIG[DB_HOST]}:${CONFIG[DB_PORT]}\n"
    txt+="DB Name / User:    ${CONFIG[DB_NAME]} / ${CONFIG[DB_USER]}\n"
    txt+="DNS Nameserver:    ${CONFIG[DNS_NAMESERVER]}\n"
    txt+="LDAP Enabled:      ${CONFIG[LDAP_FETCH_CERT]}\n"
    if [[ "${CONFIG[LDAP_FETCH_CERT]}" == "true" ]]; then
        txt+="LDAP Host:Port:    ${CONFIG[LDAP_HOST]}:${CONFIG[LDAP_PORT]}\n"
        txt+="DNS Search Domain: ${CONFIG[DNS_SEARCH_DOMAIN]}\n"
    fi
    txt+="Install GNS3:      ${CONFIG[INSTALL_GNS3]}\n"
    if [[ "${CONFIG[INSTALL_GNS3]}" == "true" ]]; then
        txt+="GNS3 Method:       ${CONFIG[GNS3_INSTALL_METHOD]}\n"
        txt+="GNS3 Version:      ${CONFIG[GNS3_VERSION]}\n"
        txt+="GNS3 Port:         ${CONFIG[GNS3_LAUNCHER_PORT]}\n"
        txt+="Nginx GNS3 Port:   ${CONFIG[NGINX_GNS3_PORT]}\n"
    fi
    txt+="Docker Image:      ${CONFIG[DOCKER_IMAGE]}\n"

    whiptail --title "Review Configuration" --yesno "${txt}\nProceed with installation?" 28 70
}

main() {
    log_info "IPCheckr Installation starting..."
    detect_distro
    load_existing_env
    seed_config_defaults
    resolve_branch

    whiptail --title "IPCheckr Installation" --msgbox \
        "Welcome to the IPCheckr Installation Wizard.\n\nYou will be guided through the required settings.\nChoose BASIC for a quick setup or ADVANCED for full control." \
        12 65

    local mode
    mode=$(whiptail --title "Installation Mode" \
        --menu "Select installation mode:" 12 60 2 \
        "1" "BASIC    — Essential settings only" \
        "2" "ADVANCED — Full customization" \
        3>&1 1>&2 2>&3) || { log_info "Cancelled."; exit 0; }

    case "$mode" in
        1) configure_basic ;;
        2) configure_advanced ;;
        *) log_error "Invalid selection"; exit 1 ;;
    esac

    while ! review_configuration; do
        case "$mode" in
            1) configure_basic ;;
            2) configure_advanced ;;
        esac
    done

    save_env
    check_docker
    ensure_connector_env
    setup_docker_compose

    if [[ "${CONFIG[INSTALL_GNS3]}" == "true" ]]; then
        run_gns3_setup
        update_gns3_port_config
        run_nginx_setup
    else
        log_info "GNS3 installation skipped"
    fi

    run_updater_setup
    start_docker_compose
    show_summary
    show_security_warning
    log_success "Installation completed successfully!"
}

main "$@"