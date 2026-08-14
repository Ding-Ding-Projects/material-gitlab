# GitHub Actions release dependency inventory

This inventory defines the dependencies and fresh-run bootstrap requirements for the
Windows release path. It is intentionally separate from workflow YAML so a workflow
change can be checked against one reviewed, neutral record. The Windows workflow is
currently being introduced and must remain mapped to the rows below before it is
enabled.

## Scope and policy

- Target platform: Windows only.
- Triggers: `push` and `workflow_dispatch` when the release workflow is introduced.
- The workflow builds, packages, publishes, and records release evidence.
- Tests, lint, type checks, static analysis, coverage, and screenshot checks are not
  workflow steps and are not release gates.
- Code signing tools, certificates, private keys, and signing credentials are never
  installed or requested. Published Windows artifacts are unsigned and must say so.
- Every dependency is checked before installation and is installed into a
  job-scoped or user-scoped location on a fresh runner. No dependency is assumed to
  be preinstalled merely because a runner image is selected.

## Job inventory

| Job | Required tools and inputs | Fresh-run bootstrap and post-bootstrap proof | Safe outputs |
| --- | --- | --- | --- |
| `build` | `actions/checkout@v4`; Git; PowerShell; GitHub CLI (`gh`); the runtime and package manager versions declared by the repository (`.nvmrc`, `package.json`, lockfiles, `Gemfile`, and other manifests); `build.bat`; `build-installer.bat`; `actions/upload-artifact@v4` | Resolve versions from manifests, install only missing tools from their canonical upstreams, refresh the current process `PATH`, then print each resolved version and verify the checkout is at the requested SHA. Run both committed scripts from a clean checkout and fail closed when either script is absent. Verify the expected runnable output, installer, release index, package files, and unsigned status | Bootstrap/build log, package manifest, installer metadata, hashes, failed-build diagnostics, and safe evidence artifact |
| `release` | `actions/checkout@v4`; `actions/download-artifact@v4`; Git; PowerShell; GitHub CLI (`gh`); an ephemeral token supplied through `GH_TOKEN`/`GITHUB_TOKEN` using `RELEASE_TOKEN || ORG_TOKEN || GITHUB_TOKEN` | Confirm the downloaded evidence, target SHA, unique tag, required installer assets, unsigned status, line-count table, workflow timing, and a catalog-backed dim-sum code name before publishing one non-draft release. Verify the published release and each asset after publication | Release URL, tag/SHA record, asset URLs and hashes, timing record, line-count table, and publication log |

### Current repository boundary

The current revision does not contain root-level `build.bat` or
`build-installer.bat`. The `build` job must therefore stop with a clear missing-route
message until those supported scripts are added; it must not substitute an ad-hoc
command or claim that a release artifact exists.

## Dependency sources and constraints

1. **Repository manifests are authoritative.** Read version files and lockfiles in
   the checkout first. Do not choose a newer runtime or package manager because it is
   present on the runner.
2. **Canonical upstreams only.** Runtime installers, package managers, and build
   tools come from their official distribution channels. Do not download tools from a
   workflow artifact, an issue comment, or an unreviewed mirror.
3. **Runner selection is evidence, not dependency provisioning.** A compatible
   Windows runner image may provide a tool, but the job still checks its version and
   bootstraps the declared version when it is absent or incompatible.
4. **Secrets stay in the hosting service.** Tokens are passed only through the
   supported environment convention, never echoed, written to artifacts, or placed
   in command arguments. Signing credentials are prohibited regardless of availability.
5. **Safe artifact collection is unconditional.** Build, package, and release jobs
   collect explicitly allowlisted logs and outputs with `always()` semantics and
   bounded retention. Collection is best-effort and must not mask the original job
   failure.

## Fresh-run acceptance checklist

- [ ] A clean Windows runner reaches the first build command without manual setup.
- [ ] Root-level `build.bat` and `build-installer.bat` exist before dispatching a release.
- [ ] Every installed version is printed with its source and constraint.
- [ ] The current process sees newly installed executables after `PATH` refresh.
- [ ] The build uses the supported repository script, not an ad-hoc command.
- [ ] The installer and update assets exist, are unsigned, and hash successfully.
- [ ] No tests or lint steps appear in the release workflow or its `needs:` chain.
- [ ] Release publication uses one unique non-draft tag and the intended commit.
- [ ] Post-publication checks can download every required asset and verify its hash.
- [ ] Failure collection records the run ID, SHA, job status, and runner context.

This document is an inventory, not a claim that a published artifact currently exists.
A missing dependency, missing build script, or unverified artifact remains an explicit
implementation item.
