#!/bin/bash
set -euo pipefail

LDAP_HOST="${LDAP_HOST}"
<<<<<<< HEAD
LDAP_PORT="${LDAP_PORT}"
LDAP_STARTTLS="${LDAP_STARTTLS}"
LDAP_FETCH_CERT="${LDAP_FETCH_CERT}"
CERT_FILE="/usr/local/share/ca-certificates/ldap-server.crt"
LDAP_PORT="${LDAP_PORT:-636}"
LDAP_STARTTLS="${LDAP_STARTTLS}"
LDAP_FETCH_CERT="${LDAP_FETCH_CERT}"
CERT_DIR="/usr/local/share/ca-certificates"
REQCERT_MODE="${LDAP_TLS_REQCERT:-demand}"   # demand|allow|try|never
TLS_DEBUG="${LDAP_TLS_DEBUG:-false}"

log() { printf '%s\n' "$*"; }
warn() { printf 'WARNING: %s\n' "$*"; }

fetch_and_install() {
  local cmd
  if [ "$LDAP_STARTTLS" = "true" ]; then
    cmd="openssl s_client -starttls ldap -connect ${LDAP_HOST}:${LDAP_PORT} -showcerts -servername ${LDAP_HOST}"
  else
    cmd="openssl s_client -connect ${LDAP_HOST}:${LDAP_PORT} -showcerts -servername ${LDAP_HOST}"
  fi

  if ! eval "$cmd" </dev/null 2>/dev/null > /tmp/ldap_s_client.out; then
    warn "OpenSSL connection failed; skipping certificate import"
    return 0
  fi
  awk -v dir="$CERT_DIR" 'BEGIN{c=0;inside=0} \
    /-----BEGIN CERTIFICATE-----/{inside=1;c++;file=sprintf("%s/ldap-chain-%d.crt",dir,c)} \
    {if(inside) print >> file} \
    /-----END CERTIFICATE-----/{inside=0}' /tmp/ldap_s_client.out
  local count=$(ls -1 $CERT_DIR/ldap-chain-*.crt 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" -eq 0 ]; then
    sed -n '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/p' /tmp/ldap_s_client.out > "$CERT_DIR/ldap-chain-1.crt" || true
    if [ -s "$CERT_DIR/ldap-chain-1.crt" ]; then
      count=1
    else
      warn "No certificates parsed from server output"
      return 0
    fi
  fi
  for f in $CERT_DIR/ldap-chain-*.crt; do chmod 644 "$f"; done
  if update-ca-certificates 2>/dev/null; then
    log "Imported $count LDAP certificate(s) into system trust store"
  else
    warn "update-ca-certificates failed (continuing)"
  fi
}

if [ "$LDAP_FETCH_CERT" = "true" ] && [ -n "$LDAP_HOST" ]; then
  log "Attempting LDAP certificate fetch from $LDAP_HOST:$LDAP_PORT (STARTTLS=$LDAP_STARTTLS)"
  fetch_and_install
else
  log "LDAP certificate fetch disabled or host not set"
fi

mkdir -p /etc/ldap
cat > /etc/ldap/ldap.conf <<EOF
TLS_CACERT /etc/ssl/certs/ca-certificates.crt
TLS_REQCERT ${REQCERT_MODE}
EOF
log "OpenLDAP TLS config: TLS_REQCERT=${REQCERT_MODE} (file: /etc/ldap/ldap.conf)"

if [ "$TLS_DEBUG" = "true" ] && [ -n "$LDAP_HOST" ]; then
  log "TLS debug: openssl s_client handshake to ${LDAP_HOST}:${LDAP_PORT} (STARTTLS=${LDAP_STARTTLS})"
  if [ "$LDAP_STARTTLS" = "true" ]; then
    openssl s_client -brief -state -status -starttls ldap -connect "${LDAP_HOST}:${LDAP_PORT}" -servername "$LDAP_HOST" </dev/null || true
  else
    openssl s_client -brief -state -status -connect "${LDAP_HOST}:${LDAP_PORT}" -servername "$LDAP_HOST" </dev/null || true
  fi
fi

exec dotnet IPCheckr.Api.dll