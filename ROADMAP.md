# Material GitLab overlay roadmap

## Completed

- Root Windows build entry points exist and document the supported local bootstrap path.
- The overlay provenance manifest pins the official upstream GitLab repository and commit.
- The overlay provenance validator fails closed when the manifest is missing, malformed, or not reachable from the current checkout history.

## Next

- Extend the overlay bootstrap story with the first concrete update/apply workflow once the upstream sync lane is ready.
- Keep the repo-level docs aligned with any future packaging or provenance changes.

## Notes

- This repository intentionally keeps the overlay legally separable from the upstream GitLab EE source.
- The pinned upstream commit is informational provenance for the overlay boundary, not a bundled copy of upstream source.
