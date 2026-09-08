# Project surface control migration

The Settings, Plan, Issues, Merge Requests, and Epics surfaces use the official
`@material/web` Vue 2 adapters for the controls listed in each surface's
`control-inventory.json`. The inventory lists exact files and declaration counts;
loops can render multiple controls from one declaration. It also names every
retained native or GitLab form control. This is a bounded control migration,
not a claim that every container, menu, dialog, or selection control is Material 3.

| Surface | Files with migrated controls | Buttons | Icon buttons | Text buttons | Text fields |
| --- | ---: | ---: | ---: | ---: | ---: |
| Settings | 21 | 24 | 11 | 6 | 13 |
| Plan | 11 | 24 | 0 | 0 | 5 |
| Issues | 14 | 34 | 0 | 0 | 6 |
| Merge Requests | 17 | 28 | 0 | 0 | 5 |
| Epics | 10 | 24 | 0 | 0 | 4 |

## Behavior preserved

The migration retains permission expressions, disabled conditions, navigation
URLs, action events, form names and hidden fields. Text adapters emit their value
for Vue 2 `input`, so handlers consume that value rather than a DOM event. Native
`change`, `blur`, and keyboard listeners retain their original event semantics.
Multiline text uses `type="textarea"`. Each migrated text control has its own
accessible name because an external label alone cannot name a shadow input.

References that are focused call the adapter's `focus()` method. The merge-request
regex popover receives the adapter's actual `$el` as its `HTMLElement` opening
control. Plan and Settings focus traps enumerate the actual Material hosts, so
keyboard traversal still wraps between the first and last controls. Surface CSS
maps its existing light/dark palette to official Material Web custom properties;
the official components own their internal shape, ripple, focus ring, and field
anatomy.

The Settings subset retains the original persistence events, destructive-action
confirmation, and permission conditions. It does not simulate any successful
backend action or replace a real route with local demonstration data.

## Explicit remaining controls

The per-surface inventories are the exact path and declaration-count record:

- `app/assets/javascripts/material_system/surfaces/Settings/control-inventory.json`
- `app/assets/javascripts/material_system/surfaces/Plan/control-inventory.json`
- `app/assets/javascripts/material_system/surfaces/Issues/control-inventory.json`
- `app/assets/javascripts/material_system/surfaces/MergeRequests/control-inventory.json`
- `app/assets/javascripts/material_system/surfaces/Epics/control-inventory.json`

Settings retains file pickers in `FileConverterCard`, `ProjectLogoCard`, and
`VocabularyCard`; selection checkboxes in integration/member/protected-branch/
variable rows, the selection toolbar, and regex flags; and hidden Rails form
fields. Advanced project, additional project, Duo context/remediation,
service-desk, secrets-manager, and special-capability forms retain the listed
GitLab form components. Those fields have nested submission names, validation,
async loading, or backend-specific payload semantics that require their own
adapter integration review. Their unchanged implementation is not registered as
an official Material replacement.

Plan retains `SelectCheckbox` and its indeterminate-state implementation. Issues
retains row/list selection checkboxes and the board-card destination select.
Merge Requests retains row/list selection checkboxes. Epics retains tree and
row selection checkboxes. Selection migration must preserve indeterminate state,
array values, and native-change events. Radio groups must also preserve native
form ownership rather than relying on a same-name group shared across forms.

Existing links, layout containers, chip groups, dialog containers, menus, and
other complex composites are outside this control subset and remain open for
component-anatomy and design-reference review. No built-browser interaction or
visual parity evidence is claimed by this change.

## Verification

Run the focused DOM contracts with:

```shell
node node_modules/jest/bin/jest.js --config jest.config.js --runInBand spec/frontend/material_system/project_controls_spec.js
```

The suite compiles every inventoried template and checks its explicit counts.
It mounts real surface components and checks actual registered constructor and
shadow-root identity. Negative cases replace rendered text fields and actions
with native tags, observe rejection, then restore the original hosts and verify
identity again. Behavioral cases cover issue title submission, comment values,
permission-disabled Settings choices, authorized create links, and confirm-dialog
focus traversal. The test-only ElementInternals polyfill is DOM support, not
browser form submission or rendered-layout evidence. The separate Rails build
and real browser verification remain required for those claims.

Verified results: the new control suite passes 20 tests, and the nine existing
related Settings, planning, issue/merge-request route, and epic mount suites pass
89 tests in total. The destructive-confirmation regression now drives the
official field value event instead of querying an obsolete native input.
The local focus-traversal test maps jsdom's unsupported `:focus-visible` selector
to its supported focus state; this does not establish a visual focus-ring result.
