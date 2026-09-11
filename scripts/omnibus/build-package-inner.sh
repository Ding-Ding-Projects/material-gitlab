#!/usr/bin/env bash
# Runs INSIDE the official omnibus builder image. Started by build-package.sh; not for
# direct use. Expects GITLAB_VERSION, OMNIBUS_REF, OPENSSL_VERSION, BUILD_VERSION,
# COMPILE_ASSETS and OMNIBUS_ATTEMPTS in the environment, and /omnibus mounted.

set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/retry.sh"

# The checkout is owned by the runner user and this container runs as root, so git
# refuses to read it: "detected dubious ownership in repository". Omnibus derives its
# version from `git describe --tags --exact-match`, so without this the build dies before
# compiling anything, with an error that names git rather than ownership.
git config --global --add safe.directory /omnibus
git config --global --add safe.directory "*"

# That describe also needs the tag itself, which a shallow branch clone does not always
# bring along. Create it locally when it is missing rather than letting omnibus fail on
# an empty version.
if ! git -C /omnibus describe --tags --exact-match >/dev/null 2>&1; then
  echo "no exact tag on HEAD; creating ${OMNIBUS_REF} locally so omnibus can version the build"
  git -C /omnibus tag -f "${OMNIBUS_REF}" HEAD
fi
git -C /omnibus describe --tags --exact-match

bundle config set --local path /omnibus/.bundle-vendor
bundle install --jobs 4

# Omnibus fetches every dependency source over the network, and a single upstream 502
# kills the whole build. Retrying that is worthwhile because omnibus caches software it has
# already built, so a retry resumes rather than starting over. Retrying a deterministic
# failure, such as a broken JS import, is not worthwhile: it fails the same way every time and
# only burns runner minutes. omnibus_retry (scripts/omnibus/retry.sh) tells the two apart by
# checking each failed attempt's log for a network-failure signature before retrying.
omnibus_retry "${OMNIBUS_ATTEMPTS:-3}" "/omnibus/log/omnibus-build-attempts" -- \
  bundle exec omnibus build gitlab --log-level=info
