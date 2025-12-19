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
	PKG="nginx"
	if [ "$USE_VERSION" -eq 1 ]; then
		PKG="nginx=${VERSION}"
	fi
	sudo apt-get install -y "$PKG"
}

install_ubuntu() {
	install_debian
}

install_fedora() {
	PKG="nginx"
	if [ "$USE_VERSION" -eq 1 ]; then
		PKG="nginx-${VERSION}"
	fi
	sudo dnf install -y "$PKG"
}

install_rhel() {
	sudo yum install -y epel-release
	PKG="nginx"
	if [ "$USE_VERSION" -eq 1 ]; then
		PKG="nginx-${VERSION}"
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

echo "nginx ${VERSION} installation complete for ${DISTRO}."