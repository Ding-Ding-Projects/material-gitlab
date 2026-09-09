#!/usr/bin/env bash
# Install the full dependency set before compiling assets, not a production-only one.
#
# Usage: patch-assets-install.sh <omnibus-gitlab-dir>
#
# The gitlab-rails definition runs `yarn install --pure-lockfile --production` and then
# `rake gitlab:assets:compile`. Upstream's omnibus never actually compiles assets: it
# copies pre-built assets from a CI job whose node_modules holds the dev dependencies too.
# This build has no such job, so it compiles from scratch (COMPILE_ASSETS=true) against a
# production-only tree, and that tree is missing a package the production bundle still needs.
#
# The exact failure of run 34293113846, three attempts, exit 1 each:
#   Module not found: Error: Can't resolve 'graphql-ws' in
#   '.../node_modules/@graphiql/toolkit/dist/cjs/create-fetcher'
#   Error: Unable to compile production assets.
# graphql-ws is not a declared dependency of @graphiql/toolkit; the toolkit requires it
# optionally, and the only chain that installs it (@graphql-tools/url-loader ->
# executor-graphql-ws -> graphql-ws) is pruned by --production, while @graphiql/toolkit
# itself reaches the production bundle through graphiql -> @graphiql/react.
#
# Dropping --production makes graphql-ws physically present at compile time, exactly as it
# is in the upstream assets CI job. It costs the package nothing: the definition moves
# node_modules out of the rails app to the cache root after the compile, so no node_modules
# ships in the package whether the install was production-only or full.

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

omnibus_dir="${1:?usage: patch-assets-install.sh <omnibus-gitlab-dir>}"
file="$omnibus_dir/config/software/gitlab-rails.rb"
test -f "$file" || die "$file is missing; the omnibus layout has changed and this patch needs revisiting."

python3 - "$file" <<'PY'
import difflib, pathlib, sys
path = pathlib.Path(sys.argv[1])
before = path.read_text(encoding='utf-8')
old = "  command 'yarn install --pure-lockfile --production'\n"
new = "  command 'yarn install --pure-lockfile'\n"
count = before.count(old)
if count != 1:
    sys.exit('expected exactly one production yarn-install anchor, found %d; refusing to patch blind' % count)
after = before.replace(old, new)
path.write_text(after, encoding='utf-8', newline='')
sys.stdout.writelines(difflib.unified_diff(before.splitlines(True), after.splitlines(True), 'a/config/software/gitlab-rails.rb', 'b/config/software/gitlab-rails.rb'))
print('asset-compile yarn install now includes dev dependencies')
PY

# No yarn install for the asset build may still carry --production.
if grep -n "yarn install.*--production" "$file"; then
  die "a production-only yarn install survived the patch"
fi
