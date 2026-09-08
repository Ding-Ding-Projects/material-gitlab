# Material Web selection control migration contract

This document defines the Vue 2 adapter contract for official Material Web
buttons and selection controls. It is a migration API contract, not completed
runtime evidence. Browser behavior, production-built interactions, captures, and
full visual parity remain pending until real browser evidence exists. The focused
DOM test exists and exercises actual official elements with the documented test
environment limitations below.

## Provenance and boundary

The adapters use the official `@material/web` package, version `2.5.0`, licensed
under Apache-2.0. The supported controls are registered by the application's
Material Web registration module and rendered as official `md-*` elements. The
adapters expose Vue 2-friendly APIs while leaving component anatomy, interaction,
and form participation to the official elements.

The adapters do not add wrapper layout. Callers own placement, grouping, and
visible labels. A control's accessible name comes from a caller-owned native
`label` associated with the control's exact `id`, or from an explicit `aria-label`
when a visible external label is not available.

All ordinary attributes and non-model listeners are forwarded to the official
element. Model-changing events are the sole transformed path: each adapter updates
its Vue 2 model contract first, then exposes the original browser event separately
as `native-change`. For the checkbox, the original input event is also forwarded.

Native form values, required state, validation, and form association remain the
official controls' `ElementInternals` responsibility. The adapters must not create
hidden inputs, duplicate validation, or synthesize a second form value.

## Button adapter

`components/material_button.js` provides one button API and selects the official
element from its `variant` prop.

| Adapter prop | Type and default | Official element |
| --- | --- | --- |
| `variant` | Default `filled`; one of `filled`, `outlined`, `tonal`, `elevated`, or `text` | `md-filled-button`, `md-outlined-button`, `md-filled-tonal-button`, `md-elevated-button`, or `md-text-button` respectively |
| `disabled` | Boolean | The selected official button's disabled state |
| `type` | String, default `button` | The selected official button's form type |
| `href` | String | The selected official button's link destination when supported |

The adapter forwards ordinary attributes and listeners to the selected element.
It does not implement button appearance with a generic element or attach its own
layout wrapper.

## Checkbox adapter

`components/material_checkbox.js` uses the Vue 2 model pair `checked` and
`change`. Its props are:

| Prop | Contract |
| --- | --- |
| `checked` | Boolean, String, Number, or Array of primitive values. A scalar matches `trueValue`; an Array represents a selected-value collection. |
| `value` | Scalar value, default `on`. |
| `trueValue` | Scalar value, default `true`. |
| `falseValue` | Scalar value, default `false`. |
| `disabled` | Boolean disabled state. |
| `required` | Boolean required state. |
| `indeterminate` | Boolean indeterminate presentation state. |

On a checkbox change, the adapter emits `change` with the new model value and
`native-change` with the original change event. It also forwards the original
native input event. When `checked` is an Array, adding or removing `value` creates
a copied Array. The adapter never mutates the caller's Array in place. When
`checked` is scalar, the adapter emits `trueValue` or `falseValue` according to
the official checkbox selection state.

## Radio adapter

`components/material_radio.js` uses the Vue 2 model pair `modelValue` and
`change`. Its props are:

| Prop | Contract |
| --- | --- |
| `modelValue` | Scalar selected value. |
| `value` | Scalar option value, default `on`. |
| `name` | Forwarded through attributes to group official native `md-radio` controls. |

When a radio control is selected, the adapter emits `change` with that option's
`value` and emits `native-change` with the original change event. The official
`md-radio` elements retain native radio grouping through their shared `name`.

## Switch adapter

`components/material_switch.js` uses the Vue 2 model pair `selected` and
`change`. Its props are:

| Prop | Contract |
| --- | --- |
| `selected` | Boolean selected state. |
| `value` | Scalar form value, default `on`. |
| `disabled` | Boolean disabled state. |
| `required` | Boolean required state. |
| `icons` | Enables the official icon affordance. |
| `showOnlySelectedIcon` | Limits the displayed official icon to the selected state. |

On change, the switch adapter emits the new Boolean `selected` model value and
emits `native-change` with the original change event. It forwards all other
attributes and listeners to `md-switch`.

## Focused test and evidence inventory

The focused migration contract test is:

```text
spec/frontend/material_system/material_web_selection_controls_spec.js
```

It checks the exact official element mapping, Vue 2 model prop and event pairs,
Array-copy behavior, native event forwarding, accessible labeling boundary,
attribute and listener forwarding, and the absence of adapter-owned layout or
duplicated form participation.

| Evidence item | State |
| --- | --- |
| Focused DOM migration assertions | 29 passed with the documented polyfill limits |
| Native browser form and `ElementInternals` behavior | Pending |
| Production-built control interactions | Pending |
| Accessible-name verification | DOM labels exercised; native-browser accessibility pending |
| Captures from the real built application | Pending |
| Full visual parity review | Pending |

No pending row is an exemption. Each control still requires its exact production
mount, semantic interaction, capture, and parity evidence under the declared
viewport, scale, theme, and language tuple.

## Focused evidence and known limits

The test source is `spec/frontend/material_system/material_web_selection_controls_spec.js`.
It exercises all five real button constructors, dynamic variant/link changes,
icon slots, accessible names, disabled activation, Boolean/Array/custom-value
checkbox models, immutable collections, required/indeterminate state, radio click
and Space selection, switch Enter activation, selected/unchecked form values,
and exact registration and native-replacement negative regressions.

Supported selection model values are primitive strings, numbers, or booleans;
objects are not supported by these adapters. Primitive equality follows Vue 2's
string-equivalent selection matching. Form values use the scalar's string form.
Buttons forward the default label slot and named icon slot into the official
component's supported content. Switches forward on-icon and off-icon slots.
The internal slot-content spans are not standalone controls or layout wrappers.

The test-only ElementInternals polyfill needs Boolean normalization for partial
validity dictionaries. Undefined flags must become false under WebIDL conversion;
true invalid flags and their required validation messages remain enforced.
jsdom-generated checkbox input events do not compose through the shadow root, so
listener tests explicitly dispatch a composed InputEvent after real activation.
The polyfill also creates hidden inputs without propagating disabled state.
Native disabled-control omission from FormData remains a required browser check,
not a claim made by this DOM suite.

Material Web 2.5.0's official radio SingleSelectionController searches all elements
with the same name in the root. It does not scope groups to a containing form,
and it interpolates the name into a CSS selector. Use document-unique simple group
names (letters, digits, hyphens, and underscores) for the supported migration path.
Repeated names across different forms and names needing CSS escaping remain open
upstream compatibility defects. No adapter patches the official controller or
changes submitted names behind the caller's back.

The test polyfill's hidden inputs also share radio names, so the official arrow
controller can select those test-only nodes. Native-browser arrow traversal and
skipping disabled options therefore remain pending. Click/Space selection and
model/form values are exercised without replacing the real radio component.

No layout, card, menu, or additional surface is registered by these adapters.
Every production interaction, localization, native-browser result, capture, and
full-parity inventory item still needs its own real evidence before completion.
