# General controls Material Web migration

This migration replaces supported, visible native controls in the Admin, Manage, and Todos surfaces with the registered Vue 2 adapters in `material_system/components`.

| Surface | File | Control | Adapter | Preserved behavior |
| --- | --- | --- | --- | --- |
| Admin | `components/ListRow.vue` | row selector | `MaterialCheckbox` | emits `toggle-select` without changing row identity |
| Admin | `components/ListRow.vue` | row action | `MaterialButton` | emits `action` with the existing action ID |
| Admin | `components/SearchField.vue` | search field | `MaterialTextField` | emits the typed value and preserves regex controls |
| Admin | `components/SearchField.vue` | regex actions | `MaterialButton` | preserves expanded state and focus restoration |
| Manage | `components/MgSelectionToolbar.vue` | bulk selector | `MaterialCheckbox` | preserves select-all, clear, and indeterminate state |
| Manage | `components/MgSelectionToolbar.vue` | selection actions | `MaterialButton` | preserves visible-count availability |
| Manage | `components/LabelsList.vue` | label selector | `MaterialCheckbox` | emits the existing label ID |
| Manage | `components/LabelsList.vue` | delete actions | `MaterialButton` | preserves confirmation request payloads |
| Todos | `components/TodoListItem.vue` | item selector | `MaterialCheckbox` | emits the existing todo ID |
| Todos | `components/TodoListItem.vue` | state action | `MaterialButton` | preserves done and restore events |
| Todos | `components/TodosTopBar.vue` | search field | `MaterialTextField` | emits `update:search` with the entered value |
| Todos | `components/TodosTopBar.vue` | search, palette, and theme actions | `MaterialButton` | preserves event names and accessible labels |
| Todos | `components/TodosSelectionBar.vue` | visible selection | `MaterialCheckbox` | preserves disabled and indeterminate states |
| Todos | `components/TodosSelectionBar.vue` | bulk actions | `MaterialButton` | preserves current-view action routing and disabled states |

The migration intentionally leaves native selects, composite dialogs, and controls in unsupported composite forms as open gaps. They are not registered as Material controls until an adapter supports their actual behavior.

The focused spec checks the explicit inventory, compiles each owned template, verifies official custom-element constructors after mount, dispatches a real shadow-DOM interaction, and proves that a replacement native element fails the constructor assertion. Removing a listed adapter from an owned file, or replacing a mounted Material element with a native control, makes that check fail.
