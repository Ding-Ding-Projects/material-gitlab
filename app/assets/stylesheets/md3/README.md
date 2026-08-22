# Material Design 3 (MD3) prototype layer

Design tokens, utility classes, and component styles implementing a Material 3 visual style,
built as CSS custom properties and SCSS on top of GitLab's existing stylesheet architecture.

For the full guide — the complete token table, how to consume tokens from SCSS and from Vue,
usage examples for every class and every matching `Md3*` Vue component, how dark mode resolves,
and the current known limits of this layer — see
[`doc/development/fe_guide/md3.md`](../../../../doc/development/fe_guide/md3.md).

**Status:** this layer is not imported by `application.scss` or any other compiled entry point,
so nothing here currently ships to a rendered page. It also has no automated test coverage. See
the "Known limits" section of the linked guide before adopting it.

## Files in this directory

| File | Contents |
| --- | --- |
| `_tokens.scss` | The 25 color tokens as `--gl-md3-*` custom properties (light values) on `:root`, semantic aliases, `$gl-md3-*` SCSS variables, and the `$gl-md3-tokens` map |
| `_tokens_dark.scss` | Dark-mode overrides for the same 25 custom properties, applied under `:root.gl-dark` and under `@media (prefers-color-scheme: dark)` |
| `_typography.scss` | The 15-style MD3 type scale as custom properties, the `gl-md3-type()` mixin family, and `.md3-<style>` utility classes |
| `_shape.scss` | The corner-radius scale (`none` through `full`) as custom properties, the `gl-md3-shape()` mixin, and `.md3-shape-<name>` utility classes |
| `_elevation.scss` | The shadow scale (levels 0–5, light and dark) as custom properties, the `gl-md3-elevation()` mixin, and `.md3-elevation-<level>` utility classes |
| `_motion.scss` | Easing curves and duration steps as custom properties, the `gl-md3-motion()` mixin family, and a `prefers-reduced-motion` override |
| `components/_buttons.scss` | `.md3-btn` (five variants), `.md3-icon-button`, `.md3-fab` |
| `components/_cards.scss` | `.md3-card` (elevated/filled/outlined, interactive) and its header/media/body/footer slots |
| `components/_chips.scss` | `.md3-chip` (assist/filter/input/suggestion, selected, removable) |
| `components/_dialogs.scss` | Scrim, dialog (default/wide/full-screen), command palette, side sheet, menu, popover |
| `components/_forms.scss` | Filled and outlined `.md3-field` text inputs, select, checkbox, radio, switch, search field |
| `components/_navigation.scss` | Tabs, segmented control, breadcrumbs, standalone navigation rail |
| `components/_sidebar.scss` | The primary navigation drawer, its collapsed rail state, and its narrow-viewport overlay mode |
| `components/_topbar.scss` | The global top app bar (search field, mode toggle, action buttons, avatar) |

There is no `index.scss` in this directory. Each partial is imported individually, in dependency
order, by whatever stylesheet consumes it — see the "Consuming tokens from SCSS" section of the
linked guide for the exact `@import` statements and ordering.

The matching Vue components (`Md3Button`, `Md3Card`, `Md3Chip`, `Md3Dialog`, `Md3NavDrawer`,
`Md3TextField`, `Md3ThemeToggle`) live in `app/assets/javascripts/md3/`, not in this directory.
Several of them currently render with class names that do not match the SCSS classes listed
above — see "Known limits" in the linked guide for the exact mismatches before wiring a `Md3*`
component together with these styles.
