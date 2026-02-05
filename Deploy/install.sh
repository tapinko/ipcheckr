#!/bin/bash

# This script provides an interactive installation wizard for IPCheckr
# using Whiptail for the user interface.

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DEPLOY_DIR="$SCRIPT_DIR"

if [[ $EUID -ne 0 ]]; then
  echo "ERROR: This script must be run as root or with sudo"
  exit 1
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENV_FILE="$DEPLOY_DIR/ipcheckr.env"
ENV_RUNTIME="$DEPLOY_DIR/.env"

GITHUB_BRANCH="master" # to download env

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
)

declare -A CONFIG


log_info() {
    echo -e "${BLUE}ℹ${NC} $*"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*"
}

log_error() {
    echo -e "${RED}✗${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $*"
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

ensure_env_file() {
    if [[ -f "$ENV_FILE" ]]; then
        log_info "Found existing ${ENV_FILE}; using it."
        return
    fi
    log_info "${ENV_FILE} not found. Downloading template..."
    local tmp_env="/tmp/ipcheckr.env"
    download_from_github "Deploy/example.env" "$tmp_env"

    sed -i 's/^DB_ROOT_PASSWORD=.*/DB_ROOT_PASSWORD=/' "$tmp_env"
    sed -i 's/^DB_PASSWORD=.*/DB_PASSWORD=/' "$tmp_env"
    sed -i 's/^LDAP_BIND_PASSWORD=.*/LDAP_BIND_PASSWORD=/' "$tmp_env"
    mv "$tmp_env" "$ENV_FILE"
    log_success "Created ${ENV_FILE} from template"
}

ensure_connector_env() {
    local target="/etc/ipcheckr/gns3/connector.env"
    if [[ -f "$target" ]]; then
        return
    fi
    log_info "Preparing connector env at ${target}..."
    sudo mkdir -p /etc/ipcheckr/gns3
    local tmp_env="/tmp/connector.env"
    download_from_github "GNS3/launcher/systemd/connector.env" "$tmp_env"
    sudo install -m 0640 "$tmp_env" "$target"
    sudo chown root:root "$target" 2>/dev/null || true
    log_success "Connector env created at ${target}"
}

download_from_github() {
    local path="$1"
    local dest="$2"
    local url="https://raw.githubusercontent.com/tapinko/ipcheckr/${GITHUB_BRANCH}/${path}"
    log_info "Downloading ${path} (branch: ${GITHUB_BRANCH})..."
    if ! curl -fsSL -o "$dest" "$url"; then
        log_error "Failed to download ${path} from GitHub (URL: ${url})"
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

install_docker() {
    log_info "Installing Docker from official repository..."
    case "$DISTRO_ID" in
        ubuntu)
            log_info "Installing Docker for Ubuntu..."
            apt-get update
            apt-get install -y ca-certificates curl
            install -m 0755 -d /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
            chmod a+r /etc/apt/keyrings/docker.asc
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
            apt-get update
            apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            systemctl enable docker
            systemctl start docker
            ;;
        debian)
            log_info "Installing Docker for Debian..."
            apt-get update
            apt-get install -y ca-certificates curl
            install -m 0755 -d /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
            chmod a+r /etc/apt/keyrings/docker.asc
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
            apt-get update
            apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            systemctl enable docker
            systemctl start docker
            ;;
        centos|rhel|fedora)
            log_info "Installing Docker for RHEL/CentOS/Fedora..."
            yum install -y -q yum-utils
            yum-config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
            yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            systemctl enable docker
            systemctl start docker
            ;;
        *)
            log_error "Unsupported distribution: $DISTRO_ID"
            log_info "Please install Docker manually from https://docs.docker.com/engine/install/"
            exit 1
            ;;
    esac
    log_success "Docker installed successfully"
}

run_gns3_setup() {
    log_info "Setting up GNS3 Launcher..."
    local gns3_init_tmp="/tmp/gns3-init.sh"
    download_from_github "GNS3/launcher/scripts/gns3-init.sh" "$gns3_init_tmp"
    chmod +x "$gns3_init_tmp"
    local gns3_version_arg="${CONFIG[GNS3_VERSION]}"
    if [[ -z "$gns3_version_arg" || "$gns3_version_arg" == "latest" ]]; then
        gns3_version_arg="--no-version"
    fi
    local gns3_install_method="${CONFIG[GNS3_INSTALL_METHOD]:-pypi}"
    bash "$gns3_init_tmp" "$gns3_version_arg" "$DISTRO_ID" "$GITHUB_BRANCH" "$gns3_install_method"
    log_success "GNS3 setup completed"
}

run_nginx_setup() {
    log_info "Setting up Nginx..."
    local nginx_init_tmp="/tmp/nginx-init.sh"
    download_from_github "GNS3/nginx/scripts/nginx-init.sh" "$nginx_init_tmp"
    chmod +x "$nginx_init_tmp"
    local nginx_version_arg="${CONFIG[NGINX_VERSION]}"
    if [[ -z "$nginx_version_arg" || "$nginx_version_arg" == "latest" ]]; then
        nginx_version_arg="--no-version"
    fi
    bash "$nginx_init_tmp" "$nginx_version_arg" "$DISTRO_ID" "$GITHUB_BRANCH" "${CONFIG[NGINX_GNS3_PORT]}" "${CONFIG[WEB_PORT]}"
    log_success "Nginx setup completed"
}

update_gns3_port_config() {
    log_info "Updating GNS3 port to ${CONFIG[GNS3_LAUNCHER_PORT]} in system configs..."

    local connector_env="/etc/ipcheckr/gns3/connector.env"
    if [[ -f "$connector_env" ]]; then
        sudo sed -i "s/^PORT=.*/PORT=${CONFIG[GNS3_LAUNCHER_PORT]}/" "$connector_env"
        log_success "Updated connector.env"
    else
        log_warning "connector.env not found at $connector_env (will skip)"
    fi

    local socket_path="/etc/systemd/system/ipcheckr-gns3.socket"
    if [[ -f "$socket_path" ]]; then
        sudo systemctl stop ipcheckr-gns3.socket 2>/dev/null || true
        sudo systemctl disable ipcheckr-gns3.socket 2>/dev/null || true
        sudo systemctl mask ipcheckr-gns3.socket 2>/dev/null || true
        sudo rm -f /etc/systemd/system/sockets.target.wants/ipcheckr-gns3.socket 2>/dev/null || true
        sudo sed -i "s/ListenStream=0\.0\.0\.0:.*/ListenStream=0.0.0.0:${CONFIG[GNS3_LAUNCHER_PORT]}/" "$socket_path"
        sudo systemctl daemon-reload
        log_success "Updated ipcheckr-gns3.socket (kept masked to prevent double bind)"
    else
        log_warning "ipcheckr-gns3.socket not found at $socket_path (will skip)"
    fi

    sudo systemctl restart ipcheckr-gns3.service
}

check_whiptail() {
    if ! command -v whiptail &> /dev/null; then
        log_error "whiptail not found. Installing..."
        if command -v apt-get &> /dev/null; then
            apt-get update
            apt-get install -y whiptail
        elif command -v yum &> /dev/null; then
            yum install -y newt
        else
            log_error "Cannot install whiptail. Please install it manually."
            exit 1
        fi
    fi
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_warning "docker not found. Installing Docker..."
        if yes_no "Install Docker" "Docker is not installed. Do you want to install it from official repository?"; then
            install_docker
        else
            log_error "Docker is required. Please install it manually."
            exit 1
        fi
    else
        log_success "Docker is installed"
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "docker-compose not found. It should have been installed with Docker."
        log_info "Please run: apt-get install docker-compose-plugin"
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
        log_error "docker compose not available; install docker compose plugin or docker-compose"
        exit 1
    fi
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
        log_warning "Ignoring invalid BRANCH value '$candidate'; using default '${GITHUB_BRANCH}'"
        candidate="$GITHUB_BRANCH"
    fi

    GITHUB_BRANCH="$candidate"
    log_info "Using GitHub branch: ${GITHUB_BRANCH}"
}

seed_config_defaults() {
    local key env_value host_fqdn
    host_fqdn=$(hostname -f 2>/dev/null || hostname 2>/dev/null || echo "ipcheckr-gns3")

    DEFAULTS[GNS3_LAUNCHER_SERVERNAME]="${DEFAULTS[GNS3_LAUNCHER_SERVERNAME]:-$host_fqdn}"

    for key in "${!DEFAULTS[@]}"; do
        env_value="${!key:-}"
        CONFIG[$key]="${env_value:-${DEFAULTS[$key]}}"
    done

    CONFIG[DB_HOST_ALIAS]="${CONFIG[DB_HOST]}"
}

save_config_env() {
    CONFIG[DB_HOST_ALIAS]="${CONFIG[DB_HOST]}"

    cat >"$ENV_FILE" <<EOF
WEB_PORT=${CONFIG[WEB_PORT]}
TZ=${CONFIG[TZ]}
DB_HOST=${CONFIG[DB_HOST]}
DB_PORT=${CONFIG[DB_PORT]}
DB_NAME=${CONFIG[DB_NAME]}
DB_USER=${CONFIG[DB_USER]}
DB_ROOT_PASSWORD=
DB_PASSWORD=
DNS_NAMESERVER=${CONFIG[DNS_NAMESERVER]}
DNS_SEARCH_DOMAIN=${CONFIG[DNS_SEARCH_DOMAIN]}
LDAP_HOST=${CONFIG[LDAP_HOST]}
LDAP_PORT=${CONFIG[LDAP_PORT]}
LDAP_STARTTLS=${CONFIG[LDAP_STARTTLS]}
LDAP_FETCH_CERT=${CONFIG[LDAP_FETCH_CERT]}
GNS3_LAUNCHER_PORT=${CONFIG[GNS3_LAUNCHER_PORT]}
GNS3_LAUNCHER_TIMEOUT=${CONFIG[GNS3_LAUNCHER_TIMEOUT]}
GNS3_LAUNCHER_RETRIES=${CONFIG[GNS3_LAUNCHER_RETRIES]}
GNS3_LAUNCHER_HOST=${CONFIG[GNS3_LAUNCHER_HOST]}
GNS3_USE_TLS=${CONFIG[GNS3_USE_TLS]}
GNS3_LAUNCHER_SERVERNAME=${CONFIG[GNS3_LAUNCHER_SERVERNAME]}
GNS3_LAUNCHER_ALLOW_NAME_MISMATCH=${CONFIG[GNS3_LAUNCHER_ALLOW_NAME_MISMATCH]}
NGINX_GNS3_PORT=${CONFIG[NGINX_GNS3_PORT]}
GNS3_VERSION=${CONFIG[GNS3_VERSION]}
GNS3_INSTALL_METHOD=${CONFIG[GNS3_INSTALL_METHOD]}
NGINX_VERSION=${CONFIG[NGINX_VERSION]}
DOCKER_IMAGE=${CONFIG[DOCKER_IMAGE]}
CONTAINER_IPCHECKR=${CONFIG[CONTAINER_IPCHECKR]}
CONTAINER_DATABASE=${CONFIG[CONTAINER_DATABASE]}
MARIADB_IMAGE=${CONFIG[MARIADB_IMAGE]}
BRANCH=${GITHUB_BRANCH}
INSTALL_GNS3=${CONFIG[INSTALL_GNS3]}
EOF

    log_success "Configuration rewritten to $ENV_FILE (without secrets)"
}

save_runtime_env() {
    CONFIG[DB_HOST_ALIAS]="${CONFIG[DB_HOST]}"

    {
        echo "# Runtime env for docker-compose - includes secrets"
        echo "# $(date)"
        echo "WEB_PORT=${CONFIG[WEB_PORT]}"
        echo "TZ=${CONFIG[TZ]}"
        echo "DB_HOST=${CONFIG[DB_HOST_ALIAS]}"
        echo "DB_PORT=${CONFIG[DB_PORT]}"
        echo "DB_NAME=${CONFIG[DB_NAME]}"
        echo "DB_USER=${CONFIG[DB_USER]}"
        echo "DB_ROOT_PASSWORD=${CONFIG[DB_ROOT_PASSWORD]}"
        echo "DB_PASSWORD=${CONFIG[DB_PASSWORD]}"
        echo "DNS_NAMESERVER=${CONFIG[DNS_NAMESERVER]}"
        echo "DNS_SEARCH_DOMAIN=${CONFIG[DNS_SEARCH_DOMAIN]}"
        echo "LDAP_HOST=${CONFIG[LDAP_HOST]}"
        echo "LDAP_PORT=${CONFIG[LDAP_PORT]}"
        echo "LDAP_STARTTLS=${CONFIG[LDAP_STARTTLS]}"
        echo "LDAP_FETCH_CERT=${CONFIG[LDAP_FETCH_CERT]}"
        echo "GNS3_LAUNCHER_PORT=${CONFIG[GNS3_LAUNCHER_PORT]}"
        echo "GNS3_LAUNCHER_TIMEOUT=${CONFIG[GNS3_LAUNCHER_TIMEOUT]}"
        echo "GNS3_LAUNCHER_RETRIES=${CONFIG[GNS3_LAUNCHER_RETRIES]}"
        echo "GNS3_LAUNCHER_HOST=${CONFIG[GNS3_LAUNCHER_HOST]}"
        echo "GNS3_USE_TLS=${CONFIG[GNS3_USE_TLS]}"
        echo "GNS3_LAUNCHER_SERVERNAME=${CONFIG[GNS3_LAUNCHER_SERVERNAME]}"
        echo "GNS3_LAUNCHER_ALLOW_NAME_MISMATCH=${CONFIG[GNS3_LAUNCHER_ALLOW_NAME_MISMATCH]}"
        echo "GNS3_VERSION=${CONFIG[GNS3_VERSION]}"
        echo "GNS3_INSTALL_METHOD=${CONFIG[GNS3_INSTALL_METHOD]}"
        echo "NGINX_GNS3_PORT=${CONFIG[NGINX_GNS3_PORT]}"
        echo "DOCKER_IMAGE=${CONFIG[DOCKER_IMAGE]}"
        echo "CONTAINER_IPCHECKR=${CONFIG[CONTAINER_IPCHECKR]}"
        echo "CONTAINER_DATABASE=${CONFIG[CONTAINER_DATABASE]}"
        echo "MARIADB_IMAGE=${CONFIG[MARIADB_IMAGE]}"
        echo "DB_HOST=${CONFIG[DB_HOST_ALIAS]}"
        echo "BRANCH=${GITHUB_BRANCH}"
        echo "INSTALL_GNS3=${CONFIG[INSTALL_GNS3]}"
    } > "$ENV_RUNTIME"

    log_success "Runtime env saved to $ENV_RUNTIME"
}

show_intro() {
    whiptail --title "IPCheckr Installation" \
        --msgbox "Welcome to IPCheckr Installation Wizard\n\nThis script will guide you through configuring and installing IPCheckr.\n\nYou'll be able to choose between BASIC and ADVANCED modes." \
        12 60
}

show_mode_selection() {
    local choice
    choice=$(whiptail --title "Installation Mode" \
        --menu "Select installation mode:" \
        12 60 2 \
        "1" "BASIC - Essential settings only" \
        "2" "ADVANCED - Full customization" \
        3>&1 1>&2 2>&3)
    
    echo "$choice"
}

input_text() {
    local title="$1"
    local description="$2"
    local default="$3"
    
    whiptail --title "$title" \
        --inputbox "$description" \
        10 60 "$default" \
        3>&1 1>&2 2>&3
}

input_password() {
    local title="$1"
    local description="$2"
    
    whiptail --title "$title" \
        --passwordbox "$description" \
        10 60 \
        3>&1 1>&2 2>&3
}

input_password_required() {
    local title="$1"
    local description="$2"
    local value
    while true; do
        value=$(input_password "$title" "$description")
        if [[ -n "$value" ]]; then
            echo "$value"
            return
        fi
        show_error "$title" "Value cannot be empty"
    done
}

yes_no() {
    local title="$1"
    local description="$2"
    
    whiptail --title "$title" \
        --yesno "$description" \
        10 60
}

show_info() {
    local title="$1"
    local message="$2"
    
    whiptail --title "$title" \
        --msgbox "$message" \
        12 70
}

show_error() {
    local title="$1"
    local message="$2"
    
    whiptail --title "$title" \
        --msgbox "ERROR: $message" \
        12 70
}

configure_basic() {
    log_info "Starting BASIC configuration..."
    
    local web_port
    web_port=$(input_text "Web Interface Port" \
        "Enter the port for the web interface\n(default: ${CONFIG[WEB_PORT]})" \
        "${CONFIG[WEB_PORT]}" )
    CONFIG[WEB_PORT]="${web_port:-${CONFIG[WEB_PORT]}}"
    
    local tz
    tz=$(input_text "Timezone" \
        "Enter timezone (e.g., Europe/Bratislava, UTC)\n(default: ${CONFIG[TZ]})" \
        "${CONFIG[TZ]}" )
    CONFIG[TZ]="${tz:-${CONFIG[TZ]}}"
    
    local db_pass
    db_pass=$(input_password_required "Database Password" \
        "Enter database password for user '${CONFIG[DB_USER]}'\n(used for both root and ipcheckr user)")
    CONFIG[DB_PASSWORD]="$db_pass"
    CONFIG[DB_ROOT_PASSWORD]="$db_pass"
    
    local dns_ns
    dns_ns=$(input_text "DNS Nameserver" \
        "Enter DNS nameserver IP\n(default: ${CONFIG[DNS_NAMESERVER]})" \
        "${CONFIG[DNS_NAMESERVER]}" )
    CONFIG[DNS_NAMESERVER]="${dns_ns:-${CONFIG[DNS_NAMESERVER]}}"
    
    local use_ldap
    if yes_no "LDAP Authentication" "Do you want to configure LDAP authentication?"; then
        CONFIG[LDAP_FETCH_CERT]="true"
        CONFIG[LDAP_STARTTLS]="false"
        
        local ldap_host
        ldap_host=$(input_text "LDAP Server" \
            "Enter LDAP server address\n(default: ${CONFIG[LDAP_HOST]})" \
            "${CONFIG[LDAP_HOST]}" )
        CONFIG[LDAP_HOST]="${ldap_host:-${CONFIG[LDAP_HOST]}}"
        
        local ldap_port
        ldap_port=$(input_text "LDAP Port" \
            "Enter LDAP port\n(default: ${CONFIG[LDAP_PORT]})" \
            "${CONFIG[LDAP_PORT]}" )
        CONFIG[LDAP_PORT]="${ldap_port:-${CONFIG[LDAP_PORT]}}"
        
        local dns_search
        dns_search=$(input_text "DNS Search Domain" \
            "Enter DNS search domain (for LDAP)\n(default: ${CONFIG[DNS_SEARCH_DOMAIN]})" \
            "${CONFIG[DNS_SEARCH_DOMAIN]}" )
        CONFIG[DNS_SEARCH_DOMAIN]="${dns_search:-${CONFIG[DNS_SEARCH_DOMAIN]}}"
    else
        CONFIG[LDAP_FETCH_CERT]="false"
        CONFIG[LDAP_STARTTLS]="false"
    fi

    if yes_no "Install GNS3" "Do you want to install and initialize GNS3 with the reverse proxy?"; then
        CONFIG[INSTALL_GNS3]="true"

        local method
        method=$(whiptail --title "GNS3 Install Method" \
            --menu "Select how to install gns3-server" \
            12 70 2 \
            "pypi" "Install via PyPI (lets you pin version)" \
            "repo" "Install via package manager (uses repo latest)" \
            3>&1 1>&2 2>&3)

        case "$method" in
            pypi)
                CONFIG[GNS3_INSTALL_METHOD]="pypi"
                local gns3_ver
                gns3_ver=$(input_text "GNS3 PyPI Version" \
                    "Enter gns3-server version for PyPI install\n(default: ${CONFIG[GNS3_VERSION]})" \
                    "${CONFIG[GNS3_VERSION]}")
                CONFIG[GNS3_VERSION]="${gns3_ver:-${CONFIG[GNS3_VERSION]}}"
                ;;
            repo)
                CONFIG[GNS3_INSTALL_METHOD]="repo"
                CONFIG[GNS3_VERSION]="latest"
                ;;
            *)
                log_warning "No method selected; keeping defaults (${CONFIG[GNS3_INSTALL_METHOD]})."
                ;;
        esac
    else
        CONFIG[INSTALL_GNS3]="false"
    fi
}

configure_advanced() {
    log_info "Starting ADVANCED configuration..."
    
    configure_basic
    
    show_info "Advanced Options" "You will now configure advanced options.\n\nLeave fields empty to keep defaults."
    
    local db_host
    db_host=$(input_text "Database Host" \
        "Enter database host\n(default: ${CONFIG[DB_HOST]})" \
        "${CONFIG[DB_HOST]}")
    CONFIG[DB_HOST]="${db_host:-${CONFIG[DB_HOST]}}"
    
    local db_port
    db_port=$(input_text "Database Port" \
        "Enter database port\n(default: ${CONFIG[DB_PORT]})" \
        "${CONFIG[DB_PORT]}")
    CONFIG[DB_PORT]="${db_port:-${CONFIG[DB_PORT]}}"
    
    local db_name
    db_name=$(input_text "Database Name" \
        "Enter database name\n(default: ${CONFIG[DB_NAME]})" \
        "${CONFIG[DB_NAME]}")
    CONFIG[DB_NAME]="${db_name:-${CONFIG[DB_NAME]}}"
    
    local db_user
    db_user=$(input_text "Database User" \
        "Enter database username\n(default: ${CONFIG[DB_USER]})" \
        "${CONFIG[DB_USER]}")
    CONFIG[DB_USER]="${db_user:-${CONFIG[DB_USER]}}"

    local c_ipcheckr
    c_ipcheckr=$(input_text "API Container Name" \
        "Enter container name for API\n(default: ${CONFIG[CONTAINER_IPCHECKR]})" \
        "${CONFIG[CONTAINER_IPCHECKR]}")
    CONFIG[CONTAINER_IPCHECKR]="${c_ipcheckr:-${CONFIG[CONTAINER_IPCHECKR]}}"

    local c_db
    c_db=$(input_text "DB Container Name" \
        "Enter container name for database\n(default: ${CONFIG[CONTAINER_DATABASE]})" \
        "${CONFIG[CONTAINER_DATABASE]}")
    CONFIG[CONTAINER_DATABASE]="${c_db:-${CONFIG[CONTAINER_DATABASE]}}"
    
    local gns3_port
    gns3_port=$(input_text "GNS3 Launcher Port" \
        "Enter internal GNS3 launcher port\n(default: ${CONFIG[GNS3_LAUNCHER_PORT]})" \
        "${CONFIG[GNS3_LAUNCHER_PORT]}")
    CONFIG[GNS3_LAUNCHER_PORT]="${gns3_port:-${CONFIG[GNS3_LAUNCHER_PORT]}}"
    
    local nginx_port
    nginx_port=$(input_text "Nginx GNS3 Port" \
        "Enter Nginx port for GNS3 connections\n(default: ${CONFIG[NGINX_GNS3_PORT]})" \
        "${CONFIG[NGINX_GNS3_PORT]}")
    CONFIG[NGINX_GNS3_PORT]="${nginx_port:-${CONFIG[NGINX_GNS3_PORT]}}"
    
    local gns3_timeout
    gns3_timeout=$(input_text "GNS3 Launcher Timeout" \
        "Enter timeout for GNS3 launcher calls (seconds)\n(default: ${CONFIG[GNS3_LAUNCHER_TIMEOUT]})" \
        "${CONFIG[GNS3_LAUNCHER_TIMEOUT]}")
    CONFIG[GNS3_LAUNCHER_TIMEOUT]="${gns3_timeout:-${CONFIG[GNS3_LAUNCHER_TIMEOUT]}}"
    
    local gns3_retries
    gns3_retries=$(input_text "GNS3 Launcher Retries" \
        "Enter number of retry attempts\n(default: ${CONFIG[GNS3_LAUNCHER_RETRIES]})" \
        "${CONFIG[GNS3_LAUNCHER_RETRIES]}")
    CONFIG[GNS3_LAUNCHER_RETRIES]="${gns3_retries:-${CONFIG[GNS3_LAUNCHER_RETRIES]}}"
}

review_configuration() {
    local review_text="Review your configuration:\n\n"
    review_text+="WEB PORT: ${CONFIG[WEB_PORT]}\n"
    review_text+="TIMEZONE: ${CONFIG[TZ]}\n"
    review_text+="DB_HOST: ${CONFIG[DB_HOST]}\n"
    review_text+="DB_PORT: ${CONFIG[DB_PORT]}\n"
    review_text+="DB_NAME: ${CONFIG[DB_NAME]}\n"
    review_text+="DB_USER: ${CONFIG[DB_USER]}\n"
    review_text+="DNS_NAMESERVER: ${CONFIG[DNS_NAMESERVER]}\n"
    review_text+="LDAP_ENABLED: ${CONFIG[LDAP_FETCH_CERT]}\n"
    
    if [[ "${CONFIG[LDAP_FETCH_CERT]}" == "true" ]]; then
        review_text+="LDAP_HOST: ${CONFIG[LDAP_HOST]}\n"
        review_text+="LDAP_PORT: ${CONFIG[LDAP_PORT]}\n"
        review_text+="DNS_SEARCH_DOMAIN: ${CONFIG[DNS_SEARCH_DOMAIN]}\n"
    fi
    
    review_text+="GNS3_PORT: ${CONFIG[GNS3_LAUNCHER_PORT]} (TLS: ${CONFIG[GNS3_USE_TLS]}, SNI: ${CONFIG[GNS3_LAUNCHER_SERVERNAME]})\n"
    review_text+="NGINX_GNS3_PORT: ${CONFIG[NGINX_GNS3_PORT]}\n"
    review_text+="DOCKER_IMAGE: ${CONFIG[DOCKER_IMAGE]}\n"
    review_text+="INSTALL_GNS3: ${CONFIG[INSTALL_GNS3]}\n"

	if [[ "${CONFIG[INSTALL_GNS3]}" == "true" ]]; then
		review_text+="GNS3_INSTALL_METHOD: ${CONFIG[GNS3_INSTALL_METHOD]}\n"
		review_text+="GNS3_VERSION: ${CONFIG[GNS3_VERSION]}\n"
	fi
    
    if ! whiptail --title "Review Configuration" \
        --yesno "$review_text\nIs this correct?" \
        20 60; then
        return 1
    fi
    return 0
}

setup_docker_compose() {
    log_info "Setting up Docker Compose environment..."
    download_from_github "Docker/compose.yml" "$DEPLOY_DIR/compose.yml"
}

start_docker_compose() {
    log_info "Starting Docker containers..."
    local dc_cmd
    dc_cmd=$(docker_compose_cmd)
    
    if [[ -f "$DEPLOY_DIR/compose.yml" ]]; then
        cd "$DEPLOY_DIR"
        
        save_runtime_env

        $dc_cmd --env-file "$ENV_RUNTIME" -f compose.yml up -d
        log_success "Docker containers started"
        
        log_info "Waiting for containers to be ready..."
        sleep 10

        $dc_cmd --env-file "$ENV_RUNTIME" -f compose.yml ps
    else
        log_error "compose.yml not found in $DEPLOY_DIR"
        return 1
    fi
}

get_server_ip() {
    local ip
    ip=$(hostname -I | awk '{print $1}')
    echo "$ip"
}


show_summary() {
    local summary_text="Installation Complete!\n\n"
    summary_text+="Web Interface: https://$(get_server_ip):${CONFIG[WEB_PORT]}\n"
    summary_text+="GNS3 Reverse Proxy: https://$(get_server_ip):${CONFIG[NGINX_GNS3_PORT]}\n\n"
    
    show_info "Installation Summary" "$summary_text"
}

main() {
    log_info "IPCheckr Installation Script starting..."
    
    detect_distro
    
    check_whiptail
    check_docker
    load_existing_env
    seed_config_defaults
    resolve_branch
    
    show_intro
    
    local mode
    mode=$(show_mode_selection)
    
    case "$mode" in
        1)
            configure_basic
            ;;
        2)
            configure_advanced
            ;;
        *)
            log_error "Invalid selection"
            exit 1
            ;;
    esac
    
    while ! review_configuration; do
        case "$mode" in
            1) configure_basic ;;
            2) configure_advanced ;;
        esac
    done

    save_config_env
    
    log_success "Proceeding with installation..."
    
    ensure_connector_env
    setup_docker_compose

    if [[ "${CONFIG[INSTALL_GNS3]}" == "true" ]]; then
        run_gns3_setup
        update_gns3_port_config
        run_nginx_setup
    else
        log_info "GNS3 installation skipped by user choice"
    fi

    start_docker_compose
    
    show_summary
    
    log_success "Installation completed successfully!"
}
main "$@"