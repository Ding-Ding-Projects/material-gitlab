# Changelog

## Unreleased

### Release pipeline repairs

- Stop the Windows release body exceeding GitHub's 125,000 character limit. The notes step inlined
  the entire line-count JSON report, which for a tree tracking 107,565 files serialises to about
  161,000 characters, so `gh release create` failed with HTTP 422 and the run then reported a
  misleading "did not resolve to the exact non-draft target commit" from the 404 that followed. The
  body now carries a summary of buckets, totals, authorship and exclusions, and the complete report
  ships as a `LINE-COUNT.json` release asset with its SHA-256 appended to `SHA256SUMS.txt`. Measured
  against a fixture reproducing the old report, the body went from 168,517 characters to 1,721.
- Add a fail-closed guard that throws a named error when the release body exceeds 120,000
  characters, so a future overrun is diagnosed directly instead of as an opaque 422. Confirmed red at
  a deliberately lowered threshold and green when restored.
- Raise the Windows release job timeout from 120 to 360 minutes, the GitHub hosted runner ceiling.
  Several earlier runs were cancelled at exactly the old cap.
- Trigger both workflows on `main` only. They previously ran on every branch, so each feature push
  started a multi-hour Windows build, and the Pages `deploy` job had no branch condition at all,
  which meant a push to any branch deployed that branch to the live site. The deploy job also keeps
  an explicit main-only condition as defence in depth.

### Build repairs

- Make the Instant package compile. `src/main/lifecycle.ts` and `src/shared/model.ts` are an
  unreferenced parallel implementation whose conflicting `Window.gitlabInstant` global declaration
  and missing imports failed the whole package build with `TS2305`, `TS2687` and `TS2717`. They are
  excluded in `tsconfig.json` rather than deleted, so the package builds while the half-finished work
  stays visible.

### Documentation

- Rewrite the README. It now states what the project is, that nothing here deploys GitLab, the two
  verified site captures with their receipts and the surfaces that have none, measured line counts,
  a labelled human time estimate, and every local check with its real result.

### Earlier unreleased work

- Add the dedicated design-reference application, 25-row parity inventory, deterministic route contract, and fail-closed capture/diff receipts. Real screenshots remain pending the approved Lowlevel headless capture run.
- Replace the collaboration and CI design prototypes' production data paths with real GitLab REST integrations for Merge Requests, Pipelines, Code, and Build surfaces.
- Record the official upstream GitLab repository and pinned commit for the overlay bootstrap lane.
- Add a closed-fail provenance validator for the pinned upstream commit.
- Document the repository-level Windows bootstrap, packaging, roadmap, and handoff entry points.
