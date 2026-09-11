#!/usr/bin/env bash
# Make the frontend-islands node_modules cleanup in gitlab-rails.rb unconditional.
#
# Usage: patch-frontend-islands-cleanup.sh <omnibus-gitlab-dir>
#
# Upstream deletes ee/frontend_islands/node_modules only when the build is flagged EE.
# This fork is an EE-layout tree packaged under the CE project, so the islands workspace
# is built during asset compilation (yarn installs every linux-x64 optional binary, the
# musl variants included) and then shipped inside the package. The omnibus health check
# then finds .node files linked against libc.musl-x86_64.so.1 and fails the whole build
# after two hours of real compilation. That is exactly how run 34239883194 ended.
#
# Removing the guard costs nothing on a tree without ee/: `delete` tolerates a missing
# path, and the find is wrapped in a directory test.

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

omnibus_dir="${1:?usage: patch-frontend-islands-cleanup.sh <omnibus-gitlab-dir>}"
file="$omnibus_dir/config/software/gitlab-rails.rb"
test -f "$file" || die "$file is missing; the omnibus layout has changed and this patch needs revisiting."

python3 - "$file" <<'PY'
import difflib, pathlib, sys
path = pathlib.Path(sys.argv[1])
before = path.read_text(encoding='utf-8')
old_delete = '  delete "#{install_dir}/embedded/service/gitlab-rails/ee/frontend_islands/node_modules" if EE\n'
old_find = '  command "find #{install_dir}/embedded/service/gitlab-rails/ee/frontend_islands/apps -name \'node_modules\' -type d -exec rm -rf {} +" if EE\n'
new_delete = '  delete "#{install_dir}/embedded/service/gitlab-rails/ee/frontend_islands/node_modules"\n'
new_find = ('  command "if [ -d #{install_dir}/embedded/service/gitlab-rails/ee/frontend_islands/apps ]; then '
            'find #{install_dir}/embedded/service/gitlab-rails/ee/frontend_islands/apps -name node_modules -type d -prune -exec rm -rf {} +; fi"\n')
for anchor, label in ((old_delete, 'delete'), (old_find, 'find')):
    count = before.count(anchor)
    if count != 1:
        sys.exit('expected exactly one %s anchor guarded by "if EE", found %d; refusing to patch blind' % (label, count))
after = before.replace(old_delete, new_delete).replace(old_find, new_find)
path.write_text(after, encoding='utf-8', newline='')
sys.stdout.writelines(difflib.unified_diff(before.splitlines(True), after.splitlines(True), 'a/config/software/gitlab-rails.rb', 'b/config/software/gitlab-rails.rb'))
print('frontend-islands node_modules cleanup is now unconditional')
PY

# Nothing may still remove that directory conditionally.
if grep -n 'frontend_islands.*if EE' "$file"; then
  die "a conditional frontend_islands cleanup survived the patch"
fi
