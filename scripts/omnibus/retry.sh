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
#
# Bare "NetFetcher" used to be in this list and was wrong: every software download, including
# a completely ordinary one, logs a line like
#   [NetFetcher: libtool] I | ... | Downloading from `https://ftp.gnu.org/gnu/libtool-2.4.6.tar.gz'
# through Omnibus::NetFetcher#fetch (omnibus gem 9.0.19, lib/omnibus/fetchers/net_fetcher.rb).
# That line appears in EVERY build log, including the 34309060466 webpack-failure log this file
# exists to stop retrying, so "NetFetcher" alone matched a deterministic failure 120 times over
# and defeated the whole point of this file. The two lines below are what omnibus itself prints
# only when a download actually fails (omnibus gem 9.0.19, lib/omnibus/download_helpers.rb):
# "Retrying failed download due to #{e} (#{n} retries left)..." while a download is being
# retried internally, and "Download failed - #{e.class}!" once its own retries are exhausted.
# The exception classes that rescue clause catches are also matched directly, in case one of
# them ever surfaces in a raw Ruby backtrace instead of through those log lines.
_OMNIBUS_RETRY_NETWORK_PATTERN='Net::ReadTimeout|Net::OpenTimeout|Errno::ECONNRESET|Errno::ETIMEDOUT|Errno::ECONNREFUSED|Errno::ENETUNREACH|Failed to open TCP connection|SocketError|OpenURI::HTTPError|Timeout::Error|Retrying failed download due to|Download failed - |getaddrinfo|Could not resolve host|502 Bad Gateway|503 Service Unavailable|504 Gateway|ESOCKETTIMEDOUT|ETIMEDOUT|ECONNRESET|EAI_AGAIN|There appears to be trouble with your network connection|curl: \(28\)|curl: \(56\)'

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
