#!/usr/bin/env bash
# Runs INSIDE the official omnibus builder image. Started by build-package.sh; not for
# direct use. Expects GITLAB_VERSION, OMNIBUS_REF, OPENSSL_VERSION, BUILD_VERSION,
# COMPILE_ASSETS and OMNIBUS_ATTEMPTS in the environment, and /omnibus mounted.

set -euo pipefail

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
# kills the whole build. Omnibus caches software it has already built, so a retry resumes
# rather than starting over. The exit status of the last attempt is what counts.
attempt=1
until bundle exec omnibus build gitlab --log-level=info; do
  status=$?
  if [ "$attempt" -ge "${OMNIBUS_ATTEMPTS:-3}" ]; then
    echo "::error::omnibus build failed $attempt times; last exit $status"
    exit "$status"
  fi
  echo "::warning::omnibus build attempt $attempt failed with exit $status; retrying after a pause"
  attempt=$((attempt + 1))
  sleep 60
done
