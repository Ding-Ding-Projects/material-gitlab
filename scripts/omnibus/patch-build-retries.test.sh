#!/usr/bin/env bash
# Prove patch-build-retries.sh sets build_retries to 0 when it is present, refuses to guess
# when the anchor is missing (the omnibus layout changed and the patch needs revisiting), and
# is idempotent when the value is already 0. It builds tiny fixture omnibus.rb files rather
# than a real omnibus-gitlab checkout, so the whole thing runs in a fraction of a second, in
# contrast to the real build a wrong decision here would waste hours of.

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
patch="$here/patch-build-retries.sh"
test -f "$patch" || { echo "no patch-build-retries.sh beside this test"; exit 1; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

fail=0

make_fixture() {
  # $1 = destination directory, $2 = literal content of omnibus.rb
  local dir="$1" body="$2"
  mkdir -p "$dir"
  printf '%s' "$body" > "$dir/omnibus.rb"
}

echo "positive: build_retries 2 is patched to build_retries 0"
present="$work/present"
make_fixture "$present" $'use_s3_caching false\n\nbuild_retries 2\nfetcher_retries 5\nfetcher_progress_bar false\n'
if bash "$patch" "$present" >"$work/present.out" 2>&1; then
  if grep -qx 'build_retries 0' "$present/omnibus.rb" && ! grep -q 'build_retries 2' "$present/omnibus.rb"; then
    echo "  pass: build_retries is now 0"
  else
    echo "  FAIL: omnibus.rb does not read build_retries 0 after patching"
    cat "$present/omnibus.rb"
    fail=1
  fi
else
  echo "  FAIL: patch-build-retries.sh refused a fixture with a normal build_retries line"
  cat "$work/present.out"
  fail=1
fi

echo "negative: a missing build_retries anchor must be refused, not silently skipped"
absent="$work/absent"
make_fixture "$absent" $'use_s3_caching false\n\nfetcher_retries 5\nfetcher_progress_bar false\n'
if bash "$patch" "$absent" >"$work/absent.out" 2>&1; then
  echo "  FAIL: patch-build-retries.sh silently accepted a fixture with no build_retries line"
  cat "$work/absent.out"
  fail=1
else
  echo "  refused (correct); the omnibus layout would need revisiting before trusting this"
fi
if grep -q 'build_retries' "$absent/omnibus.rb" 2>/dev/null; then
  echo "  FAIL: a build_retries line appeared in a fixture that never had one"
  fail=1
fi

echo "idempotent: build_retries already 0 is left at 0 and the run still succeeds"
already_zero="$work/already-zero"
make_fixture "$already_zero" $'use_s3_caching false\n\nbuild_retries 0\nfetcher_retries 5\nfetcher_progress_bar false\n'
if bash "$patch" "$already_zero" >"$work/already-zero.out" 2>&1; then
  if grep -qx 'build_retries 0' "$already_zero/omnibus.rb"; then
    echo "  pass: build_retries stayed 0"
  else
    echo "  FAIL: an already-0 build_retries was not preserved"
    cat "$already_zero/omnibus.rb"
    fail=1
  fi
else
  echo "  FAIL: patch-build-retries.sh refused a fixture that was already build_retries 0"
  cat "$work/already-zero.out"
  fail=1
fi

if [ "$fail" -ne 0 ]; then echo "patch-build-retries.test.sh: FAILURES ABOVE"; exit 1; fi
echo "patch-build-retries.test.sh: all checks passed"
