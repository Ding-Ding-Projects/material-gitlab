#!/usr/bin/env bash
# Stop the omnibus gem's own per-command retry from repeating a deterministic failure.
#
# Usage: patch-build-retries.sh <omnibus-gitlab-dir>
#
# Every shell command inside a software definition's build block is retried by the omnibus
# gem itself, on top of and independent of anything in scripts/omnibus/retry.sh. At omnibus
# gem 9.0.19 (the version pinned by this ref's Gemfile.lock), lib/omnibus/builder.rb wraps
# command execution in with_retries, which reads Config.build_retries, sleeps an exponentially
# growing delay, and re-runs the exact same command:
#
#   [1/2] Failed to execute command. Retrying in 10 seconds...
#   [2/2] Failed to execute command. Retrying in 20 seconds...
#
# omnibus-gitlab's own omnibus.rb sets `build_retries 2`, so a command that fails for a
# deterministic reason, such as a broken JS import, is executed three times in total before
# the build gives up on it. Run 34309060466 hit this on the asset-compile step, which is slow
# to fail in the first place, so the two extra failing compiles cost real runner minutes on an
# outcome that could not change.
#
# This retry is controlled by a single config value, so it is set to 0 here rather than
# patching builder.rb itself: a command then runs exactly once, and any failure surfaces
# immediately. Genuine transient failures are still retried, one layer up: omnibus_retry
# (scripts/omnibus/retry.sh) re-runs the whole `omnibus build gitlab` invocation, but only
# when the failure looks like a network problem, and omnibus's own build cache means that
# outer retry resumes rather than starting over.

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

omnibus_dir="${1:?usage: patch-build-retries.sh <omnibus-gitlab-dir>}"
file="$omnibus_dir/omnibus.rb"
test -f "$file" || die "$file is missing; the omnibus layout has changed and this patch needs revisiting."

python3 - "$file" <<'PY'
import difflib, pathlib, re, sys
path = pathlib.Path(sys.argv[1])
before = path.read_text(encoding='utf-8')
pattern = re.compile(r'^build_retries [0-9]+\n', re.M)
matches = pattern.findall(before)
if len(matches) != 1:
    sys.exit('expected exactly one build_retries anchor, found %d; refusing to patch blind' % len(matches))
after = pattern.sub('build_retries 0\n', before, count=1)
path.write_text(after, encoding='utf-8', newline='')
sys.stdout.writelines(difflib.unified_diff(before.splitlines(True), after.splitlines(True), 'a/omnibus.rb', 'b/omnibus.rb'))
print('omnibus per-command retry (build_retries) is now 0; a deterministic failure surfaces on the first attempt')
PY

# Nothing may still schedule a per-command retry.
if grep -nE '^build_retries [1-9]' "$file"; then
  die "a nonzero build_retries survived the patch"
fi
