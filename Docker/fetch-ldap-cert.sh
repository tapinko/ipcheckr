#!/bin/sh
set -e

LDAP_HOST="${LDAP_HOST}"
LDAP_PORT="${LDAP_PORT}"
LDAP_STARTTLS="${LDAP_STARTTLS}"
LDAP_FETCH_CERT="${LDAP_FETCH_CERT}"
CERT_FILE="/usr/local/share/ca-certificates/ldap-server.crt"

log() { printf '%s\n' "$*"; }
warn() { printf 'WARNING: %s\n' "$*"; }

if [ "$LDAP_FETCH_CERT" = "true" ]; then
  log "Fetching LDAP certificate from $LDAP_HOST:$LDAP_PORT (STARTTLS=$LDAP_STARTTLS) ..."
  if [ "$LDAP_STARTTLS" = "true" ]; then
    FETCH_CMD="openssl s_client -starttls ldap -connect ${LDAP_HOST}:${LDAP_PORT} -showcerts"
  else
    FETCH_CMD="openssl s_client -connect ${LDAP_HOST}:${LDAP_PORT} -showcerts -servername ${LDAP_HOST}"
  fi

  if $FETCH_CMD </dev/null 2>/dev/null | sed -n '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/p' > "$CERT_FILE.tmp"; then
    if [ -s "$CERT_FILE.tmp" ]; then
      mv "$CERT_FILE.tmp" "$CERT_FILE"
      chmod 644 "$CERT_FILE"
      if update-ca-certificates 2>/dev/null; then
        log "LDAP certificate(s) installed into trust store."
      else
        warn "update-ca-certificates failed (continuing)."
      fi
    else
      warn "No certificate data captured; continuing without installing."
      rm -f "$CERT_FILE.tmp"
    fi
  else
    warn "OpenSSL fetch failed; continuing without installing certificate."
    rm -f "$CERT_FILE.tmp" 2>/dev/null || true
  fi
fi

exec dotnet IPCheckr.Api.dll