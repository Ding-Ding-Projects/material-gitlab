# Material shell contracts

The shared design surfaces are implemented in
`app/assets/javascripts/material_system/surfaces/` and are mounted through
`app/assets/javascripts/material_system/mounts.js`.

## Surface ownership

The hand-written inventory in `surfaces/contracts.js` maps each shared design
reference to its production host:

- `Shell A` is the authenticated navigation shell.
- `Shell B` is the unauthenticated/login shell and compact authenticated shell.
- `Sidebar` consumes the Rails `data-sidebar` payload; it does not manufacture
  project, permission, or menu data.
- `Command Palette` and `Regex Builder` are overlays. Both restore focus to the
  control that opened them and close with Escape.
- `Analyze` consumes an adapter supplied by the analytics dashboard page. When
  the page has no dashboard payload it renders an explicit unavailable state.

## Mounting

`mountMaterialSurfaces` can mount the shared components independently, which is
important for layouts that already own their page body. The Rails layouts expose
stable data attributes on the authenticated top bar/sidebar and login surface.
The analytics mount is opt-in when a page supplies `data-analytics-data` or an
adapter, so it cannot replace the existing dashboard implementation with a
sample dataset.

## Interaction contract

Every search field has a directly adjacent regex-builder action. Plain-text
search remains the default; the builder applies bounded JavaScript regular
expressions and reports invalid syntax without applying a filter. The global
palette is available through `Ctrl+Shift+F`, supports keyboard navigation, and
executes the registered action rather than a prototype-only callback.

## Verification

`spec/frontend/material_system/shared_shell_spec.js` checks the complete
six-entry inventory, deliberately removes the Regex Builder row to prove the
negative guard turns red, restores it, and verifies that Analyze accepts only
supplied analytics data.
