# Agent Memory action capabilities

The Agent Memory controller currently exposes a read-only JSON representation. It returns empty instruction, skill, session, history, and sync collections until a local provider is configured. The response also publishes explicit capability booleans for every operation that would mutate host state.

The Vue surface reads those capability booleans before it renders action controls. When a capability is unavailable, the relevant control is disabled and the surface explains that the provider is read-only. The controller does not expose routes for synchronization, skill installation or removal, session replies or archival, or history restoration, so the client must not simulate any of those outcomes.

Search, regular-expression filtering, copying, exporting, and fetching the current read-only representation remain local or read-only operations. A successful notification is reserved for an operation with a real successful result from a supported provider.

## Verification

`spec/frontend/material_system/agent_memory_actions_spec.js` checks that unsupported actions remain unavailable and that invoking their methods cannot alter local records, schedule a completion timer, or report success.

## Material control inventory

Every Agent Memory control is tracked below so that a native control cannot quietly return during a later edit. The focused specification checks the required Material wrapper constructors and tags after the matching wrappers are registered.

| Surface | Controls | Required wrapper | Current restriction |
| --- | --- | --- | --- |
| Sidebar | navigation search | `MaterialTextField` | Search remains local and does not change provider data. |
| Top bar | memory search, regex mode, regex builder, command palette, appearance | `MaterialTextField`, `MaterialTextButton`, `MaterialIconButton` | Search, palette, and appearance remain local. |
| Command palette | command search | `MaterialTextField` | Results run only their existing local or read-only actions. |
| Regex builder | pattern, flags, sample, copy, cancel, apply | `MaterialTextField`, `MaterialCheckbox`, `MaterialTextButton`, `MaterialButton` | Pattern processing is local. |
| Tab strip | tab navigation | `MaterialTextButton` | Maintains tab role, selected state, keyboard navigation, and refs. |
| Selection rows | block, skill, session, and revision selection | `MaterialCheckbox` | Selection remains local. |
| Status | live refresh, refresh, archive, reply | `MaterialSwitch`, `MaterialButton`, `MaterialTextField`, `MaterialIconButton` | Archive and reply remain disabled until adapters exist. |
| Skills and history | copy, export, reinstall, uninstall, restore | `MaterialButton`, `MaterialTextButton` | Reinstall, uninstall, and restore remain disabled until adapters exist. |
| Sync | canonical sync | `MaterialButton` | Disabled until a sync adapter exists. |
| Dialogs and notices | confirmation, toast action, dismiss, empty-state action | `MaterialButton`, `MaterialTextButton`, `MaterialIconButton` | Existing disabled and focus behavior remains unchanged. |

Native file pickers are not used by this surface. Its custom dialogs, overlays, listbox options, toast layout, and navigation links retain their current semantics because no Material Web wrapper contract is registered for those structures. The regex sample editor uses `MaterialTextField` with `type="textarea"` and `rows="4"`, a documented capability in the installed Material Web text-field implementation.

Provider flags cannot enable absent mutation adapters. The mounted regression
checks the disabled reinstall control, the unavailable sync state, and absence of
a sync button. Separate checks reject local array mutations, completion timers,
and success notifications. Four focused tests pass under the standard repository
Jest configuration. Real built interaction remains pending.
