# Orchestration plan for the continuation pass, 11 September 2026

This is the plan for the next pass of work on this repository. It is written to be handed to a team
of subagents working in parallel, so it says exactly what each lane owns, which files it may write,
what counts as done, and what is deliberately out of scope.

It plans work. It does not report work. Nothing below has been implemented, and no claim here should
be read as evidence that something is finished. The verified state of the repository as of the date
above is recorded in its own section, and every lane card is written against that state.

The maintainer has pinned the worker model for this pass: every subagent is dispatched with an
explicit `opus` override rather than inheriting a default. That is a routing decision for this
repository's continuation pass, recorded here so a later reader knows it was deliberate, and it is
not a claim about which model produced this document.

## Contents

- [Verified baseline](#verified-baseline)
- [Rules every lane carries](#rules-every-lane-carries)
- [Lane map and waves](#lane-map-and-waves)
- [Lane cards](#lane-cards)
- [Orchestrator duties and integration order](#orchestrator-duties-and-integration-order)
- [Deliberately out of scope](#deliberately-out-of-scope)
- [Failure modes already paid for](#failure-modes-already-paid-for)

## Verified baseline

Measured on 11 September 2026. Re-verify before acting; these age quickly.

- `main` is `3613b6b2f93f4434bc55242018f6a03daee6a111`. One open issue, [#3][issue-3], the rolling
  closeout issue. No open pull requests.
- **The newest package build failed at its very last check, not in the build.** Workflow run
  [34563358622][run-15] on that commit compiled for about 1h59m, then the verify step printed
  `material helpers in package: 11 of 11`,
  `fork-only compiled entry: pages.agent_memory.f1a7e1a8.chunk.js` and
  `compiled webpack files in package: 9556`, found no musl binary, and then died on
  `scripts/omnibus/verify-package.sh: line 74: omnibus-gitlab/pkg/SHA256SUMS.txt: Permission denied`.
  The package passed every content check that exists. The cause is file ownership:
  `scripts/omnibus/build-package.sh` runs the official builder image as root over a bind mount with
  no user mapping, so `omnibus-gitlab/pkg/` and the package inside it come back owned by root and the
  runner user cannot write beside them. The release, image, line count and code name steps were all
  skipped as a consequence.
- That run's artifact `omnibus-deb-3613b6b2f93f4434bc55242018f6a03daee6a111` holds a real package of
  1,090,583,792 bytes and expires on 25 September 2026. **This fork has now built a genuine package.
  It has never published one.** There are zero `omnibus-*` releases; the newest release is
  `windows-106-3613b6b2f93f`.
- The remote carries 27 branches. Twenty-two non-`main` tips are already ancestors of `main`. Four
  carry commits that `main` does not: `codex/material-gitlab-ce-shell-tokens`,
  `codex/material-gitlab-site-expansion-clean`, `codex/material-gitlab-site-hosting` and
  `codex/preserve-gitlab-instant-candidate`.
- The records are stale. `HANDOFF.md` and `ROADMAP.md` stop at 9 September and `CHANGELOG.md` at
  8 September, so the three production compile fixes, the network-only build retry work and the
  package verifier rewrite exist only in commit messages and in comments on issue [#3][issue-3].
  `README.md` says 376 files under `app/assets/javascripts/material_system/` where there are 403,
  and "29 rows" where the site inventory has 30. `CHANGELOG.md` carries a stray second top-level
  heading.
- Numbers to inherit rather than re-derive: 45 Jest suites and 406 tests at `172c1e93b`; a production
  compile of `yarn webpack-prod` in `node:22.12.0-bookworm` with 14 GiB and 8 CPUs under
  `NO_SOURCEMAPS=true NO_COMPRESSION=true WEBPACK_MINIFY_IN_PROCESS=true` finishing in 319 seconds
  with 3,666 emitted files and zero errors; the publication scan clean over 54,979 tracked files.
- Design state: 25 contracts in `design/`; every one of the 100 evidence entries in
  `design/parity-inventory.json` is `pending` and its `sourceCommit` is still the literal string
  `WORKTREE`; the audit counted 427 native button lines, 151 native input lines, 6 native select
  lines and 14 native textarea lines across the surface Vue files; only 10 Material Web tags are
  registered in `app/assets/javascripts/material_system/components/register.js`; three rows in
  `app/assets/javascripts/material_system/surfaces/contracts.js` are `unresolved`. The board view
  lives inside the Issues surface, while `/-/boards` itself is still stock.
- Site state: `site/data/completeness-inventory.json` has 30 rows of which 3 are implemented;
  `site/data/universal-features.json` has 28 rows all claiming implemented with evidence unverified;
  `site/scripts/completeness-gate.mjs` prints its failures and still exits 0, which is a live defect;
  `site/scripts/site-contract-gate.mjs` passes; `site/tests/site.test.mjs` holds 19 tests. The header
  really is authored twice in `site/index.html`, the navigation shell carries no `data-dock`
  attribute so its own docking rules never apply, and the hero pads a large clamp top and bottom.

## Rules every lane carries

The orchestrator repeats these in full in every dispatch rather than assuming they are inherited.

1. Read this repository's `AGENTS.md` and the maintainer's canonical agent instructions before the
   first edit, and re-check the open issues periodically through the lane rather than once at the
   start.
1. Report your own status on the shared status service with your own session record, including the
   machine label and the complete worktree inventory with measured sizes. Update at every meaningful
   milestone and finish with an honest terminal state. When the ingest credential is unavailable,
   say so precisely and never report the service as updated.
1. One fresh linked worktree and branch per writable lane, named `feature/<lane>-20260911`. Write
   only your allowed paths. Never the primary checkout, never a sibling lane, never an unassigned
   path.
1. Retry the same materially unchanged failure at most three times, then preserve the evidence and
   stop that lane. Watch an external operation for at most one hour per window with increasing
   polling intervals, then record its exact state and its retry condition.
1. Commit as `Claude Fable 5.1 <noreply@anthropic.com>` for both author and committer with the
   matching `Co-Authored-By` trailer, a precise English subject, and a body that says the same thing
   in English and in playful Hong Kong style Cantonese. No em dashes. A lane commits on its own
   branch; it does not merge or push `main` unless the orchestrator assigns that exact action.
1. Before any text leaves the session, run `node scripts/verify-public-vocabulary.mjs` and read the
   text yourself against the maintainer's private dictionary. This repository is public.
1. Never skip, disable or quarantine a test to reach green. Never force-push. Never delete anything
   unmerged, unpushed, or of uncertain ownership. A guard is trusted only after it has been watched
   failing against the real broken input and passing after the repair.
1. Return the exact commit on your branch, the changed files, every command you ran with its real
   counts, the evidence paths, the remaining risks, and your integration readiness. The orchestrator
   treats every lane report as unverified and re-runs the decisive check on the integrated commit.

## Lane map and waves

| Wave | Lane | Scope in one line | Waits on |
| --- | --- | --- | --- |
| 0 | P0 package publication | Repair the verifier's last step, then publish the first package and image | nothing |
| 0 | D0 shell foundation | Register the remaining Material Web tags and replace the shared chrome | nothing |
| 0 | B1 branch integration | Judge and integrate the four branches carrying unique commits | nothing |
| 0 | S1 site header | One navigation, docked, no clipping, real capture | nothing |
| 0 | S6 site gates | Make the completeness gate exit non-zero and reconcile its frozen list | nothing |
| 1 | D1a to D6b | Thirteen surface groups, one subagent each | D0 for a new tag only |
| 1 | S2 to S5 | Four site feature domains | nothing |
| 2 | C1 compile proof | Production webpack compile of each integrated batch | a landed batch |
| 2 | V1 review loop | Review lenses, independent refutation, then repair | a landed lane |
| 3 | P1 release manifest | Populate the release manifest from the real release | P0 published |
| 4 | R1 records | Reconcile every document against the tree | every landed lane |
| 4 | Branch cleanup | Delete only proven merged branches | B1, R1, fresh authorization |

Every wave 0 and wave 1 lane starts together. The only real dependency inside wave 1 is that a
surface lane consuming a newly registered Material Web tag merges `main` after D0 lands.

## Lane cards

### P0, package publication

Everything that needs a real package waits on this one.

Make `scripts/omnibus/verify-package.sh` succeed against a root-owned package directory, watched
failing and then passing, and then publish the first `omnibus-19.3.0-pre-<sha12>` release and the
container image.

The candidate repair is an `EXIT` trap inside `scripts/omnibus/build-package-inner.sh` that hands
`/omnibus/pkg` and `/omnibus/log` back to the host user and group passed in by
`scripts/omnibus/build-package.sh`. That keeps the local run and the CI run byte identical, and
leaves `SHA256SUMS.txt` exactly where the workflow already expects to read it. Add a fast
writability check at the top of the verifier as well, so a future ownership regression fails in
seconds instead of after a gigabyte of upload. Extend `scripts/omnibus/verify-package.test.sh` with
an unwritable directory case that skips honestly when the test itself runs as root, since root
ignores mode bits.

Allowed paths: `scripts/omnibus/**`, `.github/workflows/omnibus-package.yml`, and only the release
lines of `README.md`, `ROADMAP.md` and `CHANGELOG.md`.

Done means a non-draft release at the exact commit whose package asset size equals the verified byte
count, whose download URL answers 200, with `SHA256SUMS.txt`, the line count report and the code
name photo attached, and the pushed image digest appended to the release body. Hitting the
360 minute job ceiling is a real outcome to report, not a defect to hide.

### D0, shell foundation

Register the remaining official `@material/web` 2.5.0 tags the 25 contracts actually use, each with
its provenance row and a negative test, and replace the shared chrome so that Shell A, Shell B, the
sidebar, the command palette and the regex builder **are** their design contracts rather than the
existing component library restyled underneath. Resolve the `command-palette` and `regex-builder`
rows that are currently `unresolved`.

Allowed paths: the `components/`, `mounts.js`, `runtime.js`, `registry.js`, `tokens.js`,
`command-palette.js` and `regex-builder.js` files under `app/assets/javascripts/material_system/`,
the `ShellA`, `ShellB`, `Sidebar`, `CommandPalette` and `RegexBuilder` surface folders,
`surfaces/shared-shell.scss`, the shared rows and those two rows of `surfaces/contracts.js`,
`app/assets/javascripts/md3/`, `app/assets/stylesheets/md3/`, the three layout templates, the
matching specs, and `doc/development/material_web_components.md` and
`doc/development/ux/material-shells.md`. No other surface folder.

### D1a to D6b, the thirteen surface groups

The acceptance is identical for every group; only the ownership differs.

The surface **is** its design contract. Every control renders a registered Material Web element or a
composition of them. The native control counts for that surface fall to zero, measured by the same
search before and after. The mounted region carries zero classes from the stock design system,
asserted against rendered content rather than against the mount node. Data arrives through the
existing adapters with fail-closed empty and error states, and no simulated backend success. The
surface's `control-inventory.json` records component provenance, with a negative test that refuses a
reintroduced native control. Search fields default to plain text with the anchored regex builder
beside them. The command palette reaches every control. Keyboard reachability, visible focus,
correct roles and names, contrast and the reduced-motion path all hold.

A lane edits only its own row in `surfaces/contracts.js`. It never edits
`design/parity-inventory.json`, which only `scripts/design-parity/record-evidence.mjs` writes, and
never `components/register.js`, which belongs to D0 through the orchestrator.

Ownership, by folder under `app/assets/javascripts/material_system/surfaces/` plus the Rails files
and specs that serve it:

- **D1a** Issues and Boards, including making `/-/boards` mount the Material board view rather than
  the stock one.
- **D1b** Epics, Plan and Todos.
- **D2a** Merge Requests.
- **D2b** Code and Repository. This lane also owns `surfaces/live-data.js` and
  `surfaces/gitlabApi.js`, so another lane needing an adapter change asks through the orchestrator.
- **D3a** Build and Pipelines.
- **D3b** Deploy, Operate and Monitor.
- **D4** Secure and Security.
- **D5a** Settings, with its nine helpers.
- **D5b** Admin and Manage.
- **D5c** Login, which resolves the third `unresolved` row by replacing the server-rendered partials
  with a real mount.
- **D6a** Agent Memory. This lane also owns removing the unsupported sync action and the simulated
  backend success: expose honest capability availability rather than inventing a working sync or
  accepting a timer as backend evidence.
- **D6b** Analyze.

Per-lane verification: the Material Jest suites green with their suite and test counts reported
against the 45 and 406 baseline, the lane's own Node test files, lint and format on changed files,
`ruby -c` on changed helpers and controllers, `node scripts/verify-public-vocabulary.mjs`, and the
lane's own document under `doc/development/` updated with the measured before and after counts.
Captures from a running instance stay out of this pass, so a parity row stays unticked with its state
named rather than being flipped on source evidence.

### B1, branch integration

In its own worktrees, read every commit on the four branches carrying unique work and judge each one
still useful, superseded, a rejected approach, or broken. Two recorded rejections must never be
reimported: a token and override layer applied over the existing component library, which was
explicitly rejected twice, and any branch whose imports name a component or stylesheet that exists
in no commit, which already cost two package builds and was reverted.

Merge `main` into a branch that is still useful, resolve conflicts by role rather than line by line,
run the focused checks, and hand the orchestrator a green tip. Keep any branch that is not useful and
write down the reason. Re-prove every already-merged tip with `git merge-base --is-ancestor` after a
fresh fetch and list it as a cleanup candidate.

Deletion is not part of this lane. It belongs to the orchestrator, needs fresh explicit
authorization in its own request, and requires both the local and the remote tip to be proven
ancestors of the freshly fetched `main` first.

### S1, site header

One navigation rather than two, docked, with no clipped glyph at the top edge, no gap before the
hero, and the tool buttons inline beside the search field rather than stacked full width. Produce a
real capture at the exact viewport with a receipt binding the commit, the served artifact, the
method, the viewer position and the hash.

Allowed paths: `site/index.html`, `site/src/navigation.*`, `site/src/styles.css`, the navigation
block of `site/src/main.js`, the matching `site/evidence/` files, and `site/tests/`.

### S6, site gates

Make `site/scripts/completeness-gate.mjs` exit non-zero when it fails, since today it prints its
failures and exits 0, and reconcile its frozen 28 id list against the 30 row inventory. Prove the fix
with a test watched failing and then passing.

### S2 to S5, the site feature rows

Twenty-seven rows are honestly `planned` because the code is genuinely absent. A row flips to
`implemented` only with its implementation, its article, its localized copy, its tests and a real
capture receipt, because `site/scripts/completeness-check.mjs` reads the disk for every claimed path.

- **S2** language and tone: language modes, funny levels, emoji toggle, school mode, narration, and
  the personal vocabulary upload control.
- **S3** appearance and structure: appearance, tabs, scheduled settings, logo customization, local
  history, changelog, and the dim sum surprise.
- **S4** tools: regex builder, notifications, destructive confirmation, external editor, exports,
  bulk actions, file converter, and the local model suite manager.
- **S5** security and integrations: element locks, authenticator, browser download surfaces, status
  service, and the accessibility row that was demoted because its evidence file had never been
  written.

Each lane owns its own modules, article and evidence files, and only its own rows in the two
inventory files. The orchestrator resolves row-order conflicts in those two files as integration
edits.

### C1, production compile proof

After each landed batch, run the exact recorded command from a `git archive` of the integrated tip
and report the exit code, the error count, the emitted file count and the elapsed seconds against
the 0, 3,666 and 319 second reference. This lane makes no edits. A red result belongs to the lane
that caused it.

### V1, the review loop

Correctness, security, accessibility and publication-scan lenses each read the diff and return
findings with a reproduction, the mechanism, the impact, a confidence, and one decisive regression
test with its expected failing and passing observations. Loop each lens until it finds nothing. An
independent refuter confirms or refutes every finding before it is accepted, so one overeager
reviewer cannot manufacture work out of nothing. Every accepted repair carries its regression,
watched failing and then passing.

### P1, release manifest

Once P0 publishes, populate `site/data/releases.json` from the real release according to
`site/data/releases.schema.md`, capture the populated install card, flip that row, and dry run
`scripts/design-parity/fetch-built-artifact.mjs` against the tag to prove the receipt chain is
unblocked.

### R1, records

Reconcile `README.md` against the tree, repair the stray second top-level heading in `CHANGELOG.md`,
write the dated `HANDOFF.md` section with the real check inventory and an honest list of what is
still unverified, tick or annotate every `ROADMAP.md` item the pass touched, keep the layered-assets
alternative's base image and tree versions in step, replace the two templates in `.github/` that
currently send contributors to a different forge, and record the dangling `.agents/skills` pointer.

## Orchestrator duties and integration order

1. Post the in-progress comment on issue [#3][issue-3] with an ISO-8601 start time and the lane list,
   and open the orchestrator's own status record.
1. Dispatch wave 0 and wave 1 together, throttled only by real capacity.
1. As each lane reports: read the diff and the evidence, re-run the decisive check on the lane tip,
   merge into `main` with a merge commit, run C1 and V1 for that batch, push `main`, and prove the
   remote ref. **Land each ready lane immediately.** A sibling lane still running never delays a
   finished one, and a finished lane is never parked on its branch waiting for a closeout.
1. Keep P0 ahead of everything else, and dispatch P1 the moment the release publishes.
1. Close out with R1, then a finished comment carrying real counts and links, then cleanup of proven
   candidates under fresh authorization, then the full branch, worktree and stash inventory proof.

The orchestrator never writes feature code. Its only edits are named integration-only exceptions,
such as resolving a genuine cross-lane merge conflict or updating one shared manifest after lanes
converge.

## Deliberately out of scope

Recorded so that nothing looks forgotten. None of this can run from a cloud container, and all of it
needs the maintainer's own machine or network.

- Proving the package install route natively in the WSL2 Ubuntu 24.04 distribution through
  `deploy/scripts/wsl-install.sh`, and the container route on a local Docker host after live
  inspection, protecting the existing stack's published ports.
- Capturing the built side of all 25 parity rows and the 70 layout tuples, seeding the fixture,
  preparing the capture user, recording the evidence, and taking
  `tools/design-reference/scripts/parity-guard.mjs --strict` green with a real `sourceCommit` instead
  of the literal `WORKTREE`.
- Finishing the GitLab Development Kit lane. Its first bootstrap failed in the prerequisites phase on
  two packages Ubuntu 24.04 does not carry and which the kit's own bootstrap installs anyway.
- Making the container registry package public, which only the repository owner can do.
- The eighteen local branches and one stash that exist only on the maintainer's machine.

## Failure modes already paid for

Every one of these cost real time once. None of them should cost it twice.

- `scripts/verify-public-vocabulary.mjs` reads `git ls-files`, so it scans tracked file contents and
  tracked paths and nothing else. A branch name, a tag, a release title, an issue comment or a
  discussion post is structurally invisible to it and has to be caught by reading before it is
  published. Choose branch names in plain, ordinary words before the first push, because a branch name
  on the remote cannot be corrected without deleting the branch.
- A green packaging exit only proves that packaging exited green. The package is opened and checked
  separately, and the checker itself has been wrong before: an earlier version looked for JavaScript
  source that the packaging step never ships, and refused the first genuine package this fork ever
  built.
- Compiling GitLab's production assets from scratch needs the full dependency set, because production
  packages optionally require development-chain packages at bundle time.
- A DevTools screenshot clip is page relative, so a clip at the origin after a scroll photographs
  empty page. Capture the viewport instead.
- Vue replaces its mount node, so a selector returning null afterwards is not evidence that a surface
  failed to mount. Assert on rendered content and its classes.
- GitLab loads a different compiled stylesheet per colour mode rather than toggling a class, so a
  layer imported into only one entry is absent for a whole configuration of users, with a green build
  and a correct-looking diff. Wire both entries.
- A comment placed inside a backslash-continued command truncates that command, and the shell's own
  syntax check still passes.
- `grep` exits non-zero when it matches nothing, and under strict shell options that ends the step.
  Finding nothing is often the objective.
- A backup file written beside a Rails template is itself a resolvable template.

[issue-3]: https://github.com/Ding-Ding-Projects/material-gitlab/issues/3
[run-15]: https://github.com/Ding-Ding-Projects/material-gitlab/actions/runs/34563358622
