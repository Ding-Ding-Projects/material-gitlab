# Material GitLab Deployer

This package is a small Electron preview shell for selecting a deployment target and reviewing a bounded command plan. It supports WSL2, local Docker, and SSH Docker targets.

## Scope and safety boundary

The shell is preview-only. It validates configuration and renders an allowlisted plan, but never executes Docker, WSL2, SSH, or arbitrary shell commands. It does not create hosts, contact an SSH endpoint, expose ports, or store secret values. SSH settings are configuration records only; `secretRefs` are opaque references for a future credential-vault integration and are never resolved by this package.

## Build

From this directory, run `build.bat` on Windows. The script checks for Node.js and npm, installs the declared dependencies (`npm ci` when a lockfile exists, otherwise `npm install`), compiles TypeScript, and offers to launch the preview shell. Use `build.bat /s` (also `--silent` or `SILENT=1`) for a non-interactive build. The script never deploys.

`npm run build` performs the compile and asset-copy steps directly; `npm start` launches the local preview shell.

## Installer status

`build-installer.bat` is deliberately fail-closed (exit code 2). This package does not yet carry a verified app icon or Squirrel.Windows packaging configuration, so it must not claim to produce an installer. When packaging is added, it must use the supported Squirrel.Windows path, keep code signing disabled, and verify the unsigned setup and update assets before publication. No installer is currently shipped.

## Configuration records

`src/shared/model.ts` defines the typed WSL2, local Docker, and SSH Docker records. `src/shared/configuration.ts` validates bounded paths, image references, environment keys, ports, and opaque secret references. `src/shared/plan.ts` builds the redacted, non-executing command plan. Keep WSL2 distribution names, local Docker socket choices, and SSH host/user/port values as user-provided configuration; do not turn them into host provisioning or transport side effects.
