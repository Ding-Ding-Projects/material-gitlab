# Candidate-pinned design parity runtime

`scripts/build-design-parity-runtime.ps1` prepares the local GDK runtime used for
design-parity verification. It accepts an exact Git commit and a task-owned output
directory. The helper streams a tar archive from `git archive` directly to Docker's
standard-input context with command-local `core.autocrlf=false` and `core.eol=lf`.
Without those overrides, Git applies the host line-ending configuration during archive
creation, even though the committed blobs use LF. The helper therefore preserves archive metadata such as executable
bits, avoids Windows extraction path limits, includes every tracked source file even
when the invoking checkout is sparse, and does not build a moving source directory.

```powershell
pwsh -NoProfile -File scripts/build-design-parity-runtime.ps1 `
  -Commit <40-character-commit-sha> `
  -OutputRoot C:\path\to\task-owned-output
```

The local build uses `docker buildx build --load --platform linux/amd64`, the
`qa/gdk/Dockerfile.gdk` recipe, and a local-only
`material-gitlab-parity:<commit-sha>` tag. It neither uses registry cache flags nor
publishes an image. The build arguments fix the runtime contract to
`RAILS_ENV=test`, `NODE_ENV=production`, `BABEL_ENV=production`, and
`NODE_OPTIONS=--max-old-space-size=10240`. In the absence of a CI assets-cache hash,
the recipe uses `/nonexistent/gitlab-assets-hash`, which selects asset compilation.
The checked-in `qa/gdk/.tool-versions` is the build input for Gem and Node setup. Its
Ruby, Node, and Go entries are derived from `.gitlab/ci/version.yml`; focused checks
compare the two candidate-bound sources and confirm the derived manifest is present in
the Git archive sent to Docker.

Before each GDK source stage executes candidate scripts, the recipe runs
`qa/gdk/normalize-executable-shebangs.py`. It uses one Python process over only the
candidate-owned `bin`, `scripts`, `config`, `lib`, and `ee` roots, skips symlinks and
`node_modules`, and changes only files whose first bytes are a shebang. Binary files and
ordinary text remain untouched, while any CRLF interpreter lines become
runnable in the Linux build context. The pinned base already includes Python.
Ruby's directory walker raised an internal `NotImplementedError` on the real
candidate tree, so normalization uses the independent standard-library walker.

Each successful build retains its archive and `receipt.json` under
`<OutputRoot>/<commit-sha>/`. The receipt records the source SHA, archive SHA-256,
composite recipe SHA-256, local image tag, image configuration ID, repository manifest
digests when available, selected builder, timeout, and completion time. It intentionally
records no credentials. Existing candidate output is refused rather than replaced.

`-TimeoutSeconds` bounds the owned archive and Docker processes, defaulting to 3600
seconds. A timeout terminates only those owned process trees. `-Builder` optionally
selects a task-owned Buildx builder, so callers can set bounded parallelism without
modifying shared Docker configuration.

Use `-DryRun` to validate the commit, output boundary, recipe files, tag, and exact
Docker invocation without creating an output directory or starting Docker:

```powershell
pwsh -NoProfile -File scripts/build-design-parity-runtime.ps1 `
  -Commit <40-character-commit-sha> `
  -OutputRoot C:\path\to\task-owned-output `
  -DryRun
```

Run the focused helper checks without Docker:

```powershell
pwsh -NoProfile -File scripts/tests/build-design-parity-runtime.tests.ps1
```

The helper refuses a filesystem root, any repository path or child path, an existing
Git checkout, an existing candidate directory, invalid commits, missing recipe files,
and failing archive, Docker, or inspection commands. It also refuses output roots that
contain the source repository, are a child of it, or traverse a junction or another reparse
point. It creates files only
inside the requested output root and never removes output from a prior candidate.
# Database-free asset compilation

The frontend-assets stage mirrors `setup_database_yml` in `scripts/utils.sh`:
it adapts the copied database host from `localhost` to `postgres` before Rails
asset initialization. The canonical `.compile-assets-base` job uses this
preparation with `SETUP_DB=false`. Rails handles an unavailable build database
through its existing connection-error path; asset compilation is not replaced
with a stub or prebuilt output.

Leaving the copied example on `localhost` caused a real build to wait inside
libpq on `::1:5432` after gettext completed. No webpack process had started.
This configuration change belongs only to the asset-build stage. Final GDK
setup still generates its actual runtime database configuration.
# RubyGems build compatibility

The GDK base supplied RubyGems 4.0.20, while `.gitlab/ci/version.yml` specifies
the 3.6 series. The build now installs the exact 3.6.9 patch recorded in
`qa/gdk/rubygems-version` after Ruby tool installation and before Bundler setup.
[RubyGems 3.6.9](https://rubygems.org/gems/rubygems-update/versions/3.6.9)
is the published final patch in that declared series. Bundler remains pinned by
`Gemfile.lock`. A version assertion prevents the stage from continuing on an
unintended RubyGems version.

The observed 4.0.20 failure occurred during Bundler checksum parsing, before
Bootsnap or application initialization. Changing cache or coverage behavior is
therefore not used as a repair. The next real build must verify this compatibility
correction; its presence in source is not a successful runtime verdict.
# Ruby runtime reconstruction

The inherited Ruby binary produced internal string/hash exceptions and an
interpreter crash during isolated package-manager operations. The gem stage now
rebuilds the same Ruby version declared in `qa/gdk/.tool-versions`, using the
installed GitLab Ruby plugin's documented `USE_PRECOMPILED_RUBY=false` path.
`qa/gdk/ruby-build-revision` pins the build definitions. The RubyGems compatibility
pin is applied after that installation, and both active versions are printed and
checked before the application bundle is installed.

This changes the toolchain inside the task image only. It does not alter a host's
installed Ruby or other workloads. Real build and runtime results are still
required; reconstructing the toolchain is not itself a parity verdict.

The archive byte regression extracts the tool-version manifest, RubyGems version, and
`bin/rake` from the exact dry-run archive command under an explicit hostile CRLF host
setting. It compares all three against `git show` bytes and checks executable mode.
Removing the archive configuration overrides must reproduce all three byte mismatches.

## Resource-bounded compilation

The source build at `b8ab0e36c78db0e8821f20e19bbe741d9e678868` passed Ruby and
service compilation but exhausted the builder's 16 GiB memory limit during
frontend compilation. It produced no accepted runtime image. The capture build
profile now sets `NO_SOURCEMAPS=1`, `NO_COMPRESSION=1`, and
`WEBPACK_MINIFY_IN_PROCESS=true`. The last flag retains production minification
while disabling the default multi-process Terser pool. It does not disable
application features or replace the Rails build with a preview.

The optimizer override is opt-in. Ordinary builds keep webpack's normal
minimizer when that flag is absent or false. A focused executable webpack fixture
verifies the selected profile emits working minified code without a source map;
invalid flag values fail. The helper dry run asserts all three build arguments.
This profile still requires a successful complete runtime build before its memory
benefit or capture readiness can be claimed.

## Packaged-instance route

The GDK recipe above is one way to obtain a running candidate. The route used for
production evidence from September 2026 is the packaged fork itself: the Omnibus package
built by `.github/workflows/omnibus-package.yml` (scripts under `scripts/omnibus/`), the
container image built from that package (`deploy/docker/`), and the root
`docker-compose.yml` running it on a dedicated Docker host. Because that instance runs
in production mode, the fixture seed accepts it through its `lan-omnibus` marker (see
`design_parity_fixture.md`).

Built-side receipts bind to the package as the rendered artifact. Run
`node scripts/design-parity/fetch-built-artifact.mjs --tag <release tag> --commit <sha>`
first: it downloads the release package into the ignored `artifacts/parity/_local/`
directory, verifies it against the release's own `SHA256SUMS.txt`, and writes
`artifacts/parity/built-artifact-manifest.json`, the source-commit-bound manifest that
`capture.mjs` and the strict guard verify against the same bytes. The session provenance
record for each built capture names the exact instance URL and the image digest that was
running, so a receipt can never be satisfied by a different build of the same commit.
