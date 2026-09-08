# Agent Memory action capabilities

The Agent Memory controller currently exposes a read-only JSON representation. It returns empty instruction, skill, session, history, and sync collections until a local provider is configured. The response also publishes explicit capability booleans for every operation that would mutate host state.

The Vue surface reads those capability booleans before it renders action controls. When a capability is unavailable, the relevant control is disabled and the surface explains that the provider is read-only. The controller does not expose routes for synchronization, skill installation or removal, session replies or archival, or history restoration, so the client must not simulate any of those outcomes.

Search, regular-expression filtering, copying, exporting, and fetching the current read-only representation remain local or read-only operations. A successful notification is reserved for an operation with a real successful result from a supported provider.

## Verification

`spec/frontend/material_system/agent_memory_actions_spec.js` checks that unsupported actions remain unavailable and that invoking their methods cannot alter local records, schedule a completion timer, or report success.
