#!/usr/bin/env bash
# Prove verify-package.sh accepts a real fork package and refuses the states it exists to
# catch: stock GitLab (no fork helpers, no fork-only compiled entry), a surviving musl
# binary, and a VERSION mismatch. The synthetic "good" package has the shape a real one
# has: omnibus never ships app/assets source, so it carries none either. It builds synthetic packages
# with dpkg-deb, so it skips cleanly (exit 0) where dpkg-deb is absent, such as a Windows
# developer machine; run it on a Linux host or inside WSL. The point is that a verifier
# bug is found here, in seconds, rather than after a two-hour real build discards a good
# package or waves a bad one through.

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
verify="$here/verify-package.sh"
test -f "$verify" || { echo "no verify-package.sh beside this test"; exit 1; }

if ! command -v dpkg-deb >/dev/null 2>&1; then
  echo "SKIP: dpkg-deb is not available; run this on a Linux host or inside WSL."
  exit 0
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/good" "$work/bad" "$work/stock" "$work/nochunk"
export MATERIAL_HELPER_COUNT=2

build_pkg() {
  local dest="$1" variant="$2"
  local root="$work/root-$variant"
  rm -rf "$root"
  local rails="$root/opt/gitlab/embedded/service/gitlab-rails"
  mkdir -p "$rails/app/helpers" "$rails/public/assets/webpack" "$root/DEBIAN"
  printf '19.3.0-pre' > "$rails/VERSION"
  local i
  for i in $(seq 1 1200); do echo "asset $i" > "$rails/public/assets/webpack/chunk-$i.js"; done
  if [ "$variant" != "stock" ]; then
    echo '# fork helper' > "$rails/app/helpers/material_code_helper.rb"
    echo '# fork helper' > "$rails/app/helpers/material_analyze_helper.rb"
  fi
  if [ "$variant" != "stock" ] && [ "$variant" != "nochunk" ]; then
    echo '// fork-only entry' > "$rails/public/assets/webpack/pages.agent_memory.f1a7e1a8.chunk.js"
  fi
  if [ "$variant" = "bad" ]; then
    mkdir -p "$rails/ee/frontend_islands/node_modules/lightningcss-linux-x64-musl"
    echo fake > "$rails/ee/frontend_islands/node_modules/lightningcss-linux-x64-musl/lightningcss.linux-x64-musl.node"
  fi
  cat > "$root/DEBIAN/control" <<CTL
Package: gitlab-ce
Version: 19.3.0-pre
Architecture: amd64
Maintainer: material-gitlab test
Description: synthetic package that exercises verify-package.sh
CTL
  dpkg-deb --build --root-owner-group "$root" "$dest/gitlab-ce_19.3.0-pre_amd64.deb" >/dev/null
}

build_pkg "$work/good" good
build_pkg "$work/bad" bad
build_pkg "$work/stock" stock
build_pkg "$work/nochunk" nochunk

fail=0

echo "positive: a good package must pass"
if bash "$verify" "$work/good" 19.3.0-pre >/dev/null; then echo "  pass (correct)"; else echo "  FAIL: verifier rejected a good package"; fail=1; fi

echo "negative: stock GitLab (no fork helpers, no fork-only entry) must be refused"
if bash "$verify" "$work/stock" 19.3.0-pre >/dev/null 2>&1; then echo "  FAIL: verifier accepted a stock package"; fail=1; else echo "  refused (correct)"; fi

echo "negative: fork Ruby without the compiled fork-only entry must be refused"
if bash "$verify" "$work/nochunk" 19.3.0-pre >/dev/null 2>&1; then echo "  FAIL: verifier accepted a package without the fork frontend"; fail=1; else echo "  refused (correct)"; fi

echo "negative: a surviving musl binary must be refused"
if bash "$verify" "$work/bad" 19.3.0-pre >/dev/null 2>&1; then echo "  FAIL: verifier accepted a musl package"; fail=1; else echo "  refused (correct)"; fi

echo "negative: a VERSION mismatch must be refused"
if bash "$verify" "$work/good" 99.9.9 >/dev/null 2>&1; then echo "  FAIL: verifier accepted a wrong VERSION"; fail=1; else echo "  refused (correct)"; fi

if [ "$fail" -ne 0 ]; then echo "verify-package.test.sh: FAILURES ABOVE"; exit 1; fi
echo "verify-package.test.sh: all checks passed"
