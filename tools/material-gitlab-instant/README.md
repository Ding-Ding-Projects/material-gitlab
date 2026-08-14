# GitLab Instant

GitLab Instant is a configuration-only Electron shell for preparing a local GitLab instance target. It does not execute deployment commands. The target choices are WSL2, local Docker, and SSH Docker; each remains an explicit configuration and readiness state.

## Target configuration and readiness

- **WSL2** selects a Linux distribution and uses a bounded `wsl.exe --status` probe. The app does not install a distribution or run a deployment shell command.
- **Local Docker** uses the local Docker Engine and a bounded `docker.exe version` probe. The app records the endpoint choice only.
- **SSH Docker** accepts a host and user as configuration. It is deliberately configuration-only: no host is contacted and no SSH secret is read or printed.

Not-ready or unsupported states remain reviewable and explain the exact next configuration step; they are never presented as a successful deployment.

## Build and unsigned installer

Run `build.bat` from this directory. It bootstraps a user-scoped Node.js LTS through `winget` when needed, installs the declared dependencies, compiles TypeScript, and copies the local renderer assets. Use `build.bat /s`, `build.bat --silent`, or `SILENT=1` for unattended operation.

Run `build-installer.bat` to build and package through `electron-builder --win squirrel`; it invokes the application build first and then runs the Squirrel packaging path. For an explicit unattended invocation, use `build-installer.bat /s` (the wrapper always keeps the packaging step non-interactive). The script verifies the produced `Setup.exe`, the adjacent `RELEASES` index, its SHA-256 digest, and `NotSigned` status. Squirrel assets are emitted under `installer\squirrel-windows\`, kept separate from the compiled application entry point under `app-dist\`. Code signing keys and certificates are intentionally not used; Windows may show an unknown-publisher warning.

The installer uses the committed `build\icon.ico` mark (generated from `assets\icon.svg` by `scripts\generate-icon.ps1`) at 16, 24, 32, 48, 64, 128, and 256 pixels. The package identity remains `com.materialgitlab.instant`; changing the display name does not change its application-data location or update identity.

Local packaging is build-only: `build-installer.bat` creates and verifies an unsigned installer on this machine, but it never publishes a release, creates a tag, uploads an asset, or contacts a release service.

The build scripts do not create hosts, contact SSH endpoints, expose ports, or provision a local Docker/WSL2 environment. Those are user-selected configuration choices only.
