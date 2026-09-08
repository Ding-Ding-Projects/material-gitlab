# Operations control migration inventory

This inventory records the controls converted by the Operations controls slice. It is deliberately hand-written so a removed surface does not silently leave the check green.

| Surface | Control family | Registered Vue component | Official element | Preserved contract |
| --- | --- | --- | --- | --- |
| Analyze | Search and date fields | `MaterialTextField` | `md-filled-text-field` | `v-model`, date types, required state, search ref, ARIA validation, and submit behavior |
| Analyze | Toolbar, tabs, date submit, retry | `MaterialIconButton`, `MaterialTextButton` | `md-icon-button`, `md-text-button` | ARIA state, keyboard button type, disabled state, tab events, and retry event |
| Monitor | Search field and toolbar, tab, retry, and row actions | `MaterialTextField`, `MaterialTextButton` | `md-filled-text-field`, `md-text-button` | Query model, ARIA states, disabled state, and confirmation handoff |
| Operate | Search field and toolbar, tab, retry, stop, and lock actions | `MaterialTextField`, `MaterialTextButton` | `md-filled-text-field`, `md-text-button` | Query model, ARIA states, disabled state, and confirmation handoff |
| Build | Row and bulk selection plus row and bulk actions | `MaterialCheckbox`, `MaterialButton` | `md-checkbox`, `md-text-button` | Selection events, indeterminate state, action callback, and destructive styling hook |
| Code | Row selection and row actions | `MaterialCheckbox`, `MaterialButton` | `md-checkbox`, `md-text-button` | Selected state, row identity, and action callback |
| Deploy | Row and bulk selection plus row actions | `MaterialCheckbox`, `MaterialButton` | `md-checkbox`, `md-text-button` | Selected state, indeterminate state, row identity, and action callback |
| Pipelines | Row and list selection plus row opening | `MaterialCheckbox`, `MaterialButton` | `md-checkbox`, `md-text-button` | Selected state, indeterminate state, pipeline identity, and opening event |
| Repository | File-tree selection and opening | `MaterialCheckbox`, `MaterialButton` | `md-checkbox`, `md-text-button` | Selected state, entry identity, and opening event |
| Secure | List selection and row actions | `MaterialCheckbox`, `MaterialButton` | `md-checkbox`, `md-text-button` | Selected state, row identity, and action callback |
| Security | Vulnerability selection | `MaterialCheckbox` | `md-checkbox` | Selected state, vulnerability identity, and row-click isolation |

Native selects, complex menus, dialogs, layouts, and remaining unconverted control components stay open. They must not be represented as migrated until the matching registered component is available and their required semantics are preserved.
