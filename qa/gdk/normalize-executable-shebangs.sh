#!/usr/bin/env bash
set -eu

target=${1:?expected a candidate source directory}
normalized=0

normalize_file() {
  file=$1
  if [ "$(head -c 2 "$file" 2>/dev/null || true)" != '#!' ]; then
    return
  fi
  if ! head -n 1 "$file" | grep -q "$(printf '\r')$"; then
    return
  fi
  sed -i 's/\r$//' "$file"
  normalized=$((normalized + 1))
}

while IFS= read -r -d '' file; do
  normalize_file "$file"
done < <(find "$target" -type f -perm /111 -print0)

printf 'Normalized CRLF shebang files: %s\n' "$normalized"
