#!/usr/bin/env bash
# Install the Material GitLab package inside a WSL Ubuntu 24.04 distro on Windows.
#
# Run this INSIDE the distro, as root:
#   bash wsl-install.sh <package.deb or release asset URL> [external-url] [password-file]
#
#   package        a local .deb path, or the release asset URL to download it from
#   external-url   what the instance advertises; default http://localhost:8929, which
#                  Windows reaches through WSL2 localhost forwarding
#   password-file  a mode-600 file holding the first root password; without it the
#                  package generates one in /etc/gitlab/initial_root_password and deletes
#                  that file after 24 hours
#
# It installs the package's Debian dependencies, verifies the download against the
# SHA256SUMS.txt published beside it when the package came from a release, installs the
# package with EXTERNAL_URL set so the first reconfigure runs, waits for the health
# endpoint, and prints the version and sign-in URL. It never prints the password.
#
# One WSL2 fact worth knowing before you rely on this instance: WSL stops a distro a few
# seconds after its last foreground command exits, which stops GitLab with it. Keep a
# shell open in the distro, or run `wsl -d <distro> -- sleep infinity` from Windows, for
# as long as the instance must stay up.

set -euo pipefail

package="${1:?usage: wsl-install.sh <package.deb or URL> [external-url] [password-file]}"
external_url="${2:-http://localhost:8929}"
password_file="${3:-}"

log() { printf '%s\n' "$*"; }
die() { printf 'wsl-install: %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" = "0" ] || die "run as root inside the distro"
grep -q 'VERSION_ID="24.04"' /etc/os-release || die "this package is built for Ubuntu 24.04; this distro is $(grep PRETTY_NAME /etc/os-release)"

export DEBIAN_FRONTEND=noninteractive
apt-get update -q >/dev/null
apt-get install -y -q curl openssh-server ca-certificates tzdata perl >/dev/null
log "dependencies present"

workdir=/root/material-gitlab
mkdir -p "$workdir"
case "$package" in
  http://*|https://*)
    name="$(basename "$package")"
    deb="$workdir/$name"
    log "downloading $name"
    curl -fL --progress-bar -o "$deb" "$package"
    sums_url="${package%/*}/SHA256SUMS.txt"
    if curl -fsSL -o "$workdir/SHA256SUMS.txt" "$sums_url"; then
      (cd "$workdir" && grep " $name\$" SHA256SUMS.txt | sha256sum -c -) || die "digest mismatch against the release SHA256SUMS.txt"
      log "digest verified against the release"
    else
      log "no SHA256SUMS.txt beside the package; digest not verified"
    fi
    ;;
  *)
    deb="$package"
    [ -f "$deb" ] || die "no such file: $deb"
    ;;
esac

if [ -n "$password_file" ]; then
  [ -s "$password_file" ] || die "password file is missing or empty: $password_file"
  root_password="$(tr -d '\r\n' < "$password_file")"
else
  root_password=""
fi

log "installing $(basename "$deb") with EXTERNAL_URL=$external_url"
if [ -n "$root_password" ]; then
  EXTERNAL_URL="$external_url" GITLAB_ROOT_PASSWORD="$root_password" dpkg -i "$deb"
else
  EXTERNAL_URL="$external_url" dpkg -i "$deb"
fi
unset root_password

log "waiting for the instance to answer (up to 15 minutes)"
healthy=0
for _ in $(seq 1 90); do
  if curl -fsS -o /dev/null --max-time 5 "$external_url/-/health"; then healthy=1; break; fi
  sleep 10
done
[ "$healthy" = "1" ] || { gitlab-ctl status || true; die "the instance did not answer $external_url/-/health"; }

version="$(cat /opt/gitlab/embedded/service/gitlab-rails/VERSION)"
log "healthy"
log "version: $version (package $(dpkg-query -W -f='${Version}' gitlab-ce 2>/dev/null || echo unknown))"
log "sign in: $external_url as root"
if [ -z "$password_file" ]; then
  log "read the generated password within 24 hours: cat /etc/gitlab/initial_root_password"
fi
