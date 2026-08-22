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

## Notes

- This repository intentionally keeps the overlay legally separable from the upstream GitLab EE source.
- The pinned upstream commit is informational provenance for the overlay boundary, not a bundled copy of upstream source.
