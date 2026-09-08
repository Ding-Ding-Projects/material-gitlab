# Material GitLab overlay roadmap

## Current design-parity completion

- [x] Separate structural inventory validation from strict evidence completion.
- [x] Verify wrong-size and corrupt-image rejection using executable fixtures.
- [x] Add an immutable local GDK build helper with tested process boundaries.
- [x] Correct the shared-shell ownership and action contract with focused tests.
- [ ] Finish all 25 production route integrations and backend capability contracts.
- [ ] Verify the activated Settings route and equivalent controls in the real built application.
- [ ] Replace styled native control lookalikes with registered Material Design 3 primitives,
      retaining component provenance and negative replacement tests for every surface.
- [ ] Remove Agent Memory's unsupported sync action and simulated backend success.
- [ ] Build and start the final candidate on the current computer.
- [ ] Retain genuine production interactions, captures, comparisons, and reviews
      for every declared parity state. No demo screenshots qualify.
- [ ] Integrate and verify the final work, then close out only proven task-owned
      temporary branches and checkouts.

The older entries below describe historical source milestones. They do not
upgrade the unchecked production-parity items above to completed work.

## Blender graphics delivery

- [x] Deliver and verify one hero and three feature compositions in light and dark treatments,
      including editable scenes, transparent masters, responsive derivatives and recorded provenance.
- [x] Preserve all outputs and retire only the disposable rendering distribution.
- Page integration is deliberately excluded from this graphics-only task.

## Completed

- Root Windows build entry points exist and document the supported local bootstrap path.
- The overlay provenance manifest pins the official upstream GitLab repository and commit.
- The overlay provenance validator fails closed when the manifest is missing, malformed, or not reachable from the current checkout history.
- The authoritative 25-file design archive is checked in with exact source hashes and an explicit
  deterministic parity inventory.
- All 25 design contracts have production surface modules or shared-shell mounts; production seed
  fallbacks were replaced with explicit live-data adapters and fail-closed states.
- The deterministic reference application renders checked-in design files directly with bundled
  local fonts and no external network.
- The supported frontend build and both unsigned Windows Squirrel package paths complete locally.
- Both packaged desktop applications render through their isolated preload bridges on a hidden
  Windows desktop.

## Next

- [ ] **The running application does not render the design, and the gap is a replacement gap rather
      than a styling one.** Measured on a real instance serving this fork's own compiled frontend,
      signed in as an administrator, with the class census taken from the live DOM rather than from
      source:
      - The content area carries **35 `gl-mds` classes**, which is GitLab's own design system, and
        **zero** Material classes, **zero** Material Symbols icons, **zero** `md3` token classes and
        **zero** Vue application roots.
      - The only Material presence anywhere on the page is `m3-shell-*` classes applied to GitLab's
        stock `super-sidebar`: the element holding the context name resolves to
        `span.m3-shell-sidebar-context-name` inside `nav#super-sidebar.super-sidebar.m3-shell-sidebar`.
      - That is the token-and-override layer over Pajamas which `HANDOFF.md` records as explicitly
        rejected, and which was reaffirmed as rejected on 2026-09-03. The requirement is that a
        surface **is** the design, not that Pajamas is restyled underneath it.
      - So the 25 contracts in `design/` are not what the application renders, and no amount of CSS
        repair closes the distance. Wave 1 remains Issues and Boards against `design/Issues.dc.html`.
      - Recorded so it is not rediscovered: **Vue replaces its mount node**, so
        `querySelector('#js-material-<surface>')` returning null is not evidence that a surface
        failed to mount. Test for rendered content and its classes instead.
- [ ] **Make this fork installable. This is the single most important thing missing.** The Material
      work is real application code, 376 files under `app/assets/javascripts/material_system/`, and
      nothing in this repository turns it into something anyone can install. There is no apt
      repository serving it, so `apt-get install` reaches only stock upstream GitLab, and no
      Dockerfile builds a runnable image of it. Every working install instruction in the README
      installs the exact product this fork exists to replace. Two candidate routes, neither built:
      - Compile this tree's assets with the existing standalone path (`yarn install`, then
        `yarn webpack-prod`, which runs `webpack --config config/webpack.config.js` without needing
        the Rails stack) and layer the resulting `public/assets` plus the changed `app/views` onto
        the official image at a matching version. Note the base image and tree versions must be kept
        pinned in step: the tree is `19.3.0-pre` while the currently published package is
        `19.3.1-ce.0`.
      - Build an Omnibus package from this tree and publish it, which is what would make
        `apt-get install` reach this fork the same way it reaches upstream today.
        A workflow for this is committed and has been run seven times. Six distinct causes are
        fixed and recorded in `HANDOFF.md`; the network and toolchain-version problems are
        solved and the build now reaches real compilation. No package exists yet, and a full
        build may still exceed the job time ceiling, which would be a real outcome rather than
        a defect.
- Run the production Rails application at the same commit and finish built-route captures,
  side-by-side comparisons, Material audits, and visual diffs for all 25 parity rows.
  Design folder parity itself is currently intact and independently verified: all 25 reference
  hashes match, no file is missing, and no `.dc.html` on disk is absent from the inventory. What is
  missing is the visual evidence. `capturePolicy.evidenceStatus` is `pending-capture` and
  `sourceCommit` is the literal string `WORKTREE` rather than a commit, so no row is yet bound to a
  real revision. 20 of the 25 production routes are `known`; 5 remain `placeholder`.
- Keep the reference hashes, production routes, evidence receipts, and documentation synchronized
  whenever a design or surface changes.

## Open findings from the 2026-09-03 pass

- [ ] **The site header is visibly broken.** The first real capture of the built
      site (`site/evidence/landing-1280x900.png`) shows the navigation rendered
      twice, the tab strip and its search unplaced, a clipped glyph at the top
      edge, and a large empty gap before the hero. The capture is kept unedited
      rather than retaken to look better.
- [ ] **Twenty-five of 28 site feature rows are still `planned`.** They are
      honestly planned: the code genuinely is not there. The completeness check
      now refuses any row that claims otherwise while the files it names do not
      exist, so a row cannot be flipped without its article, capture and
      evidence.
- [ ] **`accessibility-responsive` was demoted from `implemented` to `planned`**
      because the evidence file it named had never been written. Capture it
      properly rather than writing the file to satisfy the check.
- [ ] **Material Design 3 is surface replacement, not the token layer.** The
      `md3/` tokens and Vue primitives added on 2026-08-25 are scaffolding.
      `HANDOFF.md` records that a token-and-override layer over Pajamas was
      explicitly rejected, and that rejection was reaffirmed on 2026-09-03.
      Wave 1 is Issues and Boards against `design/Issues.dc.html`.
- [ ] **The GitLab Development Kit lane is started and unfinished.** A dedicated
      WSL distro `gitlab-gdk` (Ubuntu 24.04, 32 cores, 39 GB RAM, 955 GB free)
      exists with `/opt/bootstrap/gdk-bootstrap.sh` and its log. The first run
      failed in the `apt-get install prerequisites` phase: `runit-init` and
      `minio` are not available in Ubuntu 24.04 and should simply be dropped,
      since the GDK's own `make bootstrap` installs what it needs. Nothing past
      that phase has run.

## Verified fixed in the 2026-09-03 pass

- [x] Internal shorthand removed from `build-installer.bat`, the site
      completeness script's filename, and the site inventory; a fail-closed
      scan (`scripts/verify-public-vocabulary.mjs`) now refuses a
      reintroduction, proved red and then green.
- [x] The uncommitted `.gitignore` change was discarded rather than committed.
      Its unanchored `build/`, `dist/`, `coverage/` and `logs` patterns silently
      ignored new files under `config/authz/permissions/build/`, `danger/build/`,
      `doc/administration/logs/` and `.gitlab/coverage/`. Proved with
      `git check-ignore -v` before and after.
- [x] Five site modules that were written but never imported are wired in:
      command palette, changelog viewer, bulk actions, file converter, support
      tickets.
- [x] The published site no longer 404s on its own JSON manifests. `dist` never
      contained `data/`; local `vite preview` hid it by falling back to the
      project root.
- [x] The completeness check now reads the disk for any row claiming to be
      implemented, so the inventory cannot overclaim.

## Notes

- This repository intentionally keeps the overlay legally separable from the upstream GitLab EE source.
- The pinned upstream commit is informational provenance for the overlay boundary, not a bundled copy of upstream source.
