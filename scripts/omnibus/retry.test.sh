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

if [ "$fail" -ne 0 ]; then
  note "retry.test.sh: FAILURES ABOVE"
  exit 1
fi
note "retry.test.sh: all checks passed"
