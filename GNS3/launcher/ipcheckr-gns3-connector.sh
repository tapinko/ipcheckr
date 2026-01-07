#!/usr/bin/env bash

set -euo pipefail

PORT="${PORT:-6769}"
CERT="${CERT:-/etc/ipcheckr/gns3/server.crt}"
KEY="${KEY:-/etc/ipcheckr/gns3/server.key}"
CA="${CA:-/etc/ipcheckr/gns3/ca.crt}"
GNS3_PORT="${GNS3_PORT:-3080}"
USE_TLS="${USE_TLS:-1}"

allocate_port() {
	local port
	while true; do
		port=$(( (RANDOM % 10000) + 20000 ))
		if ! ss -ltn 2>/dev/null | awk '{print $4}' | grep -q ":${port}$"; then
			echo "$port"
			return 0
		fi
	done
}

handle_connection() {
	while read -r line; do
		line=${line//$'\r'/}
		line=${line//$'\ufeff'/}
		line="${line#${line%%[![:space:]]*}}"
		line="${line%${line##*[![:space:]]}}"
		[ -z "$line" ] && continue

		set -- $line
		cmd="${1:-}"
		user="${2:-}"

		cmd="${cmd,,}"
		instance=$(systemd-escape -- "$user" 2>/dev/null || echo "$user" | sed 's/[^A-Za-z0-9._-]/-/g')
		[ -z "$instance" ] && { echo "ERR invalid-user"; continue; }

		if ! [[ "$user" =~ ^[A-Za-z0-9._-]{3,64}(@[A-Za-z0-9.-]+)?$ ]]; then
			echo "ERR invalid-user"; continue
		fi

		case "$cmd" in
			start)
				env_file="/var/lib/gns3/${instance}/env"
				instance_dir="/var/lib/gns3/${instance}"
				mkdir -p "${instance_dir}/projects"
				if systemctl is-active --quiet "gns3@${instance}.service"; then
					port=""
					[ -f "$env_file" ] && port=$(awk -F= '$1=="GNS3_PORT"{print $2}' "$env_file" | tr -d ' \n')
					pid=$(systemctl show -p MainPID --value "gns3@${instance}.service" 2>/dev/null | tr -d '\n')
					echo "OK RUNNING PORT=${port:-0} PID=${pid:-0}"; continue
				fi
				port=$(allocate_port)
				echo "GNS3_PORT=${port}" > "$env_file"
				chown gns3svc:gns3svc "$env_file" "${instance_dir}" "${instance_dir}/projects" 2>/dev/null || true
				if systemctl start "gns3@${instance}.service"; then
					sleep 0.2
					pid=$(systemctl show -p MainPID --value "gns3@${instance}.service" 2>/dev/null | tr -d '\n')
					echo "OK STARTED PORT=${port} PID=${pid:-0}"
				else
					echo "ERR start-failed"
				fi
				;;
			stop)
				if systemctl stop "gns3@${instance}.service"; then
					echo "OK STOPPED"
				else
					echo "ERR stop-failed"
				fi
				;;
			status)
				if systemctl is-active --quiet "gns3@${instance}.service"; then
					port=""
					if [ -f "/var/lib/gns3/${instance}/env" ]; then
						port=$(awk -F= '$1=="GNS3_PORT"{print $2}' "/var/lib/gns3/${instance}/env" | tr -d ' \n')
					fi
					pid=$(systemctl show -p MainPID --value "gns3@${instance}.service" 2>/dev/null | tr -d '\n')
					echo "OK RUNNING PORT=${port:-0} PID=${pid:-0}"
				else
					echo "OK STOPPED"
				fi
				;;
			*)
				echo "ERR unknown-cmd" ;;
		esac
	done
}

if [ "${1:-}" = "--handle" ]; then
	handle_connection
	exit 0
fi

if [ "${USE_TLS}" = "0" ]; then
	socat -T 60 tcp-listen:"${PORT}",reuseaddr,fork SYSTEM:"$0 --handle"
else
	socat -T 60 openssl-listen:"${PORT}",reuseaddr,cert="${CERT}",key="${KEY}",cafile="${CA}",verify=1,fork SYSTEM:"$0 --handle"
fi