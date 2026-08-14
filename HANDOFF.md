# Handoff — design surface replacement

Last updated: 2026-08-14. Branch `design-surface-replacement`, cut from `main` at `9628a9e206d9`.

## The contract

The `design/` folder is the specification, not a reference. It holds 24 `.dc.html` prototype
surfaces exported from a design tool. Both CE and EE must render as those surfaces, and no
original GitLab UI may survive.

An important correction from the session that produced this file: a **token and override layer
applied over the existing Pajamas components was explicitly rejected** — "not the work i wanted".
The requirement is that the surfaces are **replaced** with the design, not restyled underneath.
Restyling `GlButton` so it looks Material is not the deliverable; the surface being the design is.

## Repository facts you need before you touch anything

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

## What already exists on `main` — do not rebuild it

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

The 24 design surfaces themselves. Working list, from `design/INVENTORY.md`:

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

No automated test suite, linter, or capture has been run against the work described here. Nothing
in this document should be read as a test result.
