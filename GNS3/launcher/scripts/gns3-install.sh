#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 3 ]; then
	echo "Usage: $0 <gns3-version|--no-version|-nv> <distro> <install-method>" >&2
	exit 1
fi

USE_VERSION=1
if [ "$1" = "-nv" ] || [ "$1" = "--no-version" ]; then
	USE_VERSION=0
	VERSION=""
else
	VERSION="$1"
fi

DISTRO="$(echo "$2" | tr '[:upper:]' '[:lower:]')"
INSTALL_METHOD="$3"

install_debian() {
	sudo apt-get update -y
	if [ "$INSTALL_METHOD" = "pypi" ]; then
		sudo apt-get install -y python3 python3-venv python3-pip || true
		local pkg="gns3-server"
		[ "$USE_VERSION" -eq 1 ] && pkg="${pkg}==${VERSION}"
		local pip_args=("install" "--upgrade" "--ignore-installed")
		if python3 -m pip install --help 2>/dev/null | grep -q -- '--break-system-packages'; then
			pip_args+=("--break-system-packages")
		fi
		pip_args+=("$pkg")
		if python3 -m pip "${pip_args[@]}"; then
			echo "Installed ${pkg} via PyPI"
			return 0
		fi
		echo "PyPI install failed; falling back to repo method" >&2
	fi

	sudo apt-get install -y software-properties-common
	sudo add-apt-repository -y ppa:gns3/ppa
	sudo apt-get update -y
	PKG="gns3-server"
	if [ "$USE_VERSION" -eq 1 ]; then
		PKG="gns3-server=${VERSION}"
	fi
	if sudo apt-get install -y "$PKG"; then
		return 0
	fi
	if [ "$USE_VERSION" -eq 1 ]; then
		echo "Repo install failed for ${PKG}; retrying unpinned" >&2
		sudo apt-get install -y gns3-server
	fi
}

install_ubuntu() {
	install_debian
}

install_fedora() {
	sudo dnf install -y dnf-plugins-core
	if [ "$INSTALL_METHOD" = "pypi" ]; then
		sudo dnf install -y python3 python3-pip || true
		local pkg="gns3-server"
		[ "$USE_VERSION" -eq 1 ] && pkg="${pkg}==${VERSION}"
		local pip_args=("install" "--upgrade" "--ignore-installed")
		pip_args+=("$pkg")
		if python3 -m pip install --help 2>/dev/null | grep -q -- '--break-system-packages'; then
			pip_args+=("--break-system-packages")
		fi
		if python3 -m pip "${pip_args[@]}"; then
			echo "Installed ${pkg} via PyPI"
			return 0
		fi
		echo "PyPI install failed; falling back to repo method" >&2
	fi

	REPO_URL="https://download.gns3.com/repos/fedora/gns3.repo"
	REPO_PATH="/etc/yum.repos.d/gns3.repo"
	if ! curl -fsSL --retry 3 --retry-delay 2 "$REPO_URL" | sudo tee "$REPO_PATH" >/dev/null; then
		echo "Warning: could not fetch $REPO_URL; attempting install from existing repos" >&2
	fi
	PKG="gns3-server"
	if [ "$USE_VERSION" -eq 1 ]; then
		PKG="gns3-server-${VERSION}"
	fi
	if sudo dnf install -y "$PKG"; then
		return 0
	fi
	if [ "$USE_VERSION" -eq 1 ]; then
		echo "Repo install failed for ${PKG}; retrying unpinned" >&2
		sudo dnf install -y gns3-server
	fi
}

install_rhel() {
	sudo yum install -y epel-release
	if [ "$INSTALL_METHOD" = "pypi" ]; then
		sudo yum install -y python3 python3-pip || true
		local pkg="gns3-server"
		[ "$USE_VERSION" -eq 1 ] && pkg="${pkg}==${VERSION}"
		local pip_args=("install" "--upgrade" "--ignore-installed")
		pip_args+=("$pkg")
		if python3 -m pip install --help 2>/dev/null | grep -q -- '--break-system-packages'; then
			pip_args+=("--break-system-packages")
		fi
		if python3 -m pip "${pip_args[@]}"; then
			echo "Installed ${pkg} via PyPI"
			return 0
		fi
		echo "PyPI install failed; falling back to repo method" >&2
	fi

	sudo yum install -y https://download.gns3.com/repos/centos/gns3.repo
	PKG="gns3-server"
	if [ "$USE_VERSION" -eq 1 ]; then
		PKG="gns3-server-${VERSION}"
	fi
	if sudo yum install -y "$PKG"; then
		return 0
	fi
	if [ "$USE_VERSION" -eq 1 ]; then
		echo "Repo install failed for ${PKG}; retrying unpinned" >&2
		sudo yum install -y gns3-server
	fi
}

install_centos() {
	install_rhel
}

install_repo() {
	case "$DISTRO" in
		debian|debian-*) install_debian ;;
		ubuntu|ubuntu-*) install_ubuntu ;;
		fedora|fedora-*) install_fedora ;;
		centos|centos-*) install_centos ;;
		rhel|redhat|redhat-*) install_rhel ;;
		*) echo "Unsupported distro for repo install: ${DISTRO}" >&2; return 1 ;;
	esac
}

if install_repo; then
	echo "GNS3 ${VERSION:-latest} installation complete for ${DISTRO} (method=${INSTALL_METHOD})."
	exit 0
fi

echo "GNS3 installation failed for ${DISTRO}" >&2
exit 1