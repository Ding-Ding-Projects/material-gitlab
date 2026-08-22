# Material GitLab overlay handoff

## Scope

This repository is being bootstrapped as an original overlay project. It records the official upstream GitLab repository and pinned commit for provenance while keeping the overlay code, tooling, and documentation separate from upstream EE source.

## Current state

- Root `build.bat` and `build-installer.bat` provide the documented Windows bootstrap and packaging entry points.
- `upstream-overlay.json` records the official upstream repository and commit.
- `scripts/verify-upstream-overlay.mjs` fails closed if the provenance record is absent, malformed, or the pinned commit is not present in the current checkout history.
- Root `README.md` and `BUILD.md` describe the local build and packaging workflow.

## Verification

The design-contract lane now requires local tests, the supported frontend build, packaged runtime
interaction, and deterministic design-parity evidence. Evidence is bound to the commit that produced
it; a later commit supersedes an earlier build or capture verdict.

## Remaining work

- Add the first concrete overlay update/apply path when the upstream sync flow is ready.
- Keep the provenance manifest and documentation in step with future overlay changes.

## Design surface replacement foundation

The `design/` folder is the specification, not a reference. It holds exported `.dc.html`
prototype surfaces. Both CE and EE must render as those surfaces, and no original GitLab UI may
survive.

Last updated: 2026-08-19. Branch `feature/design-contract-foundation-20260819`, based on the
merged `origin/design-surface-replacement` source.

An important correction from the session that produced this file: a **token and override layer
applied over the existing Pajamas components was explicitly rejected** — "not the work i wanted".
The requirement is that the surfaces are **replaced** with the design, not restyled underneath.
Restyling `GlButton` so it looks Material is not the deliverable; the surface being the design is.

## Repository facts

This repository has **no shared history** with a clone of upstream GitLab. Verified:

```
git merge-base material/main <branch-from-upstream-clone>   -> (empty)
git rev-list --left-right --count <branch>...material/main
552101   55
```

It is a squashed source import plus prior work, not a fork carrying upstream history. A branch cut
from an upstream GitLab clone **cannot be merged here**. Always branch from this repository's own
`main`.

This repository is **public**. Commit messages, branch names, code comments, documentation, issues
and releases all take ordinary professional English.

## What already exists on `main`

Read `git log --oneline` before starting. Already present:

- Material 3 shell tokens, and Material shell hooks wired into both the Rails layouts and Vue navigation
- A fail-closed universal feature registry, and the universal feature inventory
- Notification and regex builder primitives
- Versioned Material settings and tokens, including scheduled site preferences
- The Material GitLab site shell, published through GitHub Pages, with a documentation runtime
- The dim-sum catalog, with bounded scanning and published-asset matching
- Squirrel.Windows packaging for both desktop applications
- **Both desktop applications**: the GitLab Instant shell, and the deployer

## What remains

The exact 25 checked-in design surfaces are recorded in `design/reference-registry.json` and the
explicit parity matrix lives in `design/parity-inventory.json`. The old disconnected surface branch
has been merged, its production seed data has been replaced with explicit Rails, REST, GraphQL, and
store adapters, and the shared shells are mounted on real application layouts.

Working list, from the registry:

Admin, Agent Memory, Analyze, Build, Code, Command Palette, Deploy, Epics, Issues, Login, Manage,
Merge Requests, Monitor, Operate, Pipelines, Plan, Regex Builder, Repository, Secure, Security,
Settings, Shell A, Shell B, Sidebar, Todos.

`Issues.dc.html` is the largest and most complete (44 KB, 480 lines) and is the best model for how
a surface is meant to be structured — list view, board view with drag and drop, a detail drawer,
a new-issue dialog, regex search with live match preview, and the command palette.

Scale of the replacement target, measured on this tree:

| | `.vue` | `.haml` |
|---|---|---|
| CE | 2,636 | 1,534 |
| EE | 2,163 | 729 |

Those files render through **115 distinct `@gitlab/ui` components**; `GlButton` alone appears
1,474 times. That concentration is the leverage for any mechanical part of the work, but note the
rejection recorded above before reaching for it as the whole answer.

## Verified environment facts

- `glab` is **not installed** on the development host. `gh` 2.96.0 is.
- `git credential fill` **blocks on stdin** and will consume an entire command timeout. Do not use
  it to probe for stored credentials.
- Git identity on a fresh clone here defaults to a placeholder. Set the required authorship
  per repository before committing.
- The Material SCSS layer can be compiled standalone with `dart-sass` when its entry point imports
  only its own partials, which is a cheap real build check that needs no `node_modules`.
- GitLab loads a **different compiled stylesheet per colour mode** rather than toggling a class:
  explicit dark loads `application_dark.scss` *instead of* `application.scss`. Anything imported
  into only one of them is absent for a whole configuration of users, with a green build and a
  correct-looking diff. Wire both entries.

## Verification state

Verified locally during the 2026-08-19 pass:

- Design foundation guard: 25 exact contracts and references.
- Material-system focused Jest suites: 7 suites, 37 tests passed.
- Design-reference package: 6 tests passed, 25 inventory rows validated, and 600 deliberate
  negative-regression cases passed.
- SCSS webpack loader: focused Node and Jest tests passed; `build.bat /s` completed successfully.
- Electron dependency audits: zero advisories for Deployer, Instant, and the design-reference tool
  after the Electron 43.4.1 upgrade.
- Unsigned Squirrel.Windows packaging completed for Deployer and Instant.
- Deployer packaged runtime rendered and generated all four lifecycle-plan steps through its isolated
  preload bridge.
- Instant packaged runtime rendered and loaded its loopback-only configuration through its isolated
  preload bridge.
- The Issues reference capture was produced through the approved hidden-desktop route at 1280x800;
  the renderer used bundled local fonts and no external network.

Still unverified:

- Production-side visual parity for the Rails GitLab routes. This Windows host has no runnable GitLab
  Rails server, and the packaged desktop applications are configuration shells rather than the Rails
  product. No mock capture was substituted.
- Full side-by-side and pixel-diff evidence for all 25 rows remains pending until a real built Rails
  instance is available at the recorded commit.

## Next owner action

Launch a real built GitLab Rails instance at the recorded commit, drive every production route with
the same tuples as `design/parity-inventory.json`, and complete the raw built captures, Material
audits, labelled comparisons, and machine-readable diffs without changing the reference inputs.
