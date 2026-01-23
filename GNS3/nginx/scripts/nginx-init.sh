#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 2 ]; then
	exit 1
fi

NGINX_VERSION="$1"
DISTRO="$2"

INSTALLER_URL="https://raw.githubusercontent.com/tapinko/ipcheckr/master/GNS3/nginx/scripts/nginx-install.sh"
INSTALLER_TMP="/tmp/nginx-install.sh"

generate_nginx_certs() {
	local cert_dir="/etc/ipcheckr/nginx"
	local ca_key="${cert_dir}/ipcheckr-ca.key"
	local ca_crt="${cert_dir}/ipcheckr-ca.crt"
	local srv_key="${cert_dir}/ipcheckr.key"
	local srv_crt="${cert_dir}/ipcheckr.crt"
	local csr="${cert_dir}/ipcheckr.csr"

	sudo mkdir -p "$cert_dir"
	if [ -f "$srv_key" ] && [ -f "$srv_crt" ] && [ -f "$ca_crt" ]; then
		echo "nginx certs already present in $cert_dir"
		return 0
	fi

	local tmp_conf
	tmp_conf=$(mktemp)
	cat >"$tmp_conf" <<'EOF'
[req]
distinguished_name = dn
prompt = no

[dn]
CN = ipcheckr.local

[ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = ipcheckr.local
IP.1 = 127.0.0.1
EOF

	sudo openssl req -x509 -newkey rsa:4096 -sha384 -days 825 -nodes -keyout "$ca_key" -out "$ca_crt" -subj "/CN=ipcheckr CA"
	sudo openssl req -new -newkey rsa:4096 -sha384 -nodes -keyout "$srv_key" -out "$csr" -config "$tmp_conf"
	sudo openssl x509 -req -in "$csr" -CA "$ca_crt" -CAkey "$ca_key" -CAcreateserial -out "$srv_crt" -days 397 -sha384 -extfile "$tmp_conf" -extensions ext
	sudo rm -f "$csr"
	sudo chmod 640 "$srv_key" "$srv_crt" "$ca_crt" "$ca_key" 2>/dev/null || true
	sudo chown root:root "$srv_key" "$srv_crt" "$ca_crt" "$ca_key" 2>/dev/null || true
	rm -f "$tmp_conf"
}

curl -fsSL -o "$INSTALLER_TMP" "$INSTALLER_URL"
chmod +x "$INSTALLER_TMP"
"$INSTALLER_TMP" "$NGINX_VERSION" "$DISTRO"
generate_nginx_certs