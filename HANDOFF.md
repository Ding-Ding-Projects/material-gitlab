# Material GitLab overlay handoff

## Active design-parity implementation, 8 September 2026

This section supersedes older runtime and release availability claims below.
The task remains in progress. No complete production parity verdict exists.

- The current computer started without a running Rails instance. The recorded
  instance from the earlier computer must not be assumed to exist here.
- The first preserved batch reached `main` at
  `0a4dd948e9ab56afd3e8726675b9fd2aa609a0d4`. Both publication workflows completed
  successfully, and non-draft release `windows-95-0a4dd948e9ab` targets that commit.
  Its installers are the two desktop configuration tools, not proof that Rails
  renders the designs.
- Admin, Jobs, Pipelines, and Plan have real route integration changes. Shared
  shell ownership and navigation have focused behavioral tests. Built route and
  visual verification remain pending.
- Settings API adapters are staged, but the existing Settings route remains
  active because the proposed replacement does not yet cover all existing
  operations. Do not activate it by deleting those working controls.
- Capture receipts now require decodable PNGs, source/build manifests, matching
  raw and derived records, font availability, and separate diff review records.
  Structural inventory validity and strict completion are separate checks.
  The production inventory remains pending; test fixtures are never production
  screenshot evidence.
- `scripts/build-design-parity-runtime.ps1` streams an exact committed archive
  into the existing GDK recipe without publishing. It records source/archive and
  recipe hashes, image configuration identity, real logs, and bounded process
  outcomes. Use the task-owned builder and retain previous attempt directories.
- The real build exposed two repaired prerequisites: the ignored root
  `.tool-versions` input and committed CRLF shebangs. A tracked tool manifest and
  source-only normalization now address them while preserving cached service
  layers. A later build also lost its connection during a builder restart;
  that transport failure does not establish a source defect.

Focused verification so far: 7 interaction tests, 4 route-inventory tests,
8 shell bootstrap/navigation tests, and 54 Plan/Settings tests pass under the
normal Jest configuration. The design-reference tool has 12 passing tests,
including strict green/red fixtures and 675 structural negative cases. The
runtime helper's process and byte-normalization tests also pass. These checks
do not establish Rails request behavior or visual parity.

Continue the actual production route adapters, build the final candidate, and
capture only the running Rails application for user-facing evidence. Reference
renders remain internal comparison inputs. No demo screenshots are accepted.
Additional findings and their scope are recorded in
`doc/development/design_parity_audit.md`.

## Blender graphics pack, 2026-09-08

This section covers only the original illustration assets and their production tools.
The existing application, release and design-parity work below is outside this task.

- Source: `design/3d/`, including the generator, exporter, environment provenance and saved-scene verifier.
- Delivery: `site/assets/3d/`, including eight editable scenes, eight transparent PNG masters,
  sixteen lossless WebPs, a contact sheet and a SHA-256 manifest.
- Renderer: Blender 4.5.13 LTS, Cycles, NVIDIA GeForce RTX 3050 via CUDA, 96 samples.
- Verification and distribution retirement are recorded in `design/3d/delivery.json` when complete.
- Page integration, page layout changes and an interactive 3D runtime were not requested or implemented.

## Pass of 2026-09-08: release pipeline, build repairs, README

Read this section first. It supersedes any older statement it contradicts, and everything below it
from earlier passes still stands unless it does.

### What was wrong, and is now fixed on `main`

- **The Windows release workflow had never once published, and the repository still has zero
  releases and zero tags.** Two independent causes. First, the notes step inlined the entire
  line-count JSON report into the release body; on a tree tracking 107,565 files the report's
  exclusion inventory alone serialises to 161,470 characters, measured, against GitHub's 125,000
  character limit, so `gh release create` failed with HTTP 422. The verification step then got a 404
  and threw `Published release did not resolve to the exact non-draft target commit`, which points a
  reader at completely the wrong problem. Second, the job carried `timeout-minutes: 120` and several
  runs were cancelled at exactly that cap.
- **Both workflows triggered on every branch.** Each feature push started a multi-hour Windows
  build, and the Pages `deploy` job had no branch condition at all, so a push to any branch deployed
  that branch to the live published site.
- **The Instant package did not compile.** `tsc` exited 2 with `TS2305`, `TS2687` and `TS2717`.

### Traps this pass hit, recorded so nobody pays for them twice

- **Actions evaluates a workflow trigger from the file on the pushed ref, not from `main`.** After
  restricting the triggers on `main`, pushing 18 preservation branches still started 18 release runs,
  because those branches carry the old unfiltered `on: push`. They were cancelled by hand. The
  triggers only settle once each branch is merged or removed.
- **These package tests read compiled output, not source.** The deployer renderer boundary test
  failed against an untracked `dist/` left over from 14 August that no longer matched its source.
  That reads exactly like a source defect and is not one. Delete the output directory and rebuild
  before believing any of these tests.
- **`$?` after a pipeline reports the last command, not the build.** `npm run build | tail -3`
  reported success while `tsc` was exiting 2. Redirect to a log and capture the real exit code.

### Verified locally on this commit

| Check | Result |
| --- | --- |
| `scripts/verify-upstream-overlay.mjs` | passes |
| `scripts/verify-public-vocabulary.mjs` | passes, 54,754 files scanned |
| `tools/design-reference` tests | 6 of 6, including a red then green negative regression |
| `site/scripts/completeness-check.mjs` | passes, 28 rows, every removal rejected |
| `tools/material-gitlab-deployer` tests | 1 of 1, after a clean rebuild |
| `tools/material-gitlab-instant` tests | 1 of 1 |
| `tools/material-gitlab-instant` build | exits 0, all entry points emitted |

### State of the branches

All 18 non-`main` branches were pushed to the remote for preservation. Every one is unmerged and
carries unique commits, 77 in total, which before this pass existed only on one machine. They belong
to other tasks and sessions, were not adopted by this pass, and were deliberately **not** merged or
deleted. Anyone completing them should verify each one on its own merits.

Two stashes remain. `stash@{0}` is empty. `stash@{1}` holds an untracked older `.github/workflows/pages.yml`
that is superseded by the current file; its one useful idea, the main-only trigger, is now restored.

### The design gap, measured on a running instance

A real instance was stood up on WSL2 (Omnibus 19.3.1) serving this fork's own compiled frontend,
11,317 webpack files replacing the stock 7,237. Signed in as an administrator, the live DOM says:

| Measured on `/admin` | Result |
| --- | --- |
| `gl-mds` classes in the content area | 35 |
| Material classes in the content area | 0 |
| Material Symbols icons | 0 |
| `md3` token classes | 0 |
| Vue application roots | 0 |

The only Material presence on the page is `m3-shell-*` applied to GitLab's stock `super-sidebar`.
That is the token-and-override layer over Pajamas that this file already records as explicitly
rejected. The distance to the 25 `design/` contracts is therefore a replacement gap, not a styling
one, and cannot be closed by CSS.

Three separate repairs were needed before any of this could even be measured, and each was invisible
from reading the source:

1. Every one of the 108,026 tracked files was mode `100644`, so the frontend could not be built at
   all; `yarn webpack-prod` died on its first command with exit 126.
2. `app/views/admin/dashboard/index.html.haml` was invalid HAML and had never rendered in any
   environment. Hamlit ends a `-` statement at the line break, so an array opener alone on its line
   compiles to `stats = [;`.
3. The view needs the fork's own admin controller and route; views and compiled assets alone raise
   `undefined method 'admin_dashboard_actions_path'`.

Two traps worth keeping:

- **Vue replaces its mount node.** `querySelector('#js-material-admin')` returning null is not
  evidence that the surface failed to mount. Test for rendered content and its classes.
- **A backup written beside a template is itself a resolvable template.** Rails globbed
  `index.html.haml.stock-<stamp>` as a candidate for the same action. Keep backups outside the view
  tree.
- **WSL2 terminates the distro seconds after the last command exits**, which stops GitLab and makes
  a browser capture fail with `ERR_CONNECTION_REFUSED` against an instance that answered `curl`
  moments earlier. A keepalive process is required for the length of any capture run;
  `vmIdleTimeout` in `.wslconfig` did not hold.

### What is still not proven

- **No release has been published yet.** The pipeline reached the publish step for the first time
  during this pass; until a run actually creates one, the fix is unproven end to end.
- **Nothing in this repository deploys GitLab.** Both desktop tools are configuration and preview
  shells by explicit design, `docker-compose.yml` is a one line stub pointing at the upstream
  `gitlab/gitlab-ce` image, and there is no application Dockerfile and no chart. This is recorded in
  the README so readers stop assuming otherwise.

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
applied over the existing Pajamas components was explicitly rejected**, in the words "not the work i wanted".
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
a surface is meant to be structured: list view, board view with drag and drop, a detail drawer,
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

- Production-side visual parity for the Rails routes. A real instance now exists and serves, so the
  old blocker is gone. What replaces it is a harder fact rather than an easier one: the application
  renders stock, so a side-by-side against the design references would be comparing two unrelated
  interfaces rather than measuring a gap. No mock capture was substituted, and none should be.
- Full side-by-side and pixel-diff evidence for all 25 rows remains pending, now on the design
  replacement decision rather than on the absence of a running server.
- A distributable package. Seven build attempts, six distinct causes, all recorded below. No package
  has been produced and nothing claims one has.

## The package build, and what each attempt actually cost

Recorded because not one of these causes was visible from the error it produced.

| # | Reached | Cause |
| --- | --- | --- |
| 1 | 4 min | A container running as root cannot read a runner-owned checkout, so the version could not be derived. The error names git, not ownership. |
| 2 | Into compilation | One upstream `502` on a single dependency tarball. |
| 3 | 22 min | The same host failing persistently across three dependencies. |
| 4 | Seconds | A fallback step that treated its own success as a failure: `grep` exits non-zero on zero matches, and finding zero was the objective. |
| 5 | Seconds | A mirror swap that flattened two different URL shapes into one, producing a doubled path segment and a guaranteed 404. |
| 6 | **25 min of real compilation** | OpenSSL 1.1.1 was built because nothing set the variable that selects 3.x, and curl at this ref rejects anything below 3.0.0. |
| 7 | running | not yet known |

Two of those were self-inflicted, and both had one root: the logic was tested locally, but in an
ordinary shell rather than one running with the same strict options as the real step. That is the
whole distance between a green local check and a red run, and it was paid for twice.

Every check added since was watched going red against the real broken input before being trusted,
and green after the fix.

## Next owner action

The instance is installed and reachable at `http://localhost:8929` on the WSL2 host. **Note the
port.** Probing port 80 returns nothing and reads exactly like the instance being down while it is
in fact running normally.

The next decision is the repository owner's rather than a technical one: whether to begin replacing
the Rails surfaces so they *are* the design, rather than restyling them underneath, which the design
notes explicitly reject. Until that is answered, capturing built routes only produces evidence of
stock GitLab, which is already measured and recorded above.
