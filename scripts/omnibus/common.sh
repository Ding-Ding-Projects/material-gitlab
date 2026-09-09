#!/usr/bin/env bash
# Shared helpers for the omnibus packaging scripts. Source this file; do not execute it.
#
# Every script in this directory is the single implementation of one workflow step.
# The GitHub Actions workflow calls these files rather than carrying its own copy of
# the shell, so a local run on a Linux Docker host and the CI run cannot drift apart.

set -euo pipefail

log() { printf '%s\n' "$*"; }
warn() { printf '::warning::%s\n' "$*" >&2; }
die() { printf '::error::%s\n' "$*" >&2; exit 1; }

# Append name=value to GITHUB_OUTPUT when running under Actions, and always echo it so a
# local run sees the same facts.
emit_output() {
  local name="$1" value="$2"
  log "$name=$value"
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    printf '%s=%s\n' "$name" "$value" >> "$GITHUB_OUTPUT"
  fi
}
