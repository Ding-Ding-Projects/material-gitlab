# Local build and installer scripts

The repository root provides two one-click scripts for Windows developer machines:

- `build.bat` bootstraps the toolchain and project dependencies, then builds a runnable checkout.
- `build-installer.bat` performs the same bootstrap and produces the installable artifact through the supported packaging path.

Both scripts are safe to repeat. They inspect the current machine first, reuse valid user-scoped caches, and install only missing requirements into the locations reported by the script. They do not require a pre-installed package manager or runtime, do not modify an unrelated global toolchain, and never install credentials or signing material.

## Commands

From a command prompt at the repository root:

```bat
build.bat
build-installer.bat
```

Use silent mode for automation or a fresh-machine bootstrap with no prompt:

```bat
build.bat /s
build-installer.bat /s
build.bat --silent
build-installer.bat --silent
```

`SILENT=1` is equivalent:

```bat
set SILENT=1
build.bat
build-installer.bat
```

Without silent mode, `build.bat` asks whether to launch the runnable result only after a successful build. `build-installer.bat` never publishes, tags, pushes, or creates a GitHub release; it only creates and verifies a local installer.

## What each phase reports

The scripts report each phase and its elapsed time:

1. Detect the checkout and declared toolchain requirements.
2. Check for compatible user-scoped tools and bootstrap missing dependencies from their canonical upstreams.
3. Install project dependencies from the repository's manifests and lockfiles.
4. Build through the same supported path used for the local artifact.
5. Verify the expected output exists and came from the intended checkout.

`build-installer.bat` additionally reports the installer path, expected package shape, and SHA-256 digest. A successful run is not reported when packaging leaves a missing, stale, or malformed artifact.

## Unsigned installer warning

Code signing is intentionally disabled. The generated installer is unsigned and may trigger an unknown-publisher or SmartScreen warning on Windows. The scripts do not discover, request, or invoke a signer, and a signing prompt or signer failure is a packaging failure rather than a reason to obtain a certificate.

## Verification boundary

These scripts build and package; they do not run tests, lint, type checks, captures, or release gates. Run the repository's local checks separately when a task requires them, and report their real result. A successful script run proves only that the requested runnable or installer artifact was produced and verified locally; it is not evidence of a green GitHub Actions workflow, runtime/UI verification, or a published release.

## Overlay provenance validator

Run [`scripts/verify-upstream-overlay.mjs`](scripts/verify-upstream-overlay.mjs) to confirm the pinned upstream GitLab provenance record is present, well formed, and reachable from the current checkout history. The validator fails closed if the manifest is missing or malformed, if the upstream repository is not the canonical GitLab repository, or if the pinned commit is not in this repository's history.

## Troubleshooting

When a phase fails, the output names the missing requirement, version constraint, canonical source attempted, and blocking error. Fix the reported dependency or packaging issue and rerun the same script. Do not substitute an ad-hoc packaging command: keeping both scripts as the single documented local paths makes a fresh-machine run reproducible.
