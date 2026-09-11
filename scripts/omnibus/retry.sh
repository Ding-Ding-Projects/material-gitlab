#!/usr/bin/env bash
# Retry a command, but only when its failure looks like a transient network problem.
#
# Usage: source this file, then call:
#   omnibus_retry <max_attempts> <log_dir> -- <command...>
#
# Every attempt's combined stdout/stderr is streamed to the console as it happens AND saved
# to "<log_dir>/attempt-N.log". The command's own exit status is what omnibus_retry returns,
# never tee's.
#
# build-package-inner.sh used to retry the whole `omnibus build gitlab` run on ANY failure,
# up to OMNIBUS_ATTEMPTS times. Run 34309060466 hit exactly the failure mode that makes that
# wrong: a deterministic webpack compile error ("Module not found") fails identically on every
# attempt, so nothing a retry can do changes the outcome. Three doomed compiles at roughly 30
# minutes each ran back to back, omnibus's own per-command retry (see
# patch-build-retries.sh) doubled part of that waste again, and the job hit the 360-minute
# GitHub-hosted runner ceiling and was cancelled without ever reporting the real error clearly.
#
# This helper narrows retrying to the one class of failure a retry can actually fix: a
# transient network error while fetching a dependency, a gem, or a registry mirror. Anything
# else exits on the first attempt with the real exit status, so a deterministic failure is
# reported in minutes rather than hours.

set -uo pipefail

# Extend or trim this list as new transient network failures are observed in real build logs.
# Keep it specific enough that a real compile error, a real test failure, or a real logic
# error never matches; a pattern that is too broad turns this back into retry-everything.
_OMNIBUS_RETRY_NETWORK_PATTERN='NetFetcher|Net::ReadTimeout|Net::OpenTimeout|Errno::ECONNRESET|Errno::ETIMEDOUT|Failed to open TCP connection|SocketError|getaddrinfo|Could not resolve host|502 Bad Gateway|503 Service Unavailable|504 Gateway|ESOCKETTIMEDOUT|ETIMEDOUT|ECONNRESET|EAI_AGAIN|There appears to be trouble with your network connection|curl: \(28\)|curl: \(56\)'

omnibus_retry() {
  # Disable and restore this function's own copy of the shell options ("local -" is the bash
  # idiom for that), so a failing attempt never trips the caller's "set -e" before this
  # function has had a chance to look at the log and decide whether to retry.
  local -
  set +e
  set -o pipefail

  local max_attempts="$1" log_dir="$2"
  shift 2
  if [ "${1:-}" != "--" ]; then
    printf '::error::omnibus_retry usage: omnibus_retry <max_attempts> <log_dir> -- <command...>\n' >&2
    return 2
  fi
  shift

  mkdir -p "$log_dir"

  local attempt=1 status log
  while :; do
    log="$log_dir/attempt-$attempt.log"
    printf 'omnibus_retry: attempt %s/%s: %s\n' "$attempt" "$max_attempts" "$*"
    "$@" 2>&1 | tee "$log"
    status="${PIPESTATUS[0]}"
    if [ "$status" -eq 0 ]; then
      return 0
    fi

    if ! grep -qE "$_OMNIBUS_RETRY_NETWORK_PATTERN" "$log"; then
      printf '::error::attempt %s failed with exit %s and the failure did not match a known network signature; not retrying. See %s\n' \
        "$attempt" "$status" "$log" >&2
      return "$status"
    fi

    if [ "$attempt" -ge "$max_attempts" ]; then
      printf '::error::attempt %s failed with exit %s after a network-looking failure; no attempts remain. See %s\n' \
        "$attempt" "$status" "$log" >&2
      return "$status"
    fi

    printf '::warning::attempt %s failed with exit %s, and the failure looks like a transient network error (see %s); retrying after a pause\n' \
      "$attempt" "$status" "$log" >&2
    attempt=$((attempt + 1))
    sleep "${OMNIBUS_RETRY_SLEEP:-60}"
  done
}
