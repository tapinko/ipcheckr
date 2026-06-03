#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-6770}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/ipcheckr}"
ENV_FILE="${ENV_FILE:-${DEPLOY_DIR}/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-${DEPLOY_DIR}/compose.yml}"
COMPOSE_SERVICE="${COMPOSE_SERVICE:-ipcheckr}"

do_update() {
    local image=""

    if [ -f "${ENV_FILE}" ]; then
        image=$(grep '^DOCKER_IMAGE=' "${ENV_FILE}" 2>/dev/null | cut -d= -f2- | tr -d '[:space:]' | head -1 || true)
    fi
    image="${image:-tapinko/ipcheckr:latest}"

    echo "INFO Pulling ${image}..."
    while IFS= read -r line; do
        printf 'PULL %s\n' "$line"
    done < <(docker pull "$image" 2>&1) || {
        echo "ERR pull-failed"
        return 1
    }

    echo "INFO Recreating ${COMPOSE_SERVICE}..."
    while IFS= read -r line; do
        printf 'COMPOSE %s\n' "$line"
    done < <(
        docker compose \
            --env-file "${ENV_FILE}" \
            -f "${COMPOSE_FILE}" \
            up -d --force-recreate --no-deps "${COMPOSE_SERVICE}" 2>&1
    )

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
                echo "ERR unknown-cmd"
                ;;
        esac
    done
}

if [ "${1:-}" = "--handle" ]; then
    handle_connection
    exit 0
fi

exec socat -T 300 "tcp-listen:${PORT},reuseaddr,bind=0.0.0.0,fork" SYSTEM:"$0 --handle"