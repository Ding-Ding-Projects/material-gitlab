#!/usr/bin/env bash
# Point the gitlab-rails component of an omnibus-gitlab checkout at this fork.
#
# Usage: repoint-sources.sh <omnibus-gitlab-dir> <fork-git-url>
#
# Omnibus resolves each component's git remote through .custom_sources.yml. Repointing
# gitlab-rails at this repository is what makes the resulting package carry the Material
# work instead of upstream's application code. Both "remote" and "alternative" keys are
# rewritten, because omnibus reads "alternative" when ALTERNATIVE_SOURCES is set and a
# rewrite of "remote" alone can silently build upstream while looking correct.

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

omnibus_dir="${1:?usage: repoint-sources.sh <omnibus-gitlab-dir> <fork-git-url>}"
fork_url="${2:?usage: repoint-sources.sh <omnibus-gitlab-dir> <fork-git-url>}"
sources="$omnibus_dir/.custom_sources.yml"

test -f "$sources" || die ".custom_sources.yml is missing; the omnibus layout has changed and this step needs revisiting."
cp "$sources" "$sources.orig"

python3 - "$sources" "$fork_url" <<'PY'
import re, sys, pathlib
path = pathlib.Path(sys.argv[1])
fork = sys.argv[2]
text = path.read_text(encoding='utf-8')
# Operate on the gitlab-rails block only. The (?=^\S|\Z) lookahead ends the block at the
# next top level key, which is what keeps gitlab-rails-ee out of range; a plain prefix
# match would rewrite it too, and the build would then be EE.
block_re = re.compile(r'(^gitlab-rails:\n)((?:[ \t]+.*\n|\n)*?)(?=^\S|\Z)', re.M)
m = block_re.search(text)
if not m:
    sys.exit('gitlab-rails block not found in .custom_sources.yml')
body = m.group(2)
changed = 0
def swap(mm):
    global changed
    changed += 1
    return mm.group(1) + '"' + fork + '"'
for key in ('remote', 'alternative'):
    body, _ = re.subn(r'(^[ \t]+%s:[ \t]*)("[^"]*"|\S+)' % key, swap, body, count=1, flags=re.M)
if changed != 2:
    sys.exit('Expected to rewrite remote and alternative; rewrote %d' % changed)
path.write_text(text[:m.start(2)] + body + text[m.end(2):], encoding='utf-8', newline='')
print('gitlab-rails remote and alternative repointed to', fork)
PY

log "--- diff ---"
diff -u "$sources.orig" "$sources" || true
