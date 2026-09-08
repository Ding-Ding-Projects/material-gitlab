#!/usr/bin/env bash
set -eu

target=${1:?expected a candidate source directory}
normalized=0

normalize_file() {
  file=$1
  if [ "$(head -c 2 "$file" 2>/dev/null || true)" != '#!' ]; then
    return
  fi
  before=$(sha256sum "$file")
  sed -i 's/\r$//' "$file"
  after=$(sha256sum "$file")
  if [ "$before" != "$after" ]; then
    normalized=$((normalized + 1))
  fi
}

while IFS= read -r -d '' file; do
  normalize_file "$file"
done < <(find "$target" -type f -print0)

printf 'Normalized CRLF shebang files: %s\n' "$normalized"
