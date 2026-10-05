#!/usr/bin/env bash
# Exercise the host/container output boundary without Docker or root. The Docker stub
# models root-owned output using an unwritable fixture, then models the ownership handoff
# by restoring its owner's write bit. No real container or ownership escalation is used.

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "$(id -u)" -eq 0 ]; then
  echo "SKIP: run this permission regression as a non-root user."
  exit 0
fi
if ! command -v dpkg-deb >/dev/null 2>&1; then
  echo "SKIP: dpkg-deb is not available; run this on a Linux host or inside WSL."
  exit 0
fi

work="$(mktemp -d)"
trap 'chmod u+rwx "$work/unreadable-target"; chmod -R u+w "$work"; rm -rf "$work"' EXIT
mkdir -p "$work/bin" "$work/package/DEBIAN"
export MOCK_OUTSIDE="$work/unreadable-target"
mkdir "$MOCK_OUTSIDE"
printf 'unchanged\n' > "$MOCK_OUTSIDE/sentinel"
chmod 000 "$MOCK_OUTSIDE"
rails="$work/package/opt/gitlab/embedded/service/gitlab-rails"
mkdir -p "$rails/app/helpers" "$rails/public/assets/webpack"
printf '19.3.0-pre\n' > "$rails/VERSION"
printf '# fork helper\n' > "$rails/app/helpers/material_test_helper.rb"
printf '// fork entry\n' > "$rails/public/assets/webpack/pages.agent_memory.abc123.chunk.js"
for i in $(seq 1 1000); do
  printf '// fixture\n' > "$rails/public/assets/webpack/chunk-$i.js"
done
cat > "$work/package/DEBIAN/control" <<'CONTROL'
Package: gitlab-ce
Version: 19.3.0-pre
Architecture: amd64
Maintainer: material-gitlab test
Description: synthetic package for the output ownership regression
CONTROL
export MOCK_PACKAGE="$work/gitlab-ce_19.3.0-pre_amd64.deb"
dpkg-deb --build --root-owner-group "$work/package" "$MOCK_PACKAGE" >/dev/null

cat > "$work/bin/docker" <<'DOCKER'
#!/usr/bin/env bash
set -euo pipefail
if [ "$1" = pull ]; then exit "${MOCK_PULL_STATUS:-0}"; fi
[ "$1" = run ] || exit 90
shift
omnibus=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    --rm) shift ;;
    -v)
      case "$2" in *:/omnibus) omnibus="${2%:/omnibus}" ;; esac
      shift 2 ;;
    -e|-w) shift 2 ;;
    *) builder="$1"; shift; break ;;
  esac
done
[ "$builder" = fixture-builder ] && [ -n "$omnibus" ] || exit 91
if [ "$1" = bash ]; then
  [ "$2" = /omnibus-scripts/build-package-inner.sh ] || exit 92
  printf 'build\n' >> "$MOCK_CALLS"
  if [ "${MOCK_NO_OUTPUT:-0}" != 1 ]; then
    mkdir -p "$omnibus/pkg"
    cp "$MOCK_PACKAGE" "$omnibus/pkg/"
    printf 'old checksum\n' > "$omnibus/pkg/SHA256SUMS.txt"
    ln -s "$MOCK_OUTSIDE" "$omnibus/pkg/external-directory"
    # Removing owner write access has the same host-side write failure as root ownership.
    chmod a-w "$omnibus/pkg" "$omnibus/pkg/SHA256SUMS.txt"
  fi
  exit "${MOCK_BUILD_STATUS:-0}"
fi
[ "$#" -eq 5 ] && [ "$1" = chown ] && [ "$2" = -hR ] && [ "$3" = -- ] \
  && [ "$4" = "$(id -u):$(id -g)" ] && [ "$5" = /omnibus/pkg ] || exit 93
printf 'ownership\n' >> "$MOCK_CALLS"
if [ "${MOCK_OWNERSHIP_STATUS:-0}" -ne 0 ]; then exit "$MOCK_OWNERSHIP_STATUS"; fi
# Validate the actual no-dereference chown invocation on files this test already owns.
chown -hR -- "$4" "$omnibus/pkg"
chmod u+w "$omnibus/pkg" "$omnibus/pkg/SHA256SUMS.txt"
DOCKER
chmod +x "$work/bin/docker"
export PATH="$work/bin:$PATH"
export OMNIBUS_REF=19.3.0+ce.0 GITLAB_VERSION=fixture BUILD_VERSION=19.3.0-pre
export OPENSSL_VERSION=fixture BUILDER_IMAGE=fixture-builder MATERIAL_HELPER_COUNT=1

run_build() {
  local name="$1" expected="$2" actual=0
  shift 2
  export OMNIBUS_DIR="$work/$name checkout" MOCK_CALLS="$work/$name.calls"
  mkdir -p "$OMNIBUS_DIR"
  : > "$MOCK_CALLS"
  env "$@" bash "$here/build-package.sh" > "$work/$name.log" 2>&1 || actual=$?
  if [ "$actual" -ne "$expected" ]; then
    echo "FAIL: $name exited $actual, expected $expected"
    cat "$work/$name.log"
    exit 1
  fi
}

echo "positive: successful output supports host verification and checksum replacement"
run_build success 0
if ! bash "$here/verify-package.sh" "$OMNIBUS_DIR/pkg" 19.3.0-pre > "$work/verify.log" 2>&1; then
  cat "$work/verify.log"
  echo "FAIL: host verification could not write the checksum after the build"
  exit 1
fi
(cd "$OMNIBUS_DIR/pkg" && sha256sum -c SHA256SUMS.txt)
[ "$(cat "$MOCK_CALLS")" = $'build\nownership' ]

echo "positive: checksum creation also works with no prior manifest"
rm "$OMNIBUS_DIR/pkg/SHA256SUMS.txt"
bash "$here/verify-package.sh" "$OMNIBUS_DIR/pkg" 19.3.0-pre > "$work/verify-new.log" 2>&1
(cd "$OMNIBUS_DIR/pkg" && sha256sum -c SHA256SUMS.txt)

echo "positive: nested directory symlinks are not traversed during ownership cleanup"
[ -L "$OMNIBUS_DIR/pkg/external-directory" ]
[ "$(stat -c %a "$MOCK_OUTSIDE")" = 0 ]

echo "negative: a failed build retains its status and returns partial output"
run_build build-failed 42 MOCK_BUILD_STATUS=42
[ "$(cat "$MOCK_CALLS")" = $'build\nownership' ]
[ -w "$OMNIBUS_DIR/pkg" ] && [ -w "$OMNIBUS_DIR/pkg/SHA256SUMS.txt" ]

echo "negative: ownership failure fails an otherwise successful build"
run_build ownership-failed 73 MOCK_OWNERSHIP_STATUS=73
[ "$(cat "$MOCK_CALLS")" = $'build\nownership' ]
grep -q 'Could not return package output' "$work/ownership-failed.log"

echo "negative: cleanup failure does not hide the original build failure"
run_build both-failed 42 MOCK_BUILD_STATUS=42 MOCK_OWNERSHIP_STATUS=73
[ "$(cat "$MOCK_CALLS")" = $'build\nownership' ]

echo "negative: a failure before package creation keeps its status without cleanup"
run_build no-output 42 MOCK_BUILD_STATUS=42 MOCK_NO_OUTPUT=1
[ "$(cat "$MOCK_CALLS")" = build ]

echo "negative: an image pull failure does not start a build or cleanup"
run_build pull-failed 19 MOCK_PULL_STATUS=19
[ ! -s "$MOCK_CALLS" ]

echo "negative: a symlinked package directory is refused without touching its target"
mkdir -p "$work/outside" "$work/symlink checkout"
printf 'unchanged\n' > "$work/outside/SHA256SUMS.txt"
ln -s "$work/outside" "$work/symlink checkout/pkg"
run_build symlink 1 MOCK_NO_OUTPUT=1
[ "$(cat "$MOCK_CALLS")" = build ]
[ "$(cat "$work/outside/SHA256SUMS.txt")" = unchanged ]
grep -q 'Refusing to change ownership of a symlinked package directory' "$work/symlink.log"

echo "build-package.test.sh: all checks passed"
