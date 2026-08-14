# Material GitLab Deployer

This package is a small Electron preview shell for selecting a deployment target and reviewing a bounded command plan. It supports WSL2, local Docker, and SSH Docker targets.

## Scope and safety boundary

The shell is preview-only. It validates configuration and renders an allowlisted plan, but never executes Docker, WSL2, SSH, or arbitrary shell commands. It does not create hosts, contact an SSH endpoint, expose ports, or store secret values. SSH settings are configuration records only; `secretRefs` are opaque references for a future credential-vault integration and are never resolved by this package.

## Build

Run `build.bat` from any current directory on Windows. It first anchors the process to this package directory, then checks for Node.js 20+ and npm, installs the package-owned dependencies from `package-lock.json`, and compiles with the pinned TypeScript 5.9.3 compiler and Node 22.20.1 types. Use `build.bat /s` (also `--silent` or `SILENT=1`) for a non-interactive build. The script never deploys.

`npm run build` performs the compile and asset-copy steps directly; `npm start` launches the local preview shell.

## Squirrel.Windows packaging

`build-installer.bat` is the package-owned entry point for the Windows installer. Run it
from any directory, or use `/s` (also `--silent` or `SILENT=1`) for an unattended build.
It builds the package first and then invokes the checked-in Squirrel.Windows configuration;
do not substitute an ad-hoc `electron-builder` command. The script never deploys, publishes,
tags, or contacts a host.

The checked-in Electron Builder metadata writes to `dist/squirrel-windows/`. A ready unsigned package contains
all of the following from the same build and version:

| Asset | Purpose |
| --- | --- |
| `Setup.exe` | Squirrel bootstrap installer users download and run. |
| `RELEASES` | Update-feed index consumed by Squirrel clients. |
| `<package>-<version>-full.nupkg` | Complete update package; this is required even when no delta package is generated. |

Delta `.nupkg` files may also be present. They are supplementary; the full package, `RELEASES`,
and `Setup.exe` are the minimum installer set. The build's staging report should name the exact
files and SHA-256 values. Do not treat a directory listing or a stale file left by an older build
as evidence that the current commit produced an asset.

### Icon and metadata

The Squirrel configuration references the committed original application icon at
`build/icon.ico` and the package metadata in `package.json`. Keep the icon source in this package
(rather than a mutable URL), use a valid
multi-resolution Windows `.ico`, and keep the package author, application identifier, version,
artifact name, and public HTTPS update-feed metadata in the checked-in packaging configuration.
The icon is presentation metadata only: changing it must not change the installed identity or
update feed. A framework-default icon, a missing icon, or metadata that points at an unreachable
or mutable asset blocks packaging readiness.

The package metadata also declares the public Git repository explicitly (the `repository`
field, including its HTTPS URL). This is required by Electron Builder's PublishManager even
for a local Squirrel build: without it, repository detection can fail with `Cannot detect
repository by .git/config`. The metadata declaration is packaging input only; it does not
grant the local build permission to contact or modify that repository.

The package command is invoked with `--publish never`. That explicit no-publish boundary is
intentional: PublishManager must not publish, clean up, or reject the locally generated
Squirrel files merely because a repository publisher is unavailable. A successful local run
therefore means only that the unsigned installer assets were produced and verified locally;
it never creates a GitHub/GitLab release, uploads an asset, tags a commit, or otherwise
publishes anything.

### Unsigned verification boundary

Code signing is permanently disabled. `Setup.exe` and every generated update executable are
unsigned and may show an unknown-publisher or SmartScreen warning on Windows. Packaging readiness
means that the real files exist under `dist/squirrel-windows/`, the full `.nupkg` is referenced by
`RELEASES`, the files correspond to the intended commit and version, and the executables report
an unsigned state. It does **not** mean the installer was executed, a host was contacted, an
update was downloaded, or a release was published. Those are separate evidence boundaries.

This documentation records the packaging contract only; it does not claim that a build has run or
that these assets currently exist in this checkout.

## Configuration records

`src/shared/model.ts` defines the typed WSL2, local Docker, and SSH Docker records. `src/shared/configuration.ts` validates bounded paths, image references, environment keys, ports, and opaque secret references. `src/shared/plan.ts` builds the redacted, non-executing command plan. Keep WSL2 distribution names, local Docker socket choices, and SSH host/user/port values as user-provided configuration; do not turn them into host provisioning or transport side effects.
