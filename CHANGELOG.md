# Changelog

## Unreleased

### Docker Compose, container image, and Omnibus packaging for this fork

- Point the root `docker-compose.yml` at this fork's own image
  (`ghcr.io/ding-ding-projects/material-gitlab`) instead of a one-line stub, with a `build:` fallback
  that produces the image locally from a release `.deb` when no published image is pulled.
- Add `deploy/docker/`, a container image recipe derived from upstream `omnibus-gitlab`'s own Docker
  assets at `19.3.0+ce.0` (Apache-2.0; per-file provenance and hashes in `deploy/docker/UPSTREAM-NOTICE.md`),
  changed only so the image installs a local or downloaded `.deb` built from this fork rather than
  fetching upstream's own package.
- Add `deploy/upstream-baseline/docker-compose.yml`, the stock-`gitlab/gitlab-ce` comparison baseline
  moved out of the root Compose file, and `deploy/README.md` indexing both.
- Fix `scripts/omnibus/patch-frontend-islands-cleanup.sh` ([`ed950bd9f`](https://github.com/Ding-Ding-Projects/material-gitlab/commit/ed950bd9f)):
  make the `ee/frontend_islands/node_modules` cleanup in `config/software/gitlab-rails.rb`
  unconditional. Upstream only runs it when the build is flagged EE; this fork is an EE-layout tree
  packaged under the CE project, so run 34239883194 compiled the entire package (about 2h05m) and
  failed only at the final health check, on musl-linked Node binaries the guarded cleanup never
  removed. A workflow dispatch on this fix (run 34293113846) was in progress as this entry was
  written; no `.deb` and no image have published yet.
- The other six `scripts/omnibus/*.sh` steps (`repoint-sources.sh`, `route-gnu-mirror.sh`,
  `read-toolchain.sh`, `build-package.sh`, `build-package-inner.sh`, `verify-package.sh`) and
  `.github/workflows/omnibus-package.yml` itself predate this entry; see `HANDOFF.md` for their
  individual fixes across eight recorded build attempts.

### Documentation: README rewritten as step-by-step instructions, and corrected

- Rewrite `README.md` as numbered, verifiable install steps (Docker, direct `.deb`, build-it-yourself,
  Windows source build) instead of a narrative "nothing here installs this fork" framing that three
  parts of the tree had already outgrown:
  - It said no Omnibus/`.deb` route exists. `.github/workflows/omnibus-package.yml` and
    `scripts/omnibus/*.sh` already existed and had been run multiple times.
  - It said there were no releases and no tags. 34 `windows-NN-<sha12>` tags with published non-draft
    releases already existed (for example `windows-95-0a4dd948e9ab`), and the count grows on every
    push to `main`.
  - It said `.github/workflows/` was 5 files and 531 lines. It is 4 files (three `.yml` plus one `.md`)
    totalling 1,109 lines, measured directly rather than carried forward from an earlier count.
- Correct `BUILD.md`: the root `build.bat`/`build-installer.bat` build the GitLab Rails frontend and
  an unsigned source ZIP, not an installable desktop artifact. The installable Squirrel.Windows
  artifacts come from the separate `build.bat`/`build-installer.bat` pair inside each of
  `tools/material-gitlab-deployer/` and `tools/material-gitlab-instant/`, which is what
  `windows-release.yml` actually builds and publishes.
- Add `site/docs/deployment.md`, register it in `site/data/docs-manifest.json`, add its row to
  `site/data/completeness-inventory.json` (status `planned`, since no release has published a
  capture can bind evidence to), and update `site/scripts/site-contract-gate.mjs`'s bundled-article
  count from 28 to 29 to match.
- Update `ROADMAP.md`'s installability item into checked sub-items for what is actually done (the
  packaging scripts, the frontend-islands fix, the container recipe, the Compose change) with the
  remaining package/image/end-to-end-install work left honestly unchecked, and correct a stale
  "20 of 25 production routes known" line against the current `design/parity-inventory.json`, where
  all 25 now record `productionRouteStatus: "known"`.
- Add a dated section to `HANDOFF.md` recording this pass and correcting the older "nothing in this
  repository deploys GitLab" summary, which a working Compose file and image recipe have partially
  outgrown even though no package has published yet.

### Design parity implementation, 8 September 2026, in progress

- Integrate real Rails routes for the project, collaboration, operations, security,
  analytics, and Settings surfaces, retaining native authorization and service contracts.
- Preserve shared-header preferences and separate source route registration from
  the still-pending 25-screen runtime capture and component-conformance review.
- Correct host-dependent CRLF conversion in immutable build archives, with exact
  archive-to-commit byte regressions and negative mutations.
- Prepare an explicitly scoped native Rails data seed and correct production
  capture plans so they cannot select internal reference routes.
- Standard frontend verification reached 36 suites and 257 passing tests before
  the new official-component migration. Genuine product screenshots remain pending.

### Packaging: the build now reaches real compilation

- A package workflow is committed and has been run seven times. Every failure had a cause that was
  invisible from the error it produced, and all six are recorded in `HANDOFF.md`.
- Dependency downloads no longer depend on a redirector that was returning `502` from two separate
  networks. The substitution is safe because every download is still verified against the checksum in
  its own definition, so a mirror serving different bytes fails the build rather than poisoning the
  package.
- The build is now told which OpenSSL it is meant to produce. The definition chooses between 1.1.1
  and 3.x purely on an environment variable, nothing was setting it, and curl at the same ref rejects
  anything below 3.0.0. The value is read from the upstream ref's own CI variables so it follows the
  ref rather than going stale behind a hardcoded number.
- **No package has been produced.** A full build may still exceed the job time ceiling.


### The application does not render the design, measured rather than assumed

- Stood up a real instance (Omnibus 19.3.1 on WSL2) serving this fork's own compiled frontend,
  11,317 webpack files replacing the stock 7,237, and measured the live DOM while signed in as an
  administrator. The content area carries **35 `gl-mds` classes**, which is GitLab's own design
  system, and **zero** Material classes, **zero** Material Symbols icons, **zero** `md3` token
  classes and **zero** Vue application roots.
- The only Material presence on the page is `m3-shell-*` applied to GitLab's stock `super-sidebar`.
  That is the token-and-override layer over Pajamas that `HANDOFF.md` records as explicitly
  rejected. The distance to the 25 contracts in `design/` is therefore a replacement gap rather
  than a styling one, and cannot be closed with CSS.

### Repairs that were needed before any of that could be measured

- **Restored the execute bit on 306 tracked scripts.** Every one of the 108,026 tracked files was
  mode `100644`; not a single executable existed anywhere in the tree, because the squashed import
  was made on a platform that carries no execute bit. `yarn webpack-prod` therefore died on its
  first command with exit 126, so the frontend could never be compiled, so no package could be
  built from it. One permission bit sat underneath the whole problem.
- **Fixed `app/views/admin/dashboard/index.html.haml`, which had never rendered in any
  environment.** Hamlit ends a `-` statement at the line break, so an array opener alone on its line
  compiles to `stats = [;`. Verified against Hamlit 3.0.3, the engine the instance actually runs.
  A sweep found the pattern in exactly one file and two places.
- Recorded that the view also needs the fork's own admin controller and route; views and compiled
  assets alone raise `undefined method 'admin_dashboard_actions_path'`.

### Traps recorded so they are not paid for twice

- **Vue replaces its mount node**, so `querySelector('#js-material-<surface>')` returning null is not
  evidence that a surface failed to mount. Reading it that way produced a wrong conclusion here.
- **A backup written beside a template is itself a resolvable template.** Rails globbed
  `index.html.haml.stock-<stamp>` as a candidate for the same action. Keep backups outside the view
  tree.
- **WSL2 terminates the distro seconds after the last command exits**, stopping the instance, so a
  browser capture fails with connection refused against something that answered `curl` moments
  earlier. A keepalive is required for the length of a capture run; the `vmIdleTimeout` setting did
  not hold.
- **7z is a native platform binary and cannot resolve shell-style paths.** Handed one it reports
  "The system cannot find the file specified" and writes nothing. Convert every path it receives.

### Evidence

- Added the first capture of a Material surface in a running instance, plus a before and after pair
  for the unstyled navigation controls, each with a committed receipt carrying its SHA-256, source
  commit and capture method. Captures come from the built artifact through an isolated guest browser
  on a hidden desktop, with exactly one debugger page target verified before each shot.

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
# In-progress design parity, 8 September 2026

- Connect real Admin, Jobs, Pipelines, and Plan route hosts to design surfaces.
- Fix fail-closed authentication defaults, pipeline request/retry identity,
  invalid regex states, and shared command-palette keyboard behavior.
- Select one shared chrome owner and connect live navigation actions.
- Validate decodable PNGs and linked evidence with a separate strict completion
  check; keep the actual production inventory pending.
- Add a candidate-pinned local GDK build helper and repair missing tool-version
  and CRLF script inputs exposed by real build attempts.
- Keep the existing Settings screen active until the staged replacement covers
  its working capabilities. Production visual parity is not yet established.
