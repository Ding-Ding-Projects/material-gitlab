#!/usr/bin/env bash
# Build the Debian package of this fork inside the official omnibus builder image.
#
# Usage (environment):
#   OMNIBUS_DIR       checked-out omnibus-gitlab directory, already repointed and patched
#   OMNIBUS_REF       omnibus-gitlab ref being built, for example 19.3.0+ce.0
#   GITLAB_VERSION    exact commit of this fork to package
#   BUILD_VERSION     content of this fork's VERSION file
#   OPENSSL_VERSION   value read by read-toolchain.sh
#   OMNIBUS_CACHE_DIR optional host directory mounted at /var/cache/omnibus so a second
#                     build on the same host reuses already compiled software
#   OMNIBUS_ATTEMPTS  optional retry count, default 3
#   BUILDER_IMAGE     optional builder image override
#
# The official builder image carries the exact toolchain omnibus expects. Installing those
# dependencies by hand on a bare host is a reliable way to fail slowly for reasons that have
# nothing to do with this fork.

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

: "${OMNIBUS_DIR:?OMNIBUS_DIR is required}"
: "${OMNIBUS_REF:?OMNIBUS_REF is required}"
: "${GITLAB_VERSION:?GITLAB_VERSION is required}"
: "${BUILD_VERSION:?BUILD_VERSION is required}"
: "${OPENSSL_VERSION:?OPENSSL_VERSION is required}"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
builder="${BUILDER_IMAGE:-registry.gitlab.com/gitlab-org/gitlab-omnibus-builder/ubuntu_24.04:latest}"
omnibus_abs="$(cd "$OMNIBUS_DIR" && pwd)"

cache_args=()
if [ -n "${OMNIBUS_CACHE_DIR:-}" ]; then
  mkdir -p "$OMNIBUS_CACHE_DIR"
  cache_args=(-v "$(cd "$OMNIBUS_CACHE_DIR" && pwd):/var/cache/omnibus")
  log "Reusing omnibus cache at $OMNIBUS_CACHE_DIR"
fi

docker pull "$builder"

# Without COMPILE_ASSETS=true, the gitlab-rails definition takes its "copy the assets a CI
# job already built" path and syncs "$CI_PROJECT_DIR/$ASSET_PATH" into public/assets.
# Outside GitLab's own CI both variables are empty, so that path collapses to "/" and it
# copies the entire filesystem root into the package. Compiling the assets here is the
# only route available, since there is no upstream job to copy from.
docker run --rm \
  -e GITLAB_VERSION \
  -e OMNIBUS_REF \
  -e OPENSSL_VERSION \
  -e BUILD_VERSION \
  -e COMPILE_ASSETS=true \
  -e OMNIBUS_ATTEMPTS="${OMNIBUS_ATTEMPTS:-3}" \
  -v "$omnibus_abs:/omnibus" \
  -v "$script_dir:/omnibus-scripts:ro" \
  ${cache_args[@]+"${cache_args[@]}"} \
  -w /omnibus \
  "$builder" \
  bash /omnibus-scripts/build-package-inner.sh
