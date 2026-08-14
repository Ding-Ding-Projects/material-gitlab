# Material GitLab Deployer

This package is a small Electron preview shell for selecting a deployment target and reviewing a bounded command plan. It supports WSL2, local Docker, and SSH Docker targets.

## Scope and safety boundary

The shell is preview-only. It validates configuration and renders an allowlisted plan, but never executes Docker, WSL2, SSH, or arbitrary shell commands. It does not create hosts, contact an SSH endpoint, expose ports, or store secret values. SSH settings are configuration records only; `secretRefs` are opaque references for a future credential-vault integration and are never resolved by this package.

## Build

Run `build.bat` from any current directory on Windows. It anchors the process to this package directory, checks for Node.js 20+ and npm, installs package-owned dependencies from `package-lock.json` with `npm ci`, compiles with the pinned TypeScript 5.9.3 compiler and Node 22.20.1 types, and offers to launch the preview shell after a successful non-silent build. Use `build.bat /s` (also `--silent` or `SILENT=1`) for a non-interactive build. The script never deploys.

`npm run build` performs the compile and asset-copy steps directly; `npm start` launches the local preview shell.

## Installer status

`build-installer.bat` uses the supported Squirrel.Windows packaging path and writes unsigned assets to `dist/squirrel-windows/`. It runs the regular build first, packages the x64 Electron app, then verifies that `Material-GitLab-Deployer-0.1.0-Setup.exe`, `RELEASES`, and the full `.nupkg` are present and that the update index references the package. Code signing is permanently disabled (`forceCodeSigning`, `signExecutable`, and `signAndEditExecutable` are all `false`); the resulting installer may show the operating system's unknown-publisher warning.

The committed original mark is `build/material-gitlab-deployer.svg`; `build/material-gitlab-deployer.ico` is a valid multi-resolution Windows icon generated from that mark and wired into both Electron and Squirrel metadata. Packaging never deploys, publishes, creates hosts, contacts SSH, or exposes ports.

## Configuration records

`src/shared/model.ts` defines the typed WSL2, local Docker, and SSH Docker records. `src/shared/configuration.ts` validates bounded paths, image references, environment keys, ports, and opaque secret references. `src/shared/plan.ts` builds the redacted, non-executing command plan. Keep WSL2 distribution names, local Docker socket choices, and SSH host/user/port values as user-provided configuration; do not turn them into host provisioning or transport side effects.
