# Operations control migration

The Analyze, Build, Code, Deploy, Monitor, Operate, Pipelines, Repository, Secure,
and Security surface trees use the registered Material Web adapters for every
supported direct button, checkbox, single-line text field, and multiline text field.
Existing selectors without an adapter remain explicit in each inventory. Complex
overlay containers are unchanged; their supported inner controls are migrated.

Each surface owns `control-inventory.json`, a fixed list of exact component paths
and direct declaration counts. `operations_complete_controls_spec.js` compiles all
owned Vue templates, compares their AST nodes to that inventory, and detects a new
control-bearing file outside the list. A removed inventoried file fails the check.
Counts refer to adapter tags, not visual variants: `MaterialButton` with
`variant="text"` counts only as a button.

## Preserved interactions

- `MaterialTextField` emits the current scalar value on `input`; original change
  listeners continue to receive the native change event. Textarea editors use
  `type="textarea"`, retain their rows, bounds, labels, and spellcheck settings.
- Selection callbacks retain record identity and indeterminate state. Bulk actions
  and destructive confirmation remain separate from selection and opening.
- Local component registration avoids reliance on unrelated entry-point side
  effects. Focus paths use adapter methods or the official element host.
- Pipeline status, stage metadata, and duration remain in the row layout outside
  the action label. Job cards likewise keep duration separate from their action.
- Public Material color roles and typefaces map to each surface's existing light
  and dark palette. Host sizing does not shrink actions below the official 40px
  target. Destructive color roles are passed through public component properties.

## Remaining unsupported controls and verification limits

Analyze's configured Insights chart select and Code's two compare selectors retain
native option selection because no official select adapter is registered. Their
exact files and reasons are listed in the surface inventories. No supported
button or text field receives a blanket exception because it lives in a dialog.

Focused Jest checks instantiate real registered Material Web constructors under
jsdom with the project's standards polyfills. They replace actual hosts with
native elements, require rejection, and verify restoration. They cover search
values, independent confirmation/cancellation, palette focus traversal, row
selection, and action callbacks. This is DOM contract evidence only, not a browser,
Rails runtime, visual, or packaged-application verification claim.

Material Web 2.5 button ARIA delegation requires separate shared-adapter coverage:
its own implementation moves host ARIA values and directly forwards only a subset
to the inner focused button. The operations suite records host `ariaPressed`
retention; focused pressed/selected/role propagation must be verified at the shared
adapter boundary before accessibility completion is claimed.

Run the focused evidence with:

```shell
node node_modules/jest/bin/jest.js --config jest.config.js --runInBand spec/frontend/material_system/operations_complete_controls_spec.js spec/frontend/material_system/operations_controls_material_spec.js
node --test spec/frontend/material_system/operations_controls_spec.cjs
```

## Recorded local verification

The completion candidate has 83 inventoried Vue files and 235 official adapter
declarations, with three explicit select exceptions. The focused constructor and
interaction suites pass 30 tests; the existing Code/Repository route, operations
security, and collaboration CI surface suites pass 17 tests. The earlier Node
inventory suite passes four checks. All nine owned SCSS entries compile. These
results do not claim visual or production-runtime verification.
