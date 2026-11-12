# Material 3 Expressive redesign

This page describes the November 2026 redesign of the fork's visual language, what it changed in the
running application, how to regenerate it, and what has and has not been verified.

## Why

The 25 design contracts in `design/*.dc.html` were drawn against the 2024 baseline Material 3 look:
one muted purple, flat tonal surfaces, uppercase section labels and a narrow shape range. The
application shell itself still read GitLab's own blue for its primary role. The redesign replaces both
with one Material 3 Expressive system and applies it to the real application, not only to the
prototype layer.

## The design source

- Canvas: [`design/expressive/project/`](../../../design/expressive/project/), 28 artboards plus
  `canvas.json`. It covers every surface the old canvas covered (shell, sidebar, sign in, command
  palette, regex builder, issues, boards, epics, merge request, code, repository, pipelines, job log,
  deploy, operate, monitor, secure, security dashboard, analyze, members, settings, admin, to-do list,
  agent memory), a dark shell, two phone layouts, and a token sheet (`Tokens.dc.html`).
- Every artboard carries a `dark` property, so each surface can be reviewed in both schemes.
- Generator: [`design/expressive/tools/`](../../../design/expressive/tools/). `build.py` writes the
  artboards and `canvas.json` from `common.py` (shared shell and tokens) and `surfaces.py` (one
  function per surface). Run `python3 design/expressive/tools/build.py design/expressive` to
  regenerate; it is deterministic apart from the `createdOnFiles` timestamp.
- Placeholders such as `[n]`, `[sha]` and `[duration]` mark values the real application fills in.
  The canvas never invents counts or durations.

## The token system

| Role family | Source | Light primary | Dark primary |
| --- | --- | --- | --- |
| Primary, secondary, neutrals | Seed `#6E49CB`, vibrant dynamic scheme | `#6E1AFF` | `#CFBDFF` |
| Tertiary | Tonal palette of GitLab orange `#FC6D26` | `#A53D00` | `#FFB597` |
| Success, warning | Tonal palettes of GitLab green and amber | `#006D39`, `#855300` | `#75DB94`, `#FFB95E` |

The schemes come from `@material/material-color-utilities` 0.3.0. The scripts that produced them and
their output are committed: `generate-scheme.mjs`, `generate-palettes.mjs`,
`generate-custom-roles.mjs`, `scheme.json` and `palettes.json`. The success container uses tone 94
instead of 90 so diff backgrounds stay readable.

Shape: 4, 8, 12, 16, 20, 28, 32 and 48 px plus a pill. Type: GitLab Sans (built on Inter) and
GitLab Mono, both already vendored, with heavier display and headline weights and negative tracking.
Motion adds three Expressive curves: `spatial-fast` (shape morphs, slight overshoot),
`spatial-default` (drawers and sheets) and `effects` (color and opacity, never overshoots). Reduced
motion collapses all of them.

## What changed in the application

| File | Change |
| --- | --- |
| `app/assets/stylesheets/md3/_tokens.scss`, `_tokens_dark.scss` | Regenerated light and dark schemes; new tertiary, secondary-on, inverse, lowest-container and `row` roles. |
| `app/assets/stylesheets/md3/_shape.scss`, `_motion.scss`, `_elevation.scss`, `_typography.scss` | Expressive shape ladder, spring curves, two-layer M3 shadows, GitLab Sans type scale. |
| `app/assets/stylesheets/md3/components/_gitlab_expressive.scss` | New. Re-points GitLab UI's design tokens (surfaces, text, borders, nav items, buttons, controls, dropdowns, badges, alerts, radii) at the MD3 roles in both schemes, and applies Expressive shapes to the real components: pill buttons that morph on press, connected button groups, connected content lists, 20 to 28 px cards, panes, menus and dialogs. |
| `app/assets/stylesheets/framework/material_design_tokens.scss` | The shell's `--m3-color-*` roles read the MD3 contract instead of GitLab blue. Sidebar and top bar sit on the app background; only the content pane is raised. |
| `app/assets/stylesheets/md3/components/*.scss` | Drawer on the app background, secondary-container active states, button shape morph. |
| `app/assets/javascripts/material_system/tokens.js` | Same schemes as data, plus the new roles, shapes and curves. |
| `app/assets/javascripts/material_system/surfaces/**` | Every surface's scoped palette swapped role for role to the new scheme, card radii raised to 24 px, labels in sentence case, GitLab Sans and GitLab Mono in place of fonts that were never vendored. The shared shell, command palette and regex builder are restyled to the canvas. |

The overrides use `:root:root` and `:root:root.gl-dark` so they win over GitLab UI's own token
declarations regardless of stylesheet order. Data hues (labels, charts) are deliberately left alone.

## Failure modes

- A page bundle that hard-codes a color instead of reading a GitLab UI token keeps its old color.
  Search for the literal hex and route it through a token rather than adding another override.
- `.card` and `.content-list` are restyled globally. A page that relied on a bordered card or a
  divided list now gets tonal rows separated by a 2 px gap instead.
- The `row` role is one tone below the pane in light mode and one tone above it in dark mode. Using
  `surfcl` directly for a row makes it vanish against the pane in dark mode.

## How it was verified

- Every changed stylesheet compiles with Dart Sass 1.77.8, including all 21 surface stylesheets with
  `app/assets/stylesheets` on the load path.
- The core text-role contrast checks from `spec/frontend/material_system/accessibility_spec.js`
  were run against the new `tokens.js` with a standalone script, plus every on-container pair. The
  lowest ratio is 6.45:1 (light on-primary on primary).
- A static harness using the real shell class names (`m3-shell-*`, `gl-button`, `gl-badge`,
  `content-list`, `gl-card`) was rendered in Chrome in light and dark to catch invisible rows; that
  check found and fixed the dark-mode row contrast described above.

Not verified: a full GitLab asset compile, the Jest suite, and captures of the built application.
Those need the fork's full build environment and belong to the existing parity capture work.
