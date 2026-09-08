"""Normalize committed CRLF scripts without touching binary or linked inputs."""
import os
from pathlib import Path
import sys


def normalize_file(path):
    if path.is_symlink():
        return 0
    with path.open("rb") as source:
        prefix = source.read(2)
        if prefix != b"#!":
            return 0
        original = prefix + source.read()
    converted = original.replace(b"\r\n", b"\n")
    if converted == original:
        return 0
    path.write_bytes(converted)
    return 1


def normalize(roots):
    changed = 0
    for root in map(Path, roots):
        if root.is_symlink() or not root.exists():
            continue
        if root.is_file():
            changed += normalize_file(root)
            continue
        for directory, children, files in os.walk(root, followlinks=False):
            children[:] = [name for name in children
                           if name != "node_modules" and not (Path(directory) / name).is_symlink()]
            for filename in files:
                changed += normalize_file(Path(directory) / filename)
    return changed


if __name__ == "__main__":
    print(f"Normalized CRLF shebang files: {normalize(sys.argv[1:])}")
