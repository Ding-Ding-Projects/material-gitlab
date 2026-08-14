---
title: Windows release workflow
description: Build, package, and publish the Windows release with reproducible evidence.
---

# Windows release workflow

This page describes the Windows-only release contract. The workflow builds two
application packages from a pinned commit, verifies both unsigned Squirrel.Windows
asset sets, and publishes one uniquely tagged release only when every contract
and publication check succeeds.

## Run the supported build path

The workflow invokes each package's scripts in silent mode:

```bat
tools\material-gitlab-instant\build.bat /s
tools\material-gitlab-instant\build-installer.bat /s
tools\material-gitlab-deployer\build.bat /s
tools\material-gitlab-deployer\build-installer.bat /s
```

For each package, `build.bat /s` bootstraps its declared dependencies and runs
the production build. Its companion `build-installer.bat /s` packages the exact
checkout and validates the unsigned Squirrel.Windows output. Neither script
publishes, tags, pushes, or creates a release.

The deployer package is currently fail-closed: `tools\material-gitlab-deployer\build-installer.bat /s`
exits 2 because verified icon and Squirrel metadata are not yet present. This
blocks publication of a dual-package release; the workflow must not substitute
an Instant-only release or rename another archive as a deployer installer.

The required per-package outputs are a fresh, non-empty `Setup.exe`, `RELEASES`,
and at least one `.nupkg` under `dist\squirrel-windows`. Staged names are
prefixed `material-gitlab-instant-*` and `material-gitlab-deployer-*`. The
collector also emits `BUILD-MANIFEST.txt` with `BUILD_SHA` and per-asset hashes,
plus `SHA256SUMS.txt`; all are tied to the exact triggering SHA.

## Workflow stages

1. Check out the intended commit and record its full SHA.
2. Bootstrap the repository's declared toolchain and dependencies on a clean
   Windows runner.
3. Run both application `build.bat /s` commands and fail closed on any
   non-zero result or missing output.
4. Run both application `build-installer.bat /s` commands and validate each
   Squirrel asset set, unsigned status, sizes, digests, and source commit.
5. Collect safe logs and metadata even when an earlier stage fails.
6. Publish one unique, non-draft release only after all publication inputs are
   verified.

The release workflow does not run tests, lint, type checks, static analysis,
accessibility checks, or screenshot capture. Those checks are outside this
workflow's verification boundary and release notes must not imply that they ran.

## Timing and target proof

Release notes include `Workflow started`, `Workflow completed`, and
`Workflow duration` with UTC ISO-8601 timestamps and a stable `HH:mm:ss`
duration. The clock starts at the first job's actual `startedAt` value and ends
at the final release-publication step. The release tag, target commit,
`BUILD-MANIFEST.txt`, and asset digests are checked against the same immutable
commit.

## Line count and dim-sum metadata

The committed line-count script produces the release table. It must report at
least source, tests, and styles/markup, with total and non-blank lines, generated
and vendored exclusions, and surviving-line attribution. The workflow runs that
script at the tagged commit and copies its output into the release notes.

Each release must include a dim-sum code name resolved from an unused record with
a published photo from the public catalog:

`https://raw.githubusercontent.com/Ding-Ding-Projects/dim-sum-photos/main/catalog/index.json`

Use the catalog's `name.en` and `name.zhHant` values exactly, and link to the
corresponding `catalog-v1*` release asset. Do not download, vendor, or attach a
copy of the photo in this repository. If the catalog, the unused record, or the
published photo cannot be verified, publication is blocked and the release must
report the missing evidence; it must never ship a version-only release or an
invented name.

## Unsigned artifacts and blockers

Code signing is permanently disabled. The release is explicitly unsigned and
may trigger an unknown-publisher or SmartScreen warning. No signing certificate,
private key, signer service, or certificate auto-discovery is permitted.

Stop publication and report the exact evidence when bootstrapping fails, either
application script fails (including the current deployer exit-2 blocker), a
required per-application asset is stale, empty, or malformed, the target SHA
does not match, timing or line-count evidence is missing, or any tool attempts
to sign. Artifact collection must still run defensively with
`if: ${{ always() }}`, `continue-on-error: true`, and
`if-no-files-found: warn`; it must never turn a failed build green.

## Related documentation

- [Windows release dependency inventory](../../.github/workflows/windows-release-dependencies.md)
- [Local build and installer scripts](../../BUILD.md)
