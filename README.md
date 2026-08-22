# Material GitLab

The project Pages destination is [ding-ding-projects.github.io/material-gitlab](https://ding-ding-projects.github.io/material-gitlab/).

## Repository bootstrap

- [BUILD.md](BUILD.md) documents the Windows build and installer entry points.
- [ROADMAP.md](ROADMAP.md) records the current overlay work plan.
- [HANDOFF.md](HANDOFF.md) records the current overlay handoff state.
- [CHANGELOG.md](CHANGELOG.md) summarizes overlay bootstrap changes that are not yet released.

## Overlay provenance

The overlay bootstrap lane is pinned to the official upstream GitLab repository at
`https://gitlab.com/gitlab-org/gitlab.git` and the commit
`9479feaa8d186fa47fc98321d9721b8f87199b26`. The local provenance validator
[`scripts/verify-upstream-overlay.mjs`](scripts/verify-upstream-overlay.mjs)
fails closed when that provenance record is missing, malformed, or no longer
reachable from the current checkout history.
