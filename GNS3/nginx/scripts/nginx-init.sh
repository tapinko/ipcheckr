#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 5 ]; then
	exit 1
fi

NGINX_VERSION="$1"
DISTRO="$2"
BRANCH="$3"
LISTEN_PORT="$4"
WEB_PORT="$5"

BASE_URL="https://raw.githubusercontent.com/tapinko/ipcheckr/${BRANCH}/GNS3/nginx"
INSTALLER_URL="${BASE_URL}/scripts/nginx-install.sh"
INSTALLER_TMP="/tmp/nginx-install.sh"
CONF_TMP="/tmp/ipcheckr-gns3.conf"
CONF_TARGET="/etc/nginx/conf.d/ipcheckr-gns3.conf"

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

deploy_nginx_conf() {
	curl -fsSL -o "$CONF_TMP" "${BASE_URL}/ipcheckr-gns3.conf"
	sudo mkdir -p "$(dirname "$CONF_TARGET")"
	sudo sed \
		-e "s/__NGINX_PORT__/${LISTEN_PORT}/g" \
		-e "s/__WEB_PORT__/${WEB_PORT}/g" \
		"$CONF_TMP" | sudo tee "$CONF_TARGET" >/dev/null
	sudo nginx -t
	sudo systemctl restart nginx
}

curl -fsSL -o "$INSTALLER_TMP" "$INSTALLER_URL"
chmod +x "$INSTALLER_TMP"
"$INSTALLER_TMP" "$NGINX_VERSION" "$DISTRO"
generate_nginx_certs
deploy_nginx_conf