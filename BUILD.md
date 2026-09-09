# Local build scripts

This repository has **three separate pairs** of `build.bat` / `build-installer.bat` scripts, and they
build three different things. None of the root pair produces a GitLab installer; see
[README.md](README.md) for how to actually run this fork.

| Location | `build.bat` produces | `build-installer.bat` produces |
| --- | --- | --- |
| Repository root | The GitLab Rails frontend, compiled into `public/assets` | An unsigned **source ZIP** of this checkout (`git archive`), not an installer |
| `tools/material-gitlab-deployer/` | A runnable Electron preview build | An unsigned **Squirrel.Windows installer** for the Deployer shell |
| `tools/material-gitlab-instant/` | A runnable Electron preview build | An unsigned **Squirrel.Windows installer** for the Instant shell |

The two desktop-tool installers are what [`windows-release.yml`](.github/workflows/windows-release.yml)
builds and publishes on every push to `main`; that workflow calls the scripts under
`tools/material-gitlab-deployer/` and `tools/material-gitlab-instant/` directly and never touches the
root pair. The root pair only builds and archives the GitLab application source itself, which is a
Ruby and Node application with no native Windows installer of its own; running it needs the full
from-source install procedure described in [README.md](README.md).

All six scripts share the same behavior described below: safe to repeat, bootstrap their own
dependencies, never touch signing or credentials, and never publish anything.

## Root scripts: GitLab frontend build and source archive

- `build.bat` bootstraps Node.js, Yarn, and Git for Windows if any are missing, installs JavaScript
  dependencies from `yarn.lock`, and builds the frontend islands plus the production webpack bundle
  into `public/assets`. It does not start Ruby, PostgreSQL, Redis, Gitaly, Workhorse, or
  gitlab-shell, and it does not produce a runnable GitLab instance by itself.
- `build-installer.bat` runs `build.bat /s` first so the archive cannot rely on stale output, then
  packages the current commit as `build\artifacts\gitlab-source-<version>-<sha12>.zip` with
  `git archive`. It validates the ZIP has at least one entry, reports its path, byte size, and
  SHA-256, and never publishes, tags, pushes, or contacts a release service.

```bat
build.bat
build-installer.bat
```

Add `/s` (or `--silent`, or set `SILENT=1`) for an unattended run with no prompt:

```bat
build.bat /s
build-installer.bat /s
```

Without silent mode, `build.bat` asks whether to launch `yarn dev-server` only after a successful
build.

## Desktop tool scripts: Squirrel.Windows installers

Each desktop tool package owns its own pair, run from inside that package's directory:

```bat
cd tools\material-gitlab-deployer
build.bat /s
build-installer.bat /s

cd ..\material-gitlab-instant
build.bat /s
build-installer.bat /s
```

`build.bat` bootstraps that package's Node dependencies and produces a runnable Electron build.
`build-installer.bat` packages it with `electron-builder --win squirrel`, producing an unsigned
`Setup.exe`, a `RELEASES` index, and a full `.nupkg` under that package's own Squirrel output
directory (`dist/squirrel-windows` for the Deployer, `installer/squirrel-windows` for Instant).
Neither script publishes, tags, or pushes; [`windows-release.yml`](.github/workflows/windows-release.yml)
is what collects both packages' output and creates the GitHub release.

## What every phase reports

All six scripts report each phase and its elapsed time:

1. Detect the checkout and declared toolchain requirements.
2. Check for compatible user-scoped tools and bootstrap missing dependencies from their canonical
   upstreams.
3. Install project dependencies from the repository's manifests and lockfiles.
4. Build through the same supported path used for the local artifact.
5. Verify the expected output exists and came from the intended checkout.

A successful run is not reported when the build or packaging step leaves a missing, stale, or
malformed artifact.

## Unsigned installer warning

Code signing is intentionally disabled across this project. Both desktop-tool Squirrel installers
are unsigned and may trigger an unknown-publisher or SmartScreen warning on Windows; the root
source ZIP is not a native installer at all, so signing does not apply to it. No script discovers,
requests, or invokes a signer, and a signing prompt or signer failure is a packaging failure rather
than a reason to obtain a certificate.

## Verification boundary

These scripts build and package; they do not run tests, lint, type checks, captures, or release
gates. Run the repository's local checks separately when a task requires them, and report their
real result. A successful script run proves only that the requested runnable or installer artifact
was produced and verified locally; it is not evidence of a green GitHub Actions workflow,
runtime/UI verification, or a published release.

## Building the Omnibus package or the container image

Neither pair above builds the Debian package or the container image that actually let you install
and run this fork on Linux. Those are produced by
[`.github/workflows/omnibus-package.yml`](.github/workflows/omnibus-package.yml), which calls the
scripts under [`scripts/omnibus/`](scripts/omnibus/) inside the official Omnibus builder container.
See [README.md](README.md), sections **Install with Docker** and **Build the package yourself**, for
how to run that workflow or reproduce it locally on a Linux Docker host.

## Overlay provenance validator

Run [`scripts/verify-upstream-overlay.mjs`](scripts/verify-upstream-overlay.mjs) to confirm the
pinned upstream GitLab provenance record is present, well formed, and reachable from the current
checkout history. The validator fails closed if the manifest is missing or malformed, if the
upstream repository is not the canonical GitLab repository, or if the pinned commit is not in this
repository's history.

## Troubleshooting

When a phase fails, the output names the missing requirement, version constraint, canonical source
attempted, and blocking error. Fix the reported dependency or packaging issue and rerun the same
script. Do not substitute an ad-hoc packaging command: keeping these scripts as the documented local
paths makes a fresh-machine run reproducible.
