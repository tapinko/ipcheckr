#!/usr/bin/env bash
# Runs the same checks as the CI quality pipeline, locally.
# Usage:
#   ./Dev/ci-check.sh              run all checks (frontend + backend + docker)
#   ./Dev/ci-check.sh --skip-docker  skip the slow Docker build
#
# To install as a git pre-push hook so it runs automatically on every push:
#   ln -sf ../../Dev/ci-check.sh .git/hooks/pre-push

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}▶${NC} $*"; }
log_success() { echo -e "${GREEN}✓${NC} $*"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $*"; }
log_error()   { echo -e "${RED}✗${NC} $*"; }
log_header()  { echo -e "\n${BOLD}$*${NC}"; }

SKIP_DOCKER=false
case "${1:-}" in
    --skip-docker) SKIP_DOCKER=true ;;
    "") ;;
    *) log_error "Unknown option: ${1}"; echo "Usage: $0 [--skip-docker]"; exit 1 ;;
esac

RESULTS=()
FAILED=false

run_step() {
    local label="$1"; shift
    local start=$SECONDS
    log_info "$label..."
    if "$@"; then
        local elapsed=$(( SECONDS - start ))
        log_success "$label (${elapsed}s)"
        RESULTS+=("${GREEN}✓${NC}  $label")
    else
        log_error "$label FAILED"
        RESULTS+=("${RED}✗${NC}  $label")
        FAILED=true
    fi
}

log_header "CLIENT"

CLIENT_DIR="$REPO_ROOT/Src/IPCheckr.Client"

run_step "npm ci" \
    bash -c "cd '$CLIENT_DIR' && npm ci --prefer-offline 2>&1"

run_step "npm run lint" \
    bash -c "cd '$CLIENT_DIR' && npm run lint 2>&1"

run_step "npm run test" \
    bash -c "cd '$CLIENT_DIR' && npm run test 2>&1"

run_step "npm run build" \
    bash -c "cd '$CLIENT_DIR' && npm run build 2>&1"

log_header "API"

SLN="$REPO_ROOT/Src/IPCheckr.Api/IPCheckr.Api.sln"

run_step "dotnet restore" \
    dotnet restore "$SLN"

run_step "dotnet build (Release)" \
    dotnet build "$SLN" --configuration Release --no-restore

run_step "dotnet test (Release)" \
    dotnet test "$SLN" --configuration Release --no-build

log_header "DOCKER"

if [ "$SKIP_DOCKER" = true ]; then
    log_warning "Docker build skipped (--skip-docker)"
    RESULTS+=("${YELLOW}–${NC}  Docker build (skipped)")
else
    # DOCKER_BUILDKIT=0 uses the classic builder which avoids the MCR 403 that
    # Buildx's container driver triggers when pre-fetching image manifests.
    run_step "docker build (dry run)" \
        bash -c "DOCKER_BUILDKIT=0 docker build \
            --build-arg APP_VERSION=ci-check \
            -t ipcheckr:ci-check \
            -f '$REPO_ROOT/Docker/Dockerfile' \
            '$REPO_ROOT' 2>&1"
fi

echo ""
echo -e "${BOLD}FINAL${NC}"
for r in "${RESULTS[@]}"; do
    echo -e "  $r"
done
echo -e "${BOLD}──────────────────────────────────────────────────────${NC}"

if [ "$FAILED" = true ]; then
    echo -e "\n${RED}${BOLD}Pipeline FAILED — fix the errors above before pushing.${NC}\n"
    exit 1
else
    echo -e "\n${GREEN}${BOLD}All checks passed — safe to push.${NC}\n"
fi