# Material Web component inventory

This document records the Material Web components introduced for the Shell A and
Shell B production mounts. It is a hand-written implementation and evidence
inventory. It is intentionally fail-closed: a row marked pending is not evidence
of a completed component conversion, interaction test, runtime capture, or visual
parity review.

## Provenance

The component source is the official [`@material/web`](https://material-web.dev/)
package, version `2.5.0`. The installed package metadata records the Apache-2.0
license and this npm tarball integrity value:

```text
sha512-x2Uovyq8E/Zc1xHXd9s1eBMXF5pMHVAt70pISKd0fL3Ajj4L6zQaQUY/awcfR2RDAMKXC7i4+vr0arv1YaOR/g==
```

The production adapters import the following official Material Web elements:

| Official element | Adapter responsibility | Intended production use |
| --- | --- | --- |
| `md-icon-button` | `components/material_icon_button.js` maps Vue props and listeners to the custom element. | Search, palette, and sidebar icon actions. |
| `md-text-button` | `components/material_text_button.js` maps the brand link properties and click handling. | Brand link. |
| `md-filled-text-field` | `components/material_text_field.js` maps field value, props, and events. | Search field. |

`components/register.js` imports and registers the Material Web custom elements.
The adapters import that registration module, and Shell A and Shell B use the
adapters through their production mount paths. The adapters are therefore the
application boundary. They do not recreate a visual copy of the Material Web
controls with generic HTML. `components/inventory.js` is the hand-written required control inventory used by focused tests. Its validator checks exact tags and official constructor identity, rather than accepting a class name on a native replacement.

## Vue 2 integration contract

The adapters bridge Vue 2's component model to browser custom elements.

- Props are written to element properties when the value is not a simple reflected
  attribute. This preserves booleans, strings, values, disabled state, labels, and
  component-specific configuration without coercing every value through HTML
  attributes.
- Native events are subscribed to on the host element through Vue listeners. Consumers retain ordinary Vue `@click`, `@input`, and change handling
  without relying on shadow-root internals.
- The filled-text-field adapter supplies the Vue 2 `v-model` bridge by accepting
  `value`, writing it to `md-filled-text-field.value`, and emitting the current
  value from the element's input event. Controlled updates and user input must not
  diverge.
- Accessible names are explicit. An icon-only action receives an `aria-label` from
  its caller; text buttons obtain their visible name from their text content; text
  fields receive an accessible label through the field's supported labeling API.
- Form behavior remains delegated to the official element. `md-filled-text-field`
  provides its own `ElementInternals` based form participation and validation
  semantics where the browser supports it. The adapter must not impersonate those
  native form semantics with a second hidden input or a duplicate validation model.
- Styling and interaction anatomy remain inside each official `md-*` shadow tree.
  Application code may set supported public properties, CSS custom properties, and
  event listeners. It must not query, patch, or depend on private shadow parts as
  though they were application-owned DOM.

## Per-surface inventory

The entries below name each migrated shell control and its focused test.
The initial focused run passed 30 tests across the two new suites and the existing
shared_shell, shell_navigation, and shell_bootstrap suites. These are DOM/source
results only. All production interaction and visual evidence remains pending.

| Shell | Surface | Official element and adapter | Production mount boundary | Focused test | Built-artifact interaction | Capture | Full parity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Shell A | Regex action | `md-icon-button` through `components/material_icon_button.js` | Shell A production mount | `spec/frontend/material_system/material_web_components_spec.js` | Pending | Pending | Pending |
| Shell A | Palette action | `md-icon-button` through `components/material_icon_button.js` | Shell A production mount | `spec/frontend/material_system/material_web_components_spec.js` | Pending | Pending | Pending |
| Shell A | Sidebar action | `md-icon-button` through `components/material_icon_button.js` | Shell A production mount | `spec/frontend/material_system/material_web_components_spec.js` | Pending | Pending | Pending |
| Shell A | Brand link | `md-text-button` through `components/material_text_button.js` | Shell A production mount | `spec/frontend/material_system/material_web_components_spec.js` | Pending | Pending | Pending |
| Shell A | Search field | `md-filled-text-field` through `components/material_text_field.js` | Shell A production mount | `spec/frontend/material_system/material_web_components_spec.js` | Pending | Pending | Pending |
| Shell A | Theme control | `md-icon-button` through `components/material_icon_button.js` | Shell A production mount | `spec/frontend/material_system/material_web_inventory_spec.js` | Pending | Pending | Pending |
| Shell B | Regex action | `md-icon-button` through `components/material_icon_button.js` | Shell B production mount | `spec/frontend/material_system/material_web_components_spec.js` | Pending | Pending | Pending |
| Shell B | Palette action | `md-icon-button` through `components/material_icon_button.js` | Shell B production mount | `spec/frontend/material_system/material_web_components_spec.js` | Pending | Pending | Pending |
| Shell B | Sidebar action | `md-icon-button` through `components/material_icon_button.js` | Shell B production mount | `spec/frontend/material_system/material_web_components_spec.js` | Pending | Pending | Pending |
| Shell B | Brand link | `md-text-button` through `components/material_text_button.js` | Shell B production mount | `spec/frontend/material_system/material_web_components_spec.js` | Pending | Pending | Pending |
| Shell B | Search field | `md-filled-text-field` through `components/material_text_field.js` | Shell B production mount | `spec/frontend/material_system/material_web_components_spec.js` | Pending | Pending | Pending |

The inventory test at `spec/frontend/material_system/material_web_inventory_spec.js`
requires independent explicit control IDs, exact registered constructors and
one exact rendered node per control. It rejects removal and native replacement
and restores the green result for each boundary. Automated freshness enforcement
for documentation, localization and built-artifact evidence is still pending;
this focused inventory cannot certify the broader completeness contract.

## Pending parity work

This change does not complete the broader interface conversion. The remaining
layout work includes the sidebar, palette, regex dialog, and 25 additional
surfaces. No surface has an exemption from the component, accessibility,
interaction, or evidence requirements.

Every row still requires a real production-built interaction, an accessible
semantic verification, a capture from that same build, and a full parity review
under its declared viewport, scale, theme, and language tuple. Until those records
exist and are current, the evidence state remains pending.

## Verification boundary

The focused suite exercises official registered custom elements, not component mocks.
It checks shadow-root button/link/input anatomy, accessible labels, real ripple and
focus-ring child registrations, disabled clicks, form data and submitter, cancelled
submit actions, controlled values, IME composition, native change events, shell
keyboard search and focus, palette/regex/sidebar actions, and managed theme state.
The inventory suite deliberately removes and replaces every required control with
a native button and rejects substituted constructors, then restores each boundary
and verifies the passing state. These tests do not certify every product feature.

The existing Jest environment uses jsdom 20. It has no native ElementInternals,
PointerEvent, or Web Animations implementation. The test-only setup installs the
pinned element-internals-polyfill 3.0.2 and supplies PointerEvent shape and an
explicit no-paint animation stub. The narrow Jest resolver selects browser exports
only for Lit packages. Production code uses the browser's native APIs and ships
neither the polyfill nor these test stubs. Form tests are polyfilled DOM evidence;
native-browser form, keyboard activation and rendered animation evidence remains
pending until the real Rails bundle is exercised. No test result is a screenshot,
visual parity approval, or complete accessibility certification.

The adapters are reached through ShellA/ShellB imports in material_system/mounts.js.
Only the shell's supported color/typeface custom properties are mapped to official
Material Web roles. Existing hand-built layout containers, sidebar navigation,
regex dialog, palette rows, and other surfaces remain explicit migration work.
They have no fabricated component registration. The npm package does not expose
a general-purpose layout or shell element, so layout conformance needs a separate
framework-appropriate design and verification decision.
