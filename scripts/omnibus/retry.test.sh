#!/usr/bin/env bash
# Prove omnibus_retry retries only a failure that looks like a network problem, and that it
# preserves the real exit status of the command it ran. Every case here runs a tiny stand-in
# command, so the whole file takes a fraction of a second, in contrast to the roughly 30
# minutes a wrong decision costs against the real omnibus build.
#
# Case (b) additionally runs the same deterministic failure through a copy of retry.sh with
# its network check removed, so the exact behaviour this file exists to prevent (retrying a
# failure that cannot change) is demonstrated actually happening, not merely asserted against.

set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

fail=0
note() { printf '%s\n' "$*"; }
expect_eq() {
  local label="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    note "  pass: $label ($actual)"
  else
    note "  FAIL: $label expected $expected, got $actual"
    fail=1
  fi
}

source "$here/retry.sh"

# (a) fails once with a network signature, then succeeds: expect exit 0 after 2 attempts.
counter_a="$work/counter-a"
echo 0 > "$counter_a"
network_then_ok() {
  local n
  n="$(cat "$counter_a")"
  n=$((n + 1))
  echo "$n" > "$counter_a"
  if [ "$n" -eq 1 ]; then
    echo "Errno::ETIMEDOUT: connect timed out while fetching source tarball"
    return 1
  fi
  echo "build succeeded on attempt $n"
  return 0
}
note "case (a): a network failure, then success"
OMNIBUS_RETRY_SLEEP=0 omnibus_retry 3 "$work/log-a" -- network_then_ok
expect_eq "case (a) exit status" 0 "$?"
expect_eq "case (a) attempt count" 2 "$(cat "$counter_a")"

# (b) fails with a webpack-style deterministic error: expect nonzero exit after exactly 1
# attempt, because retrying a deterministic failure cannot change its outcome.
counter_b="$work/counter-b"
echo 0 > "$counter_b"
webpack_fail() {
  local n
  n="$(cat "$counter_b")"
  n=$((n + 1))
  echo "$n" > "$counter_b"
  echo "ERROR in ./x.js Module not found: Error: Can't resolve './missing' in '/app'"
  return 1
}
note "case (b): a deterministic compile failure is not retried"
OMNIBUS_RETRY_SLEEP=0 omnibus_retry 3 "$work/log-b" -- webpack_fail
status_b=$?
if [ "$status_b" -eq 0 ]; then
  note "  FAIL: omnibus_retry reported success for a failing command"
  fail=1
else
  note "  pass: omnibus_retry reported failure ($status_b)"
fi
expect_eq "case (b) attempt count" 1 "$(cat "$counter_b")"

# Demonstrate, rather than only assert, what this file exists to prevent: with the network
# check removed, the same deterministic failure IS retried to the full attempt budget. This
# runs the old-style unconditional loop that build-package-inner.sh used before this change.
note "case (b), for comparison: the old retry-everything behaviour retries it anyway"
old_retry_dir="$work/old-retry-sh"
mkdir -p "$old_retry_dir"
sed -E 's/if ! grep -qE "\$_OMNIBUS_RETRY_NETWORK_PATTERN" "\$log"; then/if false; then/' \
  "$here/retry.sh" > "$old_retry_dir/retry.sh"
(
  counter_old="$work/counter-b-old"
  echo 0 > "$counter_old"
  webpack_fail_old() {
    local n
    n="$(cat "$counter_old")"
    n=$((n + 1))
    echo "$n" > "$counter_old"
    echo "ERROR in ./x.js Module not found: Error: Can't resolve './missing' in '/app'"
    return 1
  }
  source "$old_retry_dir/retry.sh"
  OMNIBUS_RETRY_SLEEP=0 omnibus_retry 3 "$work/log-b-old" -- webpack_fail_old
  echo "$(cat "$counter_old")" > "$work/old-attempt-count"
)
old_attempts="$(cat "$work/old-attempt-count")"
if [ "$old_attempts" -eq 3 ]; then
  note "  confirmed: the old unconditional-retry behaviour ran the deterministic failure 3 times"
else
  note "  FAIL: the old-behaviour comparison did not retry as expected ($old_attempts attempts); the comparison is not meaningful"
  fail=1
fi

# (c) always fails with a network signature: expect nonzero after max attempts, with every
# attempt actually run.
counter_c="$work/counter-c"
echo 0 > "$counter_c"
always_network_fail() {
  local n
  n="$(cat "$counter_c")"
  n=$((n + 1))
  echo "$n" > "$counter_c"
  echo "curl: (28) Connection timed out after 30000 milliseconds"
  return 1
}
note "case (c): a network failure that never clears"
OMNIBUS_RETRY_SLEEP=0 omnibus_retry 3 "$work/log-c" -- always_network_fail
status_c=$?
if [ "$status_c" -eq 0 ]; then
  note "  FAIL: omnibus_retry reported success for a failure that never cleared"
  fail=1
else
  note "  pass: omnibus_retry reported failure ($status_c)"
fi
expect_eq "case (c) attempt count" 3 "$(cat "$counter_c")"

# (d) preserve a specific exit code, such as 7, rather than tee's or a generic 1.
counter_d="$work/counter-d"
echo 0 > "$counter_d"
network_fail_code_7() {
  local n
  n="$(cat "$counter_d")"
  n=$((n + 1))
  echo "$n" > "$counter_d"
  echo "SocketError: getaddrinfo: Name or service not known"
  return 7
}
note "case (d): the real exit code survives, not tee's"
OMNIBUS_RETRY_SLEEP=0 omnibus_retry 1 "$work/log-d" -- network_fail_code_7
expect_eq "case (d) exit status" 7 "$?"

# (e) the regression this file exists to catch: run 34309060466's real log carried ordinary
# NetFetcher download chatter (from Omnibus::NetFetcher#fetch, unrelated to the actual failure)
# alongside the deterministic webpack error. Bare "NetFetcher" used to match that chatter and
# retry a failure that could never succeed. Every attempt log realistically contains this
# chatter, so it belongs in the fixture, not just the failure line.
counter_e="$work/counter-e"
echo 0 > "$counter_e"
webpack_fail_with_netfetcher_chatter() {
  local n
  n="$(cat "$counter_e")"
  n=$((n + 1))
  echo "$n" > "$counter_e"
  cat <<'LOG'
[NetFetcher: cacerts] I | 2026-09-09T04:00:58+00:00 | Downloading from `https://curl.haxx.se/ca/cacert-2025-11-04.pem'
[NetFetcher: libtool] I | 2026-09-09T04:00:58+00:00 | Downloading from `https://ftp.gnu.org/gnu/libtool/libtool-2.4.6.tar.gz'
[NetFetcher: libffi] I | 2026-09-09T04:00:59+00:00 | Downloading from `https://sourceware.org/pub/libffi/libffi-3.2.1.tar.gz'
ERROR in ./x.js Module not found: Error: Can't resolve './missing' in '/app'
LOG
  return 1
}
note "case (e): a deterministic failure surrounded by normal NetFetcher download chatter is not retried"
OMNIBUS_RETRY_SLEEP=0 omnibus_retry 3 "$work/log-e" -- webpack_fail_with_netfetcher_chatter
status_e=$?
if [ "$status_e" -eq 0 ]; then
  note "  FAIL: omnibus_retry reported success for a failing command"
  fail=1
else
  note "  pass: omnibus_retry reported failure ($status_e)"
fi
expect_eq "case (e) attempt count" 1 "$(cat "$counter_e")"

# (f) the real download-failure text omnibus itself prints (download_helpers.rb, omnibus gem
# 9.0.19) must still be retried: this is the actual network-failure signal that "NetFetcher"
# chatter was wrongly standing in for.
counter_f="$work/counter-f"
echo 0 > "$counter_f"
network_download_then_ok() {
  local n
  n="$(cat "$counter_f")"
  n=$((n + 1))
  echo "$n" > "$counter_f"
  if [ "$n" -eq 1 ]; then
    cat <<'LOG'
[NetFetcher: libffi] I | 2026-09-09T04:00:59+00:00 | Downloading from `https://sourceware.org/pub/libffi/libffi-3.2.1.tar.gz'
[NetFetcher: libffi] W | 2026-09-09T04:01:29+00:00 | Retrying failed download due to end of file reached (4 retries left)...
LOG
    return 1
  fi
  echo "fetch succeeded on attempt $n"
  return 0
}
note "case (f): the omnibus gem's own real download-failure text is retried"
OMNIBUS_RETRY_SLEEP=0 omnibus_retry 3 "$work/log-f" -- network_download_then_ok
expect_eq "case (f) exit status" 0 "$?"
expect_eq "case (f) attempt count" 2 "$(cat "$counter_f")"

# Sanity check: a realistic multi-line webpack/asset-compile failure, the actual shape of the
# 34309060466 failure, must not match the network pattern at all. None of the timeout, socket,
# or DNS fragments should be able to match a module path or stack frame.
webpack_block="$work/webpack-block.log"
cat > "$webpack_block" <<'LOG'
ERROR in ./ee/app/assets/javascripts/some_file.vue
Module not found: Error: Can't resolve 'graphql-ws' in '/opt/gitlab-rails/embedded/service/gitlab-rails/node_modules/@graphiql/toolkit/dist/cjs/create-fetcher'
 @ ./node_modules/@graphiql/toolkit/dist/cjs/index.js 15:0-45
 @ ./ee/app/assets/javascripts/some_file.vue 3:0-40
Error: Unable to compile production assets.
    at ChildProcess.<anonymous> (/opt/gitlab-rails/lib/tasks/gitlab/assets.rake:45:12)
    at ChildProcess.emit (node:events:513:28)
    at maybeClose (node:internal/child_process:1105:16)
    at Process.ChildProcess._handle.onexit (node:internal/child_process:305:5)
LOG
note "sanity: a realistic webpack/asset-compile failure block does not match the network pattern"
if grep -qE "$_OMNIBUS_RETRY_NETWORK_PATTERN" "$webpack_block"; then
  note "  FAIL: the network pattern matched a realistic webpack failure block"
  grep -nE "$_OMNIBUS_RETRY_NETWORK_PATTERN" "$webpack_block"
  fail=1
else
  note "  pass: no match"
fi

if [ "$fail" -ne 0 ]; then
  note "retry.test.sh: FAILURES ABOVE"
  exit 1
fi
note "retry.test.sh: all checks passed"
