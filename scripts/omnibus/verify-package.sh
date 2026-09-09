#!/usr/bin/env bash
# Verify that a real package of THIS fork was produced, and record its digest.
#
# Usage: verify-package.sh <pkg-dir> <expected-version>
#
# A green omnibus exit proves that omnibus exited green. This script opens the package and
# checks that it carries the fork's own application tree, that the musl binaries which
# failed run 34239883194 are gone, and that the VERSION inside matches the tree that was
# meant to be packaged. It writes SHA256SUMS.txt beside the package.

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

pkg_dir="${1:?usage: verify-package.sh <pkg-dir> <expected-version>}"
expected_version="${2:?usage: verify-package.sh <pkg-dir> <expected-version>}"

shopt -s nullglob
debs=("$pkg_dir"/*.deb)
if [ ${#debs[@]} -ne 1 ]; then
  die "expected exactly one .deb in $pkg_dir, found ${#debs[@]}. Nothing will be published."
fi
deb="${debs[0]}"
log "=== $deb ==="
ls -l "$deb"
dpkg-deb --info "$deb" | head -20

listing="$(mktemp)"
dpkg-deb --fsys-tarfile "$deb" | tar -t > "$listing"
rails_root='./opt/gitlab/embedded/service/gitlab-rails'

grep -qx "$rails_root/app/assets/javascripts/material_system/components/register.js" "$listing" \
  || die "the package does not carry app/assets/javascripts/material_system/components/register.js, so it is not this fork"
webpack_files="$(grep -c "^$rails_root/public/assets/webpack/" "$listing" || true)"
log "compiled webpack files in package: $webpack_files"
if [ "$webpack_files" -lt 1000 ]; then
  die "only $webpack_files webpack files are in the package; asset compilation did not land"
fi
if grep -n 'linux-x64-musl' "$listing" | head -5; then
  die "musl-linked node binaries are still inside the package; the frontend-islands cleanup did not run"
fi

version_in_deb="$(dpkg-deb --fsys-tarfile "$deb" | tar -xO "$rails_root/VERSION" | tr -d '[:space:]')"
if [ "$version_in_deb" != "$expected_version" ]; then
  die "VERSION inside the package is '$version_in_deb', expected '$expected_version'"
fi

sha="$(sha256sum "$deb" | awk '{print $1}')"
bytes="$(stat -c %s "$deb")"
name="$(basename "$deb")"
printf '%s  %s\n' "$sha" "$name" > "$pkg_dir/SHA256SUMS.txt"
log "SHA-256 $sha  $name  ($bytes bytes)"

emit_output deb_count 1
emit_output deb_path "$deb"
emit_output deb_name "$name"
emit_output deb_sha256 "$sha"
emit_output deb_bytes "$bytes"
emit_output webpack_files "$webpack_files"
