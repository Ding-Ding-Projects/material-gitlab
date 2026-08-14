# Material GitLab overlay handoff

## Scope

This repository is being bootstrapped as an original overlay project. It records the official upstream GitLab repository and pinned commit for provenance while keeping the overlay code, tooling, and documentation separate from upstream EE source.

## Current state

- Root `build.bat` and `build-installer.bat` provide the documented Windows bootstrap and packaging entry points.
- `upstream-overlay.json` records the official upstream repository and commit.
- `scripts/verify-upstream-overlay.mjs` fails closed if the provenance record is absent, malformed, or the pinned commit is not present in the current checkout history.
- Root `README.md` and `BUILD.md` describe the local build and packaging workflow.

## Verification

Build and packaging evidence remains the accepted boundary for this issue lane. The lane does not require tests, lint, accessibility, or screenshot workflows.

## Remaining work

- Add the first concrete overlay update/apply path when the upstream sync flow is ready.
- Keep the provenance manifest and documentation in step with future overlay changes.

## Next owner action

Continue on `feature/bootstrap-overlay-20260814`, integrate the remaining overlay workflow when ready, then merge and verify the resulting commit on the default branch.
