#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 4 ]; then
	echo "Usage: $0 <gns3-version> <distro> <branch> <install-method>" >&2
	exit 1
fi

GNS3_VERSION="$1"
DISTRO="$2"
BRANCH="$3"
INSTALL_METHOD="$4"

BASE_URL="https://raw.githubusercontent.com/tapinko/ipcheckr/${BRANCH}/GNS3/launcher"
CONNECTOR_URL="${BASE_URL}/ipcheckr-gns3-connector.sh"
INSTALLER_URL="${BASE_URL}/scripts/gns3-install.sh"
GNS3_UNIT_URL="${BASE_URL}/systemd/gns3@.service"
SERVICE_URL="${BASE_URL}/systemd/ipcheckr-gns3.service"
SOCKET_URL="${BASE_URL}/systemd/ipcheckr-gns3.socket"
CONNECTOR_TMP="/tmp/ipcheckr-gns3-connector.sh"
INSTALLER_TMP="/tmp/gns3-install.sh"
GNS3_UNIT_PATH="/etc/systemd/system/gns3@.service"
SERVICE_PATH="/etc/systemd/system/ipcheckr-gns3.service"
SOCKET_PATH="/etc/systemd/system/ipcheckr-gns3.socket"
CONNECTOR_PATH="/usr/local/bin/ipcheckr-gns3-connector"
SERVICE_USER="gns3svc"
SERVICE_HOME="/var/lib/gns3"
CERT_DIR="/etc/ipcheckr/gns3"

generate_gns3_certs() {
	local ca_key="${CERT_DIR}/ca.key"
	local ca_crt="${CERT_DIR}/ca.crt"
	local srv_key="${CERT_DIR}/server.key"
	local srv_crt="${CERT_DIR}/server.crt"
	local csr="${CERT_DIR}/server.csr"
	local host_fqdn host_short
	host_fqdn=$(hostname -f 2>/dev/null || hostname 2>/dev/null || echo "ipcheckr-gns3")
	host_short=$(hostname -s 2>/dev/null || echo "$host_fqdn")
	local host_ip
	host_ip=$(hostname -I 2>/dev/null | awk '{print $1}' | tr -d ' \t' || true)
	[ -z "$host_ip" ] && host_ip="127.0.0.1"

	if [ -f "$srv_key" ] && [ -f "$srv_crt" ] && [ -f "$ca_crt" ]; then
		if openssl x509 -in "$srv_crt" -noout -text 2>/dev/null | grep -qi "host.docker.internal" \
			&& openssl x509 -in "$srv_crt" -noout -text 2>/dev/null | grep -qi "$host_fqdn" \
			&& openssl x509 -in "$srv_crt" -noout -text 2>/dev/null | grep -qi "$host_ip"; then
			echo "GNS3 certs already present in $CERT_DIR (SANs OK)"
			return 0
		fi

		echo "Existing GNS3 certs missing required SANs; regenerating..."
		sudo rm -f "$srv_key" "$srv_crt" "$ca_key" "$ca_crt" 2>/dev/null || true
	fi

	sudo mkdir -p "$CERT_DIR"

	local tmp_conf
	tmp_conf=$(mktemp)
	cat >"$tmp_conf" <<EOF
[ ca ]
default_ca = ca_default

[ ca_default ]
default_md = sha384

[ req ]
distinguished_name = dn
prompt = no

[ dn ]
CN = ipcheckr-gns3

[ ca_ext ]
basicConstraints = critical,CA:TRUE,pathlen:0
keyUsage = critical,keyCertSign,cRLSign
subjectKeyIdentifier = hash

[ srv_ext ]
basicConstraints = CA:FALSE
keyUsage = critical,digitalSignature,keyEncipherment
extendedKeyUsage = serverAuth
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer
subjectAltName = @alt_names

[ alt_names ]
DNS.1 = localhost
DNS.2 = ${host_fqdn}
DNS.3 = ${host_short}
DNS.4 = host.docker.internal
IP.1 = 127.0.0.1
IP.2 = ${host_ip}
EOF

	sudo openssl req -x509 -newkey rsa:4096 -sha384 -days 825 -nodes \
		-keyout "$ca_key" -out "$ca_crt" -subj "/CN=ipcheckr-gns3 CA" \
		-addext "basicConstraints=critical,CA:TRUE,pathlen:0" \
		-addext "keyUsage=critical,keyCertSign,cRLSign" \
		-addext "subjectKeyIdentifier=hash"

	sudo openssl req -new -newkey rsa:4096 -sha384 -nodes -keyout "$srv_key" -out "$csr" -config "$tmp_conf"
	sudo openssl x509 -req -in "$csr" -CA "$ca_crt" -CAkey "$ca_key" -CAcreateserial -out "$srv_crt" -days 397 -sha384 \
		-extfile "$tmp_conf" -extensions srv_ext
	sudo rm -f "$csr"
	sudo chmod 640 "$srv_key" "$srv_crt" "$ca_crt" "$ca_key" 2>/dev/null || true
	sudo chown root:root "$srv_key" "$srv_crt" "$ca_crt" "$ca_key" 2>/dev/null || true
	rm -f "$tmp_conf"
}

sudo apt-get update && sudo apt-get install -y socat openssl

if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
	sudo useradd --system --home "$SERVICE_HOME" --shell /usr/sbin/nologin "$SERVICE_USER"
fi
sudo mkdir -p "$SERVICE_HOME"
sudo chown -R "$SERVICE_USER":"$SERVICE_USER" "$SERVICE_HOME"
curl -fsSL -o "$CONNECTOR_TMP" "$CONNECTOR_URL"
sudo install -m 0755 "$CONNECTOR_TMP" "$CONNECTOR_PATH"

curl -fsSL -o "$INSTALLER_TMP" "$INSTALLER_URL"
chmod +x "$INSTALLER_TMP"
"$INSTALLER_TMP" "$GNS3_VERSION" "$DISTRO" "$INSTALL_METHOD"

curl -fsSL -o "$SERVICE_PATH" "$SERVICE_URL"
curl -fsSL -o "$SOCKET_PATH" "$SOCKET_URL"
curl -fsSL -o "$GNS3_UNIT_PATH" "$GNS3_UNIT_URL"
sudo chmod 644 "$SERVICE_PATH" "$SOCKET_PATH" "$GNS3_UNIT_PATH"

generate_gns3_certs

sudo sed -i 's|/usr/local/bin/ipcheckr-gns3-launcher|/usr/local/bin/ipcheckr-gns3-connector|g' "$SERVICE_PATH"

sudo sed -i "s|^User=.*|User=${SERVICE_USER}|g" "$GNS3_UNIT_PATH"
sudo sed -i "s|^Group=.*|Group=${SERVICE_USER}|g" "$GNS3_UNIT_PATH"

sudo groupadd -f ipcheckr

sudo systemctl daemon-reload
sudo systemctl stop ipcheckr-gns3.socket ipcheckr-gns3.service 2>/dev/null || true
sudo systemctl disable --now ipcheckr-gns3.socket 2>/dev/null || true
sudo systemctl mask ipcheckr-gns3.socket 2>/dev/null || true
sudo rm -f /etc/systemd/system/sockets.target.wants/ipcheckr-gns3.socket 2>/dev/null || true
sudo systemctl enable --now ipcheckr-gns3.service