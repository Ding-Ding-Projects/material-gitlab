# Windows release dependency inventory

This page is the dependency inventory for the Windows release workflow. It is
kept beside the workflow so a fresh runner can be audited without relying on
machine-specific setup.

## Supported scope

The release job targets Microsoft Windows only. It is invoked by `push` and by
`workflow_dispatch`. A release is published only after the build and packaging
steps produce and validate their declared artifacts; test, lint, type-check,
static-analysis, accessibility, and screenshot jobs are not part of this
workflow and must not be added to a release `needs:` chain.

## Bootstrap inventory

The job must check for each item, install only what is missing, and record the
resolved version in its run summary:

| Item | Source of truth | Bootstrap requirement |
| --- | --- | --- |
| Node.js | `.nvmrc` and `package.json` | Install a user-scoped compatible LTS runtime from the canonical Node.js package source. |
| Yarn | `package.json`, `yarn.lock`, and `build.bat` | Activate Yarn 1.22.22 through Corepack, or use the documented user-scoped npm fallback. |
| Git | repository tooling and `build-installer.bat` | Use the runner's Git only after verifying that `git archive`, `git rev-parse`, and hashing are available. |
| PowerShell | `build-installer.bat` validation command | Use the runner's PowerShell for ZIP validation and SHA-256 calculation. |
| Repository dependencies | `yarn.lock` | Run `yarn install --frozen-lockfile --non-interactive --no-progress`; do not mutate the lockfile. |

The root scripts are the supported local and manual release path:

```bat
build.bat /s
build-installer.bat /s
```

The first command must complete before the second starts. Silent mode must not
prompt, open a window, or wait for input. A missing dependency, failed
bootstrap, failed build, stale output, or malformed archive is a hard failure;
the job must stop before publication and retain its logs and safe diagnostics.

## Artifact and evidence collection

Every build or packaging job collects safe output with `if: ${{ always() }}`.
Collection and upload use `continue-on-error: true` and
`if-no-files-found: warn`, so evidence collection never hides the original
failure. The collected metadata includes the run identifier, commit SHA, job
result, runner image, resolved tool versions, artifact paths, byte sizes, and
SHA-256 digests. Do not upload credentials, dependency directories, caches,
source trees, or temporary files.

The collector must verify that each artifact exists, is readable, and was
created from the intended commit. It must not accept a file left by an earlier
run. The current repository's packaging script creates an unsigned source ZIP
because no native Windows installer is declared; it must not be described as a
native installer. If the release contract requires an installer, packaging is
blocked until a supported installer path exists.

## Deliberate verification boundary

This workflow builds, packages, publishes, and records evidence. It does not
run tests, lint, type checks, static analysis, accessibility checks, or
screenshot capture. Release notes must say exactly which checks were not run;
an artifact-only workflow is not a claim that the application is tested or
runtime-verified.

## Release metadata requirements

The release publisher records `Workflow started`, `Workflow completed`, and
`Workflow duration` using UTC ISO-8601 timestamps. Duration is measured from the
first job's actual start through the final publication step, not from draft
creation and not from an estimate. The release target commit, tag, and every
attached asset are checked against the same immutable SHA.

The line-count script committed by the repository is the only source for the
release line-count table. The notes include its command, source/test/style (or
markup) totals, blank and non-blank counts, generated and vendored exclusions,
and surviving-line attribution. Agents must not replace this table with a
hand-count.

Each release also resolves a unique dim-sum code name from the published
`Ding-Ding-Projects/dim-sum-photos` catalog. The selected record must have a
published `catalog-v1*` photo asset. Notes identify the English and Traditional
Chinese names and link to that public asset; the workflow never vendors or
copies the image into this repository. If the catalog, an unused published
record, or its photo asset cannot be resolved, publication is blocked and the
release reports the missing metadata rather than inventing a dish or shipping
without the required code name.

All Windows artifacts are unsigned. Release notes identify the unsigned status
and the possible unknown-publisher or SmartScreen warning. No certificate,
private key, signing service, or signer auto-discovery may be requested or
invoked.

## Fail-closed blockers

The publisher must stop and report the exact blocker when any of these occurs:

- the required runtime, package manager, or dependency cannot be bootstrapped;
- `build.bat /s` or `build-installer.bat /s` fails;
- an expected artifact is missing, stale, malformed, or cannot be tied to the
  intended commit;
- the release target, timing evidence, line-count output, or required asset is
  unavailable;
- the selected dim-sum asset is not a published catalog asset; or
- packaging attempts to invoke code signing.

Do not substitute an ad-hoc build command, publish an unverified artifact, or
call a failed or incomplete release successful.
