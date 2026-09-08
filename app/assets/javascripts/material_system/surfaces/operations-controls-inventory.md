# Operations control migration inventory

This inventory records the controls converted by the Operations controls slice. It is deliberately hand-written so a removed surface does not silently leave the check green.

| Surface | Control family | Registered Vue component | Official element | Preserved contract |
| --- | --- | --- | --- | --- |
| Analyze | Search and date fields | `MaterialTextField` | `md-filled-text-field` | `v-model`, date types, required state, search ref, ARIA validation, and submit behavior |
| Analyze | Toolbar, tabs, date submit, retry | `MaterialIconButton`, `MaterialTextButton` | `md-icon-button`, `md-text-button` | ARIA state, keyboard button type, disabled state, tab events, and retry event |
| Monitor | Search field and toolbar, tab, retry, and row actions | `MaterialTextField`, `MaterialTextButton` | `md-filled-text-field`, `md-text-button` | Query model, ARIA states, disabled state, and confirmation handoff |
| Operate | Search field and toolbar, tab, retry, stop, and lock actions | `MaterialTextField`, `MaterialTextButton` | `md-filled-text-field`, `md-text-button` | Query model, ARIA states, disabled state, and confirmation handoff |

Native selections, complex menus, dialogs, and selection controls remain open because the registered adapter set does not yet expose their required semantics. They must not be represented as migrated until the matching registered component is available.
