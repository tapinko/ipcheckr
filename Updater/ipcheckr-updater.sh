#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-6770}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/ipcheckr}"
ENV_FILE="${ENV_FILE:-${DEPLOY_DIR}/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-${DEPLOY_DIR}/compose.yml}"
COMPOSE_SERVICE="${COMPOSE_SERVICE:-ipcheckr}"

do_update() {
    if ! command -v docker &>/dev/null; then
        echo "ERR docker-not-found"
        return 1
    fi

    # Validate prerequisites before doing any work
    if [[ ! -f "${ENV_FILE}" ]]; then
        echo "ERR env-file-not-found: ${ENV_FILE}"
        return 1
    fi
    if [[ ! -f "${COMPOSE_FILE}" ]]; then
        echo "ERR compose-file-not-found: ${COMPOSE_FILE}"
        return 1
    fi

    local image
    image=$(grep '^DOCKER_IMAGE=' "${ENV_FILE}" 2>/dev/null | cut -d= -f2- | tr -d '[:space:]' | head -1 || true)
    image="${image:-tapinko/ipcheckr:latest}"

    # Save the currently running image for rollback
    local old_image
    old_image=$(docker inspect "${COMPOSE_SERVICE}" --format '{{.Config.Image}}' 2>/dev/null || true)

    echo "INFO Pulling ${image}..."
    local pull_out pull_ok=0
    pull_out=$(docker pull "$image" 2>&1) || pull_ok=$?
    while IFS= read -r line; do printf 'PULL %s\n' "$line"; done <<< "$pull_out"
    if [[ $pull_ok -ne 0 ]]; then
        echo "ERR pull-failed: ${image}"
        return 1
    fi

    echo "INFO Recreating ${COMPOSE_SERVICE}..."
    docker rm -f "${COMPOSE_SERVICE}" 2>/dev/null || true

    local compose_out compose_ok=0
    compose_out=$(docker compose \
        --project-directory "${DEPLOY_DIR}" \
        --env-file "${ENV_FILE}" \
        -f "${COMPOSE_FILE}" \
        up -d --force-recreate --no-deps "${COMPOSE_SERVICE}" 2>&1) || compose_ok=$?
    while IFS= read -r line; do printf 'COMPOSE %s\n' "$line"; done <<< "$compose_out"

    if [[ $compose_ok -ne 0 ]]; then
        echo "ERR compose-failed: ${COMPOSE_SERVICE}"
        if [[ -n "$old_image" ]]; then
            echo "INFO Rolling back to ${old_image}..."
            local rb_out rb_ok=0
            rb_out=$(DOCKER_IMAGE="${old_image}" docker compose \
                --project-directory "${DEPLOY_DIR}" \
                --env-file "${ENV_FILE}" \
                -f "${COMPOSE_FILE}" \
                up -d --no-deps "${COMPOSE_SERVICE}" 2>&1) || rb_ok=$?
            while IFS= read -r line; do printf 'ROLLBACK %s\n' "$line"; done <<< "$rb_out"
            if [[ $rb_ok -eq 0 ]]; then
                echo "INFO Rollback succeeded"
            else
                echo "ERR rollback-failed"
            fi
        fi
        return 1
    fi

    local installed_version
    installed_version=$(docker inspect "${COMPOSE_SERVICE}" \
        --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
        | grep '^APP_VERSION=' | cut -d= -f2 | tr -d '[:space:]' || true)
    if [[ -n "$installed_version" ]]; then
        echo "INFO Installed version: ${installed_version}"
    fi

    echo "OK DONE"
}

handle_connection() {
    while IFS= read -r line; do
        line="${line%$'\r'}"
        line="${line#"${line%%[![:space:]]*}"}"
        line="${line%"${line##*[![:space:]]}"}"
        [ -z "$line" ] && continue

        read -r cmd rest <<< "$line"
        cmd="${cmd,,}"

        case "$cmd" in
            update)
                do_update
                ;;
            ping)
                echo "PONG"
                ;;
            *)
                echo "ERR unknown-cmd: ${cmd}"
                ;;
        esac
    done
}

if [ "${1:-}" = "--handle" ]; then
    handle_connection
    exit 0
fi

# socat timeout is longer than the API timeout (300s) so the client always
# receives ERR/OK before the socket closes underneath it
exec socat -T 360 "tcp-listen:${PORT},reuseaddr,bind=0.0.0.0,fork" SYSTEM:"$0 --handle"