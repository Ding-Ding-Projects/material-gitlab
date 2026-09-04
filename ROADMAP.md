# Material GitLab overlay roadmap

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

- Run the production Rails application at the same commit and finish built-route captures,
  side-by-side comparisons, Material audits, and visual diffs for all 25 parity rows.
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
