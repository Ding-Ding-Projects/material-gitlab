#!/usr/bin/env bash
# Read the toolchain versions the omnibus-gitlab ref declares.
#
# Usage: read-toolchain.sh <omnibus-gitlab-dir>
#
# config/software/openssl.rb chooses between OpenSSL 1.1.1 and 3.x purely on whether
# OPENSSL_VERSION starts with "3". Unset means 1.1.1, and curl at this ref refuses to
# configure against anything below 3.0.0. The result is a build that fetches and compiles
# happily for 25 minutes and then dies on "OpenSSL 3.0.0 or upper required", with nothing
# anywhere naming the variable that was never set. Read the value from the ref's own CI
# variables rather than hard coding it, so it stays correct when the ref moves.

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

omnibus_dir="${1:?usage: read-toolchain.sh <omnibus-gitlab-dir>}"
f="$omnibus_dir/gitlab-ci-config/variables.yml"
test -f "$f" || die "$f is missing, so the toolchain versions this ref expects cannot be read. The omnibus layout may have changed."
ver="$(grep -oE '^[[:space:]]*OPENSSL_VERSION:[[:space:]]*[0-9][0-9.]*' "$f" | head -1 | awk '{print $2}')" || true
if [ -z "${ver:-}" ]; then
  die "No OPENSSL_VERSION found in $f. Guessing one would build the wrong OpenSSL and fail far later, so this stops here."
fi
case "$ver" in
  3*) : ;;
  *) die "This ref declares OPENSSL_VERSION=$ver, which selects the 1.1.1 definition that curl will reject." ;;
esac
emit_output openssl_version "$ver"
