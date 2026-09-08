"""Check the helper's archive bytes under a hostile host line-ending setting."""

import io
import json
import subprocess
import sys
import tarfile


def read_members(arguments, paths):
    raw = subprocess.check_output(["git", "-c", "core.autocrlf=true", "-c", "core.eol=crlf", *arguments, *paths])
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:") as archive:
        return {path: (archive.extractfile(path).read(), archive.getmember(path).mode) for path in paths}


plan = json.load(sys.stdin)
paths = ["qa/gdk/.tool-versions", "qa/gdk/rubygems-version", "bin/rake"]
expected = {path: subprocess.check_output(["git", "show", f"{plan['sourceSha']}:{path}"]) for path in paths}
actual = read_members(plan["archiveArguments"], paths)
for path in paths:
    assert actual[path][0] == expected[path], f"Archive differs from committed bytes: {path}"
assert actual["bin/rake"][1] & 0o111, "Archive lost the committed executable permission"

# Removing the helper's configuration boundary must reproduce the observed defect.
unprotected = read_members(["archive", "--format=tar", plan["sourceSha"]], paths)
for path in paths:
    assert unprotected[path][0] != expected[path], f"Negative fixture did not expose host conversion: {path}"
    assert b"\r\n" in unprotected[path][0], f"Negative fixture did not produce CRLF: {path}"
print("Archive byte regression passed: 3 exact blobs, executable mode, and 3 negative mutations.")
