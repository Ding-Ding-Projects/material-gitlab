---
stage: none
group: unassigned
info: Shared framework-neutral Material System runtime for page integrations
title: Material System runtime
---

The Material System runtime provides framework-neutral state and adapter boundaries for GitLab pages. Page code should import named exports from `~/material_system`; files below that directory are implementation details and are not stable integration paths.

## Create a page runtime

Create one runtime for the page or application boundary and dispose it when that boundary is destroyed:

```javascript
import { createMaterialSystemRuntime } from '~/material_system';

const runtime = createMaterialSystemRuntime({
  storage: window.localStorage,
  target: window,
  statusHubAdapter,
  capabilityAdapters: {
    locks: lockAdapter,
  },
});

const unsubscribe = runtime.settings.subscribe((settings) => {
  renderSettings(settings);
});

// Page teardown
unsubscribe();
runtime.dispose();
```

`createMaterialSystemRuntime(options)` returns a frozen object with these service properties:

| Service | Page integration purpose |
| --- | --- |
| `settings` | Persisted language, theme, density, typography, motion, and related Material settings |
| `schoolMode` | Shared School mode presentation and unlock adapter boundary |
| `appearance` | Global settings plus per-element appearance overrides and context actions |
| `notifications` | Non-blocking notifications and reviewable notification history |
| `vocabulary` | Bounded, local-only personal vocabulary loading and translation |
| `commandPalette` | Searchable commands and `Ctrl+Shift+F` activation |
| `tabs` | Docking, groups, pinning, four discovery searches, and protected close previews |
| `history` | Redacted append-only local mutation records |
| `statusHub` | Project, session, status, and evidence adapter boundary |
| `narrator` | Serialized English and Cantonese speech queues and voice discovery |
| `capabilities` | Fail-closed registration for platform-specific capabilities |
| `logo` | Local logo presets, bounded decoding, conversion, and transforms |
| `fileConverter` | Categorized conversion adapter registry and queue creation |

Call `runtime.snapshot()` when a page needs a serializable point-in-time view of all services. Subscribe to individual services for reactive rendering; the aggregate snapshot is not a replacement for lifecycle-specific subscriptions.

The personal vocabulary loader accepts only the versioned public schema. It validates the complete text before replacing the last valid local cache:

```json
{
  "schemaVersion": 1,
  "entries": [
    {
      "language": "en",
      "key": "projects.empty.title",
      "value": "No projects yet"
    }
  ]
}
```

Use `runtime.vocabulary.translate(key, language, fallback, { schoolMode })`. The fallback remains the rendered value when the cache is empty or School mode is active.

## Register platform adapters

Platform capabilities are unavailable until an adapter provides every method in the corresponding contract. Registration rejects incomplete adapters instead of exposing a partially working control.

```javascript
import {
  createCapabilityRegistry,
  registerCapabilityAdapter,
} from '~/material_system';

const capabilities = createCapabilityRegistry();
const unregister = registerCapabilityAdapter(capabilities, 'locks', {
  createLock,
  unlock,
  removeLock,
}, {
  implementation: 'platform-credential-vault',
});

const status = capabilities.status('locks');
if (status.status === 'available') {
  await capabilities.invoke('locks', 'unlock', elementId);
}

unregister();
```

File-conversion adapters have an additional packaging boundary. An enabled adapter must declare `bundled: true`, provide packaged-artifact proof, implement conversion and output validation, and satisfy its declared resource limits. Known formats whose adapters are missing remain visible as unavailable capabilities with their reason.

## Assert canonical feature coverage

The registry is an exact, hand-written completeness boundary. Each page surface supplies evidence for every ID in `CANONICAL_FEATURE_IDS` and for every slot in `EVIDENCE_SLOTS`.

```javascript
import {
  assertCanonicalFeatureRegistry,
  createFeatureRegistry,
  createSurfaceInventory,
} from '~/material_system';

const projectsPage = createSurfaceInventory({
  id: 'surface.projects-overview',
  kind: 'page',
  title: 'Projects overview',
  route: '/dashboard/projects',
});

const registry = createFeatureRegistry({
  surfaces: [projectsPage],
  negativeRegression: {
    ref: 'spec/frontend/material_system/registry_spec.js',
    verified: true,
  },
});

assertCanonicalFeatureRegistry(registry);
```

Before calling the assertion, replace each surface's pending coverage entries with page-specific implementation, documentation, localization, persistence, test, built-artifact interaction, and capture evidence. Do not derive the required list from discovered features: exact removal must fail validation.

## Rendering, privacy, and failure behavior

- Keep raw patterns, sample text, vocabulary payloads, credentials, document content, and platform secrets local to the page or privileged adapter that owns them.
- Treat an unavailable adapter as an unavailable feature state. Do not replace it with a control that reports success without performing the operation.
- Give every rendered control an accessible name, role, state, visible focus, keyboard path, sufficient contrast, and a layout that works at narrow widths and enlarged text.
- Keep notifications non-blocking unless the user must make a decision. Preserve errors and warnings until they are dismissed.
- Dispose the runtime to remove target listeners, storage subscriptions, timers, speech queues, and adapter registrations owned by the page.

## Verification

Focused unit, accessibility, and exact-removal regression coverage lives in `spec/frontend/material_system/`. Page integrations should add tests for their renderer bindings and built-artifact interactions without reaching into internal Material System modules.

## Related topics

- [Design tokens](design_tokens.md)
- [Frontend style guide](style/_index.md)
- [Accessibility best practices](accessibility/best_practices.md)
