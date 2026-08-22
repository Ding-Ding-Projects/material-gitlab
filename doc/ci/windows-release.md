---
title: Windows release workflow
description: Build, package, and publish the Windows release with reproducible evidence.
---

# Windows release workflow

This page describes the Windows-only release contract. The workflow builds the
repository from a pinned commit, packages the supported artifact, and publishes
one uniquely tagged release only when build, packaging, and publication succeed.

## Run the supported build path

Manual release preparation uses the two app-local installer scripts, in silent
mode:

```bat
tools\material-gitlab-deployer\build-installer.bat /s
tools\material-gitlab-instant\build-installer.bat /s
```

Each script bootstraps its own declared Node.js dependencies, builds its own
app, and packages from that app root. Neither script publishes, tags, pushes, or
creates a release. The Rails monorepo root `build.bat` and source-ZIP
`build-installer.bat` are not part of this app-release path and must not run in
this workflow.

Each app must produce its own fresh unsigned Squirrel.Windows asset set under
`dist\squirrel-windows`: a non-empty `*-Setup.exe`, an adjacent non-empty
`RELEASES` index, and a non-empty `*-full.nupkg`. The workflow validates both
sets independently and stages them separately before prefixing release asset
names. A set from one app never substitutes for the other, and a source ZIP is
never renamed to look like an installer.

## Workflow stages

1. Check out the intended commit and record its full SHA.
2. Bootstrap each app's declared toolchain and dependencies on a clean Windows
   runner, without running the Rails monorepo Yarn install.
3. Clean each app's prior `dist\squirrel-windows` output and run both local
   `build-installer.bat /s` commands.
4. Validate both unsigned Squirrel asset sets: Setup.exe, adjacent RELEASES,
   and a full `.nupkg`, along with size, digest, and source commit.
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
at the final release-publication step. The release tag, target commit, package
manifest, and asset digests are checked against the same immutable commit.

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

Stop publication and report the exact evidence when either app's bootstrapping
or installer script fails, either app's output is stale or malformed, either
app lacks `*-Setup.exe`, adjacent RELEASES, or a full `.nupkg`, the target SHA does
not match, timing or line-count evidence is missing, a required asset is
unavailable, or any tool attempts to sign. Artifact collection must still run defensively with
`if: ${{ always() }}`, `continue-on-error: true`, and
`if-no-files-found: warn`; it must never turn a failed build green.

## Related documentation

- [Windows release dependency inventory](../../.github/workflows/windows-release-dependencies.md)
- [Local build and installer scripts](../../BUILD.md)
