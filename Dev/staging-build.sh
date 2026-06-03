#!/usr/bin/env bash
# Builds a local staging Docker image from source and starts the full compose stack.
# Usage:
#   ./staging-build.sh             build + (re)start
#   ./staging-build.sh --build-only  build image only, do not touch compose
#   ./staging-build.sh --down        stop and remove staging containers

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ${NC} $*"; }
log_success() { echo -e "${GREEN}✓${NC} $*"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $*"; }
log_error()   { echo -e "${RED}✗${NC} $*"; }

MODE="run"
case "${1:-}" in
    --build-only) MODE="build-only" ;;
    --down)       MODE="down" ;;
    "") ;;
    *) log_error "Unknown option: ${1}"; echo "Usage: $0 [--build-only|--down]"; exit 1 ;;
esac

COMPOSE_FILE="$REPO_ROOT/Docker/compose.yml"
EXAMPLE_ENV="$SCRIPT_DIR/example-dev.env"
STAGING_ENV="$SCRIPT_DIR/.env.staging"
STAGING_IMAGE="tapinko/ipcheckr:staging"

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

detect_version() {
    # 1. exact git tag on HEAD
    local tag
    tag=$(git -C "$REPO_ROOT" describe --tags --exact-match 2>/dev/null || true)
    if [ -n "$tag" ]; then
        echo "$tag"; return
    fi

    local branch
    branch=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
    if [[ "$branch" =~ ^release/(.+)$ ]]; then
        echo "${BASH_REMATCH[1]}"; return
    fi

    local sha
    sha=$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")
    echo "dev-${sha}"
}

if [ "$MODE" = "down" ]; then
    if [ ! -f "$STAGING_ENV" ]; then
        log_warning "No staging env found at ${STAGING_ENV}, nothing to stop"
        exit 0
    fi
    dc=$(docker_compose_cmd)
    log_info "Stopping staging compose stack..."
    $dc --env-file "$STAGING_ENV" -f "$COMPOSE_FILE" down --remove-orphans
    log_success "Staging stack stopped"
    exit 0
fi

VERSION=$(detect_version)
log_info "Detected version: ${VERSION}"
log_info "Building Docker image ${STAGING_IMAGE} ..."

docker build \
    --build-arg APP_VERSION="$VERSION" \
    -t "$STAGING_IMAGE" \
    -f "$REPO_ROOT/Docker/Dockerfile" \
    "$REPO_ROOT"

log_success "Image built: ${STAGING_IMAGE} (APP_VERSION=${VERSION})"

if [ "$MODE" = "build-only" ]; then
    exit 0
fi

if [ ! -f "$STAGING_ENV" ]; then
    cp "$EXAMPLE_ENV" "$STAGING_ENV"
    log_info "Created ${STAGING_ENV} from example-dev.env — edit it if needed"
fi

if grep -q "^DOCKER_IMAGE=" "$STAGING_ENV"; then
    sed -i.bak "s|^DOCKER_IMAGE=.*|DOCKER_IMAGE=${STAGING_IMAGE}|" "$STAGING_ENV"
    rm -f "${STAGING_ENV}.bak"
else
    echo "DOCKER_IMAGE=${STAGING_IMAGE}" >> "$STAGING_ENV"
fi

dc=$(docker_compose_cmd)

log_info "Starting staging compose stack..."
$dc --env-file "$STAGING_ENV" -f "$COMPOSE_FILE" up -d --force-recreate --remove-orphans

log_info "Waiting for containers to start..."
sleep 5
$dc --env-file "$STAGING_ENV" -f "$COMPOSE_FILE" ps

WEB_PORT=$(grep '^WEB_PORT=' "$STAGING_ENV" | cut -d= -f2 | tr -d '[:space:]')
log_success "Staging stack running at https://localhost:${WEB_PORT:-8081}"
log_info "Logs: docker compose --env-file Dev/.env.staging -f Docker/compose.yml logs -f"
log_info "Stop:  ./Dev/staging-build.sh --down"