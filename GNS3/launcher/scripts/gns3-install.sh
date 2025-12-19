#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 2 ]; then
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

install_debian() {
	sudo apt-get update -y
	sudo apt-get install -y software-properties-common
	sudo add-apt-repository -y ppa:gns3/ppa
	sudo apt-get update -y
	PKG="gns3-server"
	if [ "$USE_VERSION" -eq 1 ]; then
		PKG="gns3-server=${VERSION}"
	fi
	sudo apt-get install -y "$PKG"
}

install_ubuntu() {
	install_debian
}

install_fedora() {
	sudo dnf install -y dnf-plugins-core
	REPO_URL="https://download.gns3.com/repos/fedora/gns3.repo"
	REPO_PATH="/etc/yum.repos.d/gns3.repo"
	if ! curl -fsSL --retry 3 --retry-delay 2 "$REPO_URL" | sudo tee "$REPO_PATH" >/dev/null; then
		echo "Warning: could not fetch $REPO_URL; attempting install from existing repos" >&2
	fi
	PKG="gns3-server"
	if [ "$USE_VERSION" -eq 1 ]; then
		PKG="gns3-server-${VERSION}"
	fi
	sudo dnf install -y "$PKG"
}

install_rhel() {
	sudo yum install -y epel-release
	sudo yum install -y https://download.gns3.com/repos/centos/gns3.repo
	PKG="gns3-server"
	if [ "$USE_VERSION" -eq 1 ]; then
		PKG="gns3-server-${VERSION}"
	fi
	sudo yum install -y "$PKG"
}

case "$DISTRO" in
	debian|debian-*) install_debian ;;
	ubuntu|ubuntu-*) install_ubuntu ;;
	fedora|fedora-*) install_fedora ;;
	centos|centos-*) install_centos ;;
	rhel|redhat|redhat-*) install_rhel ;;
esac

echo "GNS3 ${VERSION} installation complete for ${DISTRO}."