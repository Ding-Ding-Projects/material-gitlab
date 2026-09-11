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

# Evidence that this is the fork has to be something a package can actually contain.
# omnibus-gitlab's gitlab-rails definition syncs the application into the package with
# `exclude: %w(... app/assets ee/app/assets ...)` (config/software/gitlab-rails.rb at
# 19.3.0+ce.0), so no JavaScript or stylesheet source ever ships, fork or not. An earlier
# version of this check looked for material_system source and refused the first real
# package this fork ever built (run 34554884695). Two things that do ship, and that stock
# GitLab does not have, are checked instead:
#   1. Every app/helpers/material_*_helper.rb in the tree being packaged. Upstream has none,
#      so the count proves the fork's Ruby landed, not just its assets.
#   2. The compiled pages.agent_memory chunk. That page entry exists only in this fork and
#      imports material_system, so its chunk proves the fork's frontend was compiled.
expected_helpers="${MATERIAL_HELPER_COUNT:-}"
if [ -z "$expected_helpers" ]; then
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
    || die "cannot tell how many material helpers to expect: run from the packaged checkout or set MATERIAL_HELPER_COUNT"
  expected_helpers="$(git ls-files 'app/helpers/material_*_helper.rb' | wc -l | tr -d ' ')"
fi
[ "$expected_helpers" -gt 0 ] || die "the tree being packaged has no app/helpers/material_*_helper.rb, so there is nothing to prove this is the fork"
packaged_helpers="$(grep -cE "^$rails_root/app/helpers/material_[^/]*_helper\.rb$" "$listing" || true)"
log "material helpers in package: $packaged_helpers of $expected_helpers"
if [ "$packaged_helpers" -ne "$expected_helpers" ]; then
  die "the package carries $packaged_helpers of the $expected_helpers app/helpers/material_*_helper.rb files, so the fork's Ruby did not land"
fi
agent_memory_chunk="$(grep -m1 -E "^$rails_root/public/assets/webpack/pages\.agent_memory\.[0-9a-f]+\.chunk\.js$" "$listing" || true)"
[ -n "$agent_memory_chunk" ] \
  || die "the package has no compiled pages.agent_memory chunk, so the fork's frontend was not compiled into it"
log "fork-only compiled entry: ${agent_memory_chunk##*/}"
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
bytes="$(stat -L -c %s "$deb")"
name="$(basename "$deb")"
printf '%s  %s\n' "$sha" "$name" > "$pkg_dir/SHA256SUMS.txt"
log "SHA-256 $sha  $name  ($bytes bytes)"

emit_output deb_count 1
emit_output deb_path "$deb"
emit_output deb_name "$name"
emit_output deb_sha256 "$sha"
emit_output deb_bytes "$bytes"
emit_output webpack_files "$webpack_files"
