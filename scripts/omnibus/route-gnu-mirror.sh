#!/usr/bin/env bash
# Route GNU dependency downloads to a mirror that is actually up.
#
# Usage: route-gnu-mirror.sh <omnibus-gitlab-dir>
#
# Several dependency tarballs are fetched from ftpmirror.gnu.org, which is a redirector
# rather than a host. When that redirector is down the build dies part way through
# compilation: libtool, libiconv and ncurses all failed with 502 Bad Gateway and read
# timeouts, 22 minutes in, after real work had been done.
#
# This routes around an upstream outage; it does not fix one. It changes where the bytes
# come from and not which bytes are accepted, because every download is still verified
# against the checksum in its own software definition. A mirror serving different content
# fails the build rather than quietly poisoning the package.

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

omnibus_dir="${1:?usage: route-gnu-mirror.sh <omnibus-gitlab-dir>}"
cd "$omnibus_dir"

candidates=("https://ftpmirror.gnu.org" "https://ftp.gnu.org/gnu" "https://mirrors.kernel.org/gnu")
chosen=""
for c in "${candidates[@]}"; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 "$c/libtool/" || echo 000)"
  log "  $c -> $code"
  if [ "$code" = "200" ]; then chosen="$c"; break; fi
done
if [ -z "$chosen" ]; then
  die "No GNU source mirror responded. The build cannot fetch its dependencies and would fail late and confusingly, so it is stopping now."
fi
log "Using $chosen"
if [ "$chosen" = "https://ftpmirror.gnu.org" ]; then
  log "The usual redirector is healthy, so the software definitions are left untouched."
  exit 0
fi

# grep exits 1 when it matches nothing, and under `set -e -o pipefail` that kills the
# step. After a successful substitution there is nothing left to find, so the success case
# was once treated as a failure. || true on the assignment keeps the count and drops the
# status; the explicit comparisons underneath are what actually decide.
before="$(grep -rl 'ftpmirror\.gnu\.org' config/software | wc -l)" || true
log "software definitions pointing at the redirector: $before"
if [ "$before" -eq 0 ]; then
  warn "Nothing referenced ftpmirror.gnu.org, so no substitution was made. The upstream layout may have changed and this step needs revisiting."
  exit 0
fi
# Two URL shapes live in these definitions and they must map differently:
#   ftpmirror.gnu.org/gnu/ncurses/...  already carries /gnu/
#   ftpmirror.gnu.org/libtool/...      does not
# The redirector accepts both. A real GNU host only serves /gnu/<package>/, so one blind
# prefix swap turns the first shape into /gnu/gnu/ and every fetch 404s. Longest form first.
files="$(grep -rl 'ftpmirror\.gnu\.org' config/software)" || true
# shellcheck disable=SC2086
sed -i "s|https://ftpmirror\.gnu\.org/gnu/|$chosen/|g" $files
# shellcheck disable=SC2086
sed -i "s|https://ftpmirror\.gnu\.org/|$chosen/|g" $files
# A doubled path segment is the exact defect above, and it is silent: the build runs for
# minutes before any fetch is attempted. Catch it here, where it costs seconds.
if grep -rn '/gnu/gnu/' config/software; then
  die "Substitution produced a doubled /gnu/gnu/ path, which 404s on every real mirror. Refusing to start a build that cannot fetch anything."
fi
after="$(grep -rl 'ftpmirror\.gnu\.org' config/software | wc -l)" || true
log "references remaining: $after"
if [ "$after" -ne 0 ]; then
  die "Substitution left $after references behind, so the build would still reach the failing host. Refusing to start it."
fi
log "--- rewritten ---"
grep -rn "$chosen" config/software | head -8 || true
