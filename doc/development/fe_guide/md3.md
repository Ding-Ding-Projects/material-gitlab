---
stage: none
group: unassigned
info: Any user with at least the Maintainer role can merge updates to this content. For details, see <https://docs.gitlab.com/development/development_processes/#development-guidelines-review>.
title: Material Design 3 (MD3) prototype layer
---

This page documents the Material Design 3 (MD3) prototype layer: a set of design tokens,
utility classes, and Vue components that implement a Material 3 visual style on top of the
existing GitLab frontend stack.

## Status

This layer is source code only. It is not imported by `app/assets/stylesheets/application.scss`
or any other compiled entry point, and the Vue components are not registered or mounted
anywhere in the application. Nothing described on this page currently renders on a live GitLab
page. Treat it as a reference implementation that a feature team can adopt deliberately, not as
something already shipping.

No automated test coverage exists for this layer: there are no Jest specs for the Vue
components, no SCSS/Stylelint checks specific to it beyond the project's normal linting, and no
visual regression or accessibility tests. Nothing in this layer has been run in a browser,
screenshotted, or otherwise verified to render correctly. Anyone adopting it should add the
usual component tests, accessibility checks, and visual verification before relying on it.

## Where it lives

| Layer | Path | Contents |
| --- | --- | --- |
| Tokens and primitives | `app/assets/stylesheets/md3/` | Color tokens, type scale, shape scale, elevation scale, motion tokens |
| Component styles | `app/assets/stylesheets/md3/components/` | One SCSS partial per component family (buttons, cards, chips, dialogs, forms, navigation, sidebar, top bar) |
| Vue components | `app/assets/javascripts/md3/components/` | Seven Vue single-file components |
| Vue barrel export | `app/assets/javascripts/md3/index.js` | Re-exports all seven components |

There is no `index.scss` or similar manifest inside `app/assets/stylesheets/md3/` that pulls the
partials together. Each partial is a standalone file meant to be `@import`ed individually (see
[Consuming tokens from SCSS](#consuming-tokens-from-scss)).

## The token contract

All color tokens are declared as CSS custom properties on `:root`, prefixed `--gl-md3-`. Each
short-name token also has a longer semantic alias (for example `--gl-md3-prim` and
`--gl-md3-primary` resolve to the same value) so component code can read either the compact name
or the descriptive one. Because CSS custom properties resolve at used-value time, every alias
automatically follows its underlying token through the dark-mode override, so alias definitions
only need to exist once, in the light-mode file.

| Token | Semantic alias | Light | Dark |
| --- | --- | --- | --- |
| `--gl-md3-surf` | `--gl-md3-surface` | `#f4effa` | `#141218` |
| `--gl-md3-surfc` | `--gl-md3-surface-container` | `#ece4f6` | `#211f26` |
| `--gl-md3-surfch` | `--gl-md3-surface-container-high` | `#e0d5f2` | `#2b2831` |
| `--gl-md3-surfcl` | `--gl-md3-surface-container-low` | `#faf6ff` | `#1b1922` |
| `--gl-md3-onsurf` | `--gl-md3-on-surface` | `#1d1b20` | `#e6e0e9` |
| `--gl-md3-onsurfv` | `--gl-md3-on-surface-variant` | `#49454f` | `#cac4d0` |
| `--gl-md3-prim` | `--gl-md3-primary` | `#6750c4` | `#cfbdfe` |
| `--gl-md3-onprim` | `--gl-md3-on-primary` | `#ffffff` | `#381e72` |
| `--gl-md3-primc` | `--gl-md3-primary-container` | `#e8def8` | `#4f378b` |
| `--gl-md3-onprimc` | `--gl-md3-on-primary-container` | `#4f378b` | `#e8def8` |
| `--gl-md3-sec` | `--gl-md3-secondary-container` | `#d6c9f0` | `#4a4458` |
| `--gl-md3-outl` | `--gl-md3-outline` | `#cac4d0` | `#49454f` |
| `--gl-md3-outlv` | `--gl-md3-outline-variant` | `#e7e0ec` | `#332f3a` |
| `--gl-md3-err` | `--gl-md3-error` | `#b3261e` | `#f2b8b5` |
| `--gl-md3-errc` | `--gl-md3-error-container` | `#f9dedc` | `#5c1a17` |
| `--gl-md3-good` | `--gl-md3-success` | `#1a7f37` | `#7fd79a` |
| `--gl-md3-goodc` | `--gl-md3-success-container` | `#dcf2e3` | `#1c3a27` |
| `--gl-md3-warn` | `--gl-md3-warning` | `#9a6700` | `#e2c46d` |
| `--gl-md3-warnc` | `--gl-md3-warning-container` | `#fff3d0` | `#3d3012` |
| `--gl-md3-card` | (none) | `#ffffff` | `#211f26` |
| `--gl-md3-scrim` | (none) | `rgba(29, 27, 32, 0.35)` | `rgba(0, 0, 0, 0.5)` |
| `--gl-md3-addbg` | `--gl-md3-diff-addition-background` | `#dcf2e3` | `#1c3a27` |
| `--gl-md3-addfg` | `--gl-md3-diff-addition-foreground` | `#0f5223` | `#a5e8b8` |
| `--gl-md3-delbg` | `--gl-md3-diff-deletion-background` | `#f9dedc` | `#5c1a17` |
| `--gl-md3-delfg` | `--gl-md3-diff-deletion-foreground` | `#8c1d18` | `#f5c0bd` |

`app/assets/stylesheets/md3/_tokens.scss` also exports the same 25 light-mode values as
compile-time SCSS variables (`$gl-md3-prim`, and so on) for code that needs a real color value
rather than a custom property (for example, passing a color into a Sass color function), and a
`$gl-md3-tokens` Sass map keyed by short token name for partials that need to loop over the full
set. These SCSS variables always hold the **light** value; they do not change in dark mode, so
prefer the CSS custom properties for anything that must adapt automatically.

Besides color, four more token families exist, each with its own scale, mixin, and set of
`.md3-*` utility classes:

| Family | Partial | Scale |
| --- | --- | --- |
| Typography | `_typography.scss` | 15 styles: `display-large/medium/small`, `headline-large/medium/small`, `title-large/medium/small`, `body-large/medium/small`, `label-large/medium/small` |
| Shape | `_shape.scss` | `none` (0), `xs` (8px), `s` (9px), `m` (12px), `l` (16px), `xl` (20px), `full` (999px) |
| Elevation | `_elevation.scss` | Levels `0`–`5`, each a `box-shadow` value; dark-mode variants raise the shadow alpha so shadows stay visible on dark surfaces |
| Motion | `_motion.scss` | Four easing curves (`standard`, `emphasized`, `decelerate`, `accelerate`) and 11 durations from `short1` (50ms) to `extra-long1` (700ms) |

## Consuming tokens from SCSS

Import the specific partials a stylesheet needs. There is no single umbrella file, so list them
in dependency order — most component partials assume tokens, shape, elevation, motion, and
typography are already loaded:

```scss
@import 'md3/tokens';
@import 'md3/tokens_dark';
@import 'md3/typography';
@import 'md3/shape';
@import 'md3/elevation';
@import 'md3/motion';
@import 'md3/components/buttons';
```

Read a color token directly with `var()`:

```scss
.my-md3-surface {
  background-color: var(--gl-md3-surface);
  color: var(--gl-md3-on-surface);
  border: 1px solid var(--gl-md3-outline-variant);
}
```

Use the typography, shape, elevation, and motion mixins instead of hand-writing the equivalent
declarations, so a future change to the scale updates every consumer:

```scss
.my-md3-panel {
  @include gl-md3-title-medium;
  @include gl-md3-shape('l');
  @include gl-md3-elevation(2);
  @include gl-md3-motion-standard(box-shadow);
}
```

`gl-md3-type($style)` is the general form behind the per-style mixins (`gl-md3-display-large`,
`gl-md3-body-small`, and so on); reach for it when the style name is a variable rather than a
literal. `gl-md3-motion($properties, $duration, $easing)` is the general form behind
`gl-md3-motion-standard`, `gl-md3-motion-emphasized`, `gl-md3-motion-enter`, and
`gl-md3-motion-exit`, which supply MD3's recommended duration/easing pairing for a plain state
change, an emphasized change, an element entering, and an element exiting, respectively.

Every utility class documented below is generated from the same Sass maps as the mixins, so a
class and its mixin equivalent can never disagree about a value.

## Consuming tokens from a Vue component

A single-file component's `<style>` block can use the same `var(--gl-md3-*)` custom properties
and `@include` the same mixins as any other SCSS, once the relevant partials are imported.
Because the custom properties are declared on `:root`, they are also readable directly from a
component's inline `style` binding, which is how `Md3Chip` threads a per-label color that comes
from user data rather than from the fixed token set:

```js
computed: {
  chipStyle() {
    const style = {};
    if (this.color) style['--md3-chip-color'] = this.color;
    return style;
  },
},
```

```html
<div class="md3-chip" :style="chipStyle">...</div>
```

At the time of writing, `_chips.scss` does not itself read `--md3-chip-color`, so this specific
custom property is set but currently has no effect (see [Known limits](#known-limits)). The
pattern — set a custom property from a computed `style` object, then reference it from SCSS with
`var()` and a fallback — is still the correct one to use for any future per-instance override.

## SCSS component classes

Every class below is prefixed `md3-` and lives in `app/assets/stylesheets/md3/components/`.
These are plain CSS classes with no Vue component wired to them except where noted; they can be
applied directly to any markup, Haml or Vue template alike.

### Buttons (`_buttons.scss`)

Five container button variants share a `.md3-btn` base plus a variant modifier:

```html
<button class="md3-btn md3-btn--filled">Save changes</button>
<button class="md3-btn md3-btn--filled-tonal">New issue</button>
<button class="md3-btn md3-btn--outlined">Reopen issue</button>
<button class="md3-btn md3-btn--text">Cancel</button>
<button class="md3-btn md3-btn--elevated">Elevated</button>
```

Add `md3-btn--icon-start` or `md3-btn--icon-end` alongside the base class when the button has a
leading or trailing `.material-symbols-outlined` icon, so the icon-side padding matches the MD3
spec. Circular icon buttons and the floating action button (FAB) are separate class families:

```html
<button class="md3-icon-button md3-icon-button--tonal" aria-label="Settings">
  <span class="material-symbols-outlined">settings</span>
</button>

<button class="md3-fab md3-fab--extended">
  <span class="material-symbols-outlined">add</span>
  New epic
</button>
```

`md3-icon-button` also has `--filled` and `--outlined` modifiers; `md3-fab` also has `--small`.

### Cards (`_cards.scss`)

```html
<div class="md3-card md3-card--outlined">
  <div class="md3-card__header">
    <h3 class="md3-card__title">Card title</h3>
  </div>
  <div class="md3-card__body"><p>Card body text.</p></div>
  <div class="md3-card__footer">
    <button class="md3-btn md3-btn--text">Action</button>
  </div>
</div>
```

The base `.md3-card` class alone renders the elevated style (a level-1 shadow, no border); add
`md3-card--filled` for a flat, no-shadow container fill, or `md3-card--outlined` for a
hairline-bordered surface. Add `md3-card--interactive` to a clickable card for hover elevation
and a visible focus ring.

### Chips (`_chips.scss`)

```html
<div class="md3-chip-group">
  <button class="md3-chip md3-chip--filter" aria-pressed="false">Open</button>
  <button class="md3-chip md3-chip--filter md3-chip--selected" aria-pressed="true">Closed</button>
  <span class="md3-chip md3-chip--input">
    <span class="md3-chip__label">assignee.name</span>
    <button class="md3-chip__remove" aria-label="Remove">
      <span class="material-symbols-outlined">close</span>
    </button>
  </span>
</div>
```

Variants are `--assist`, `--filter`, `--input`, and `--suggestion`. `.md3-chip` supplies its own
interactive states (hover, focus-visible, pressed), so for a clickable chip apply `.md3-chip`
directly to the interactive element (a `<button>`) rather than to a wrapping `<div>`.

### Dialogs, menus, and overlays (`_dialogs.scss`)

This partial covers the scrim, a basic dialog, a wide dialog, a full-screen dialog, the command
palette, a right-anchored side sheet, and anchored menu and popover surfaces. Every surface here
paints its own background, border, and elevation and is bounded by the viewport with internal
scrolling, rather than relying on the page behind it or clipping its content.

```html
<div class="md3-dialog-scrim">
  <div class="md3-dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
    <div class="md3-dialog__header">
      <h2 class="md3-dialog__title" id="dlg-title">Delete branch?</h2>
    </div>
    <div class="md3-dialog__actions">
      <button class="md3-btn md3-btn--text">Cancel</button>
      <button class="md3-btn md3-btn--filled">Delete</button>
    </div>
  </div>
</div>
```

`.md3-dialog-scrim` is the fixed, centered, `background-color: var(--gl-md3-scrim)` backdrop;
`.md3-dialog` is the panel itself. Modifiers on the scrim (`--top`, `--sheet`, `--palette`,
`--fullscreen`) change where the panel is anchored; modifiers on the dialog (`--wide`,
`--fullscreen`, `--scroll-body`) change its size and internal scroll behavior. `.md3-menu` and
`.md3-popover` are lighter-weight anchored surfaces for a dropdown or an arbitrary floating panel
(add `--fixed` when the surface must escape an `overflow: hidden` ancestor). Every overlay layer
has a fixed `z-index` defined near the top of the file (`$md3-z-sheet`, `$md3-z-dialog`,
`$md3-z-palette`, `$md3-z-menu`), chosen to sit above GitLab's own chrome. Vue `<transition>`
enter/leave classes are also defined for the scrim, dialog, command palette, side sheet, and
menu, using the transition names `md3-dialog-scrim`, `md3-dialog`, `md3-command-palette`,
`md3-side-sheet`, and `md3-menu` respectively.

### Forms (`_forms.scss`)

Filled and outlined text fields with a floating label, a select, checkbox, radio, switch, and a
pill-shaped search field:

```html
<div class="md3-field md3-field--outlined">
  <input class="md3-field__input" id="f1" placeholder=" " />
  <label class="md3-field__label" for="f1">Title</label>
</div>

<label class="md3-switch">
  <input class="md3-switch__input" type="checkbox" />
  <span class="md3-switch__track"><span class="md3-switch__thumb"></span></span>
  Enable notifications
</label>
```

The floating label relies on plain CSS (`:placeholder-shown` and the adjacent-sibling
combinator), so the input needs `placeholder=" "` (a single space, not an empty string) and the
`.md3-field__label` element must immediately follow `.md3-field__input` as its next sibling in
the markup — this works with no JavaScript, but only if that DOM order is preserved. When a field
sits on a card rather than directly on the page background, add `md3-field--on-card` so the
floated label's backdrop color matches the card surface instead of the page surface.

### Navigation (`_navigation.scss`)

An underline tab bar, a pill-shaped segmented control (for a List/Board-style view switcher), a
breadcrumb trail, and a standalone icon-and-label navigation rail:

```html
<div class="md3-tabs">
  <a class="md3-tabs__tab md3-tabs__tab--active" href="#">Overview</a>
  <a class="md3-tabs__tab" href="#">Activity</a>
</div>

<div class="md3-segmented">
  <button class="md3-segmented__option md3-segmented__option--active">List</button>
  <button class="md3-segmented__option">Board</button>
</div>
```

`.md3-nav-rail` is a separate, standalone vertical rail component, distinct from the collapsed
`md3-sidebar--rail` state of the navigation drawer described next.

### Sidebar (`_sidebar.scss`)

The primary 248px navigation drawer: brand mark, a project/group context card, a search field,
and grouped navigation items. Below a 768px viewport width it leaves the normal flex layout and
becomes a fixed overlay panel, toggled with `md3-sidebar--open` and paired with a
`.md3-sidebar-scrim` backdrop (add `md3-sidebar-scrim--visible` to show it). Add
`md3-sidebar--rail` for a permanently collapsed, icon-only 80px rail at any viewport width.

### Top bar (`_topbar.scss`)

The global top app bar: a search field (composing with `.md3-search-field` from `_forms.scss`),
a smaller in-field regex-mode toggle and regex-builder trigger, and space for icon actions
(composing with `.md3-icon-button` from `_buttons.scss`) and an account avatar.

## Vue components

`app/assets/javascripts/md3/index.js` re-exports all seven components, so consumers can import
from the barrel:

```js
import { Md3Button, Md3Card } from '~/../app/assets/javascripts/md3';
```

(Adjust the import specifier to whatever module alias a consuming app actually resolves this
path through; no alias for `app/assets/javascripts/md3` has been registered anywhere in the
codebase yet.)

| Component | File | Purpose |
| --- | --- | --- |
| `Md3Button` | `md3_button.vue` | A button or link styled as a button, with variant/size/icon/loading props |
| `Md3Card` | `md3_card.vue` | A card container with optional header/actions slots and an interactive mode |
| `Md3Chip` | `md3_chip.vue` | A chip with an optional leading icon and an optional remove action |
| `Md3Dialog` | `md3_dialog.vue` | A modal dialog with focus trapping, Escape-to-close, and backdrop-click-to-close |
| `Md3NavDrawer` | `md3_nav_drawer.vue` | A filterable, sectioned navigation list with a `/`-to-focus shortcut |
| `Md3TextField` | `md3_text_field.vue` | A labeled text input or textarea, including a password-reveal toggle |
| `Md3ThemeToggle` | `md3_theme_toggle.vue` | A single icon button that toggles `.gl-dark` on `<html>` and persists the choice |

```html
<md3-button variant="filled-tonal" icon="add" @click="createIssue">New issue</md3-button>

<md3-card variant="outlined" interactive @click="openIssue">
  <template #header><h3>Issue title</h3></template>
  Issue summary text.
</md3-card>

<md3-chip variant="filter" :selected="isOpen" @click="toggleOpen">Open</md3-chip>

<md3-dialog :visible="showDialog" title="Delete branch?" @close="showDialog = false">
  Are you sure?
  <template #actions>
    <md3-button variant="filled" @click="confirmDelete">Delete</md3-button>
  </template>
</md3-dialog>

<md3-nav-drawer :sections="navSections" @filter-change="onFilterChange" />

<md3-text-field v-model="title" label="Title" :error-message="titleError" />

<md3-theme-toggle @change="onThemeChange" />
```

`Md3Button`'s `variant` prop accepts `filled`, `tonal`, `outlined`, `text`, or `elevated` (note:
`tonal`, not `filled-tonal` — see [Known limits](#known-limits) for why this matters).
`Md3Card`'s `variant` prop accepts `elevated`, `filled`, or `outlined`. `Md3Chip`'s `variant`
prop accepts `assist`, `filter`, `input`, or `suggestion`, matching the SCSS chip variants
one-for-one.

`Md3Dialog`, `Md3TextField`, and `Md3ThemeToggle` each render an internal `<md3-button>` for
their close button, password-reveal button, or the toggle itself, so `Md3Button`'s styling
situation (see below) affects all three.

## How dark mode resolves

Dark-mode color values are declared in `_tokens_dark.scss` (colors) and inside `_elevation.scss`
(shadow alpha). Both files apply the dark values through the same two selectors, in this order
of precedence:

1. **`:root.gl-dark`** — GitLab's own explicit dark color-mode class. This is the class GitLab
   sets on `<html>` when a signed-in user has explicitly chosen the dark theme (see
   `user_application_color_mode` in `app/helpers/preferences_helper.rb`, which compares against
   the literal strings `gl-light` and `gl-dark`). This selector always wins because it is a class
   selector, which beats the media-query fallback below whenever both would otherwise apply.
2. **`@media (prefers-color-scheme: dark) { :root:not(.gl-light) { ... } }`** — a fallback for a
   user who has not made an explicit color-mode choice in GitLab, driven by the operating
   system's or browser's own dark-mode preference. The `:not(.gl-light)` guard exists so that a
   user who has explicitly chosen the *light* theme keeps it, even on a system that is set to
   dark — without that guard, the media query would override an explicit light choice.

`Md3ThemeToggle` (`md3_theme_toggle.vue`) reimplements a version of this same precedence on the
client for its own initial state: it checks `localStorage` first, falls back to whether
`document.documentElement` already carries `.gl-dark`, and falls back again to
`window.matchMedia('(prefers-color-scheme: dark)')`. It toggles the same `.gl-dark` class that
`_tokens_dark.scss` reads, so flipping it changes every MD3 token at once, along with anything
else in the GitLab codebase already keyed off `.gl-dark`.

Every color custom property, and every elevation shadow, follows this exact same pair of
selectors. Typography, shape, and motion tokens do not change between light and dark mode (motion
durations only change under `prefers-reduced-motion: reduce`, unrelated to color scheme).

## Coexistence with @gitlab/ui and Pajamas

This layer does not replace `@gitlab/ui` or the Pajamas design system, and nothing about it
disables, overrides, or reconfigures either. It is an independent, separately namespaced set of
tokens, utility classes, and Vue components that a page, panel, or feature could opt into
deliberately, class by class or component by component:

- Every SCSS class is prefixed `md3-` (for example `md3-btn`, `md3-card__body`), which cannot
  collide with `@gitlab/ui`'s or Pajamas's own class names or with any existing GitLab
  hand-written class.
- Every custom property and SCSS variable is prefixed `--gl-md3-` / `$gl-md3-`, which cannot
  collide with GitLab's existing `--gl-*` design token custom properties documented in
  [Dark mode](dark_mode.md) and [Design tokens](design_tokens.md), or with Pajamas's own tokens.
- Every Vue component name is prefixed `Md3` (for example `Md3Button`, `Md3Card`), which cannot
  collide with `@gitlab/ui`'s `Gl`-prefixed component names (`GlButton`, `GlCard`, and so on).
- Dark mode is read from the same `.gl-dark` class GitLab already uses, rather than a second,
  independent dark-mode mechanism (see [How dark mode resolves](#how-dark-mode-resolves)).

Nothing in this layer has been reviewed against Pajamas's actual component behavior, interaction
patterns, or accessibility requirements beyond what is directly visible in this layer's own
source. Before using an `Md3*` component or `.md3-*` class in place of an existing `Gl*`
component or Pajamas pattern in real product code, confirm that doing so is an intentional
design decision, not just a convenient existing implementation — this layer is a Material 3
reference layer, not an approved replacement for any existing GitLab UI component.

## Known limits

**Not wired into the build.** No SCSS partial in `app/assets/stylesheets/md3/` is imported by
`application.scss`, `_application_base.scss`, or any other compiled stylesheet entry point, and
no Vue component in `app/assets/javascripts/md3/` is imported, registered, or mounted anywhere
in the application. This layer currently ships nothing to a real page. A consumer must add the
relevant `@import` statements and Vue component imports themselves.

**No automated test coverage.** There are no Jest unit tests for any of the seven Vue components,
no SCSS-specific tests, and no visual regression, screenshot, or accessibility testing. Nothing
in this layer has been rendered in a browser or otherwise verified to work as described. Treat
every code example on this page as illustrative of the source, not as something that has been
confirmed to render correctly.

**Several Vue components do not share class names with their matching SCSS partial**, so the
component renders without the corresponding MD3 styling until one side is updated to match the
other:

| Vue component | Root/key classes it renders | Matching SCSS partial | Result |
| --- | --- | --- | --- |
| `Md3Button` | `md3-button`, `md3-button--filled`, `md3-button__icon`, `md3-button__label`, and so on | `_buttons.scss` defines `md3-btn`, `md3-btn--filled`, `md3-btn--filled-tonal`, and so on | No class in common; none of `_buttons.scss` currently styles `<Md3Button>`. Because `Md3Dialog`, `Md3TextField`, and `Md3ThemeToggle` all render an internal `<md3-button>`, this gap also affects their close button, password-reveal button, and the toggle itself. |
| `Md3Chip` | Outer wrapper `md3-chip` (matches), but the actual clickable element is an inner `<button class="md3-chip__action">` | `_chips.scss`'s interactive states (`:hover`, `:focus-visible`, the state-layer pseudo-element) are all defined on `.md3-chip` itself | The outer `.md3-chip` div gets its border, padding, and color from `_chips.scss`, but focus never lands on that div — it lands on the inner `.md3-chip__action` button, which `_chips.scss` does not style. In practice, the chip's focus ring does not appear. `Md3Chip` also adds a `md3-chip--disabled` class that `_chips.scss` does not define (the SCSS instead styles `:disabled`/`[aria-disabled='true']`, which the inner button attribute does satisfy). |
| `Md3Card` | `md3-card`, `md3-card--elevated`, `md3-card--filled`, `md3-card--outlined`, `md3-card--interactive`, `md3-card--disabled` | `_cards.scss` defines `md3-card`, `md3-card--filled`, `md3-card--outlined`, `md3-card--interactive` | Mostly aligned. `md3-card--elevated` has no rule of its own in `_cards.scss` — it happens to look correct anyway because the *base* `.md3-card` class already renders the elevated treatment. `md3-card--disabled` has no rule at all, so a disabled interactive card currently looks identical to an enabled one. |
| `Md3Dialog` | Backdrop wrapper `md3-dialog-overlay`; size modifier `md3-dialog--small` / `--medium` / `--large`; `<transition name="md3-dialog-fade">` | `_dialogs.scss` defines the backdrop as `md3-dialog-scrim` (fixed position, centering, the scrim background color); its dialog size modifiers are `--wide`, `--fullscreen`, `--scroll-body`; its transition classes are named `md3-dialog-scrim-*` and `md3-dialog-*` | The dialog panel itself (`.md3-dialog`) does get its surface, border, radius, and shadow from `_dialogs.scss`. Its backdrop does not: `.md3-dialog-overlay` has no matching rule, so there is no fixed positioning, no centering, and no scrim behind the dialog — it renders inline wherever the component is mounted in the DOM. The enter/leave transition also does not fire, because Vue generates `md3-dialog-fade-enter`-style class names from the `name` prop, and no such classes exist in `_dialogs.scss`. |
| `Md3NavDrawer` | `md3-nav-drawer`, `md3-nav-drawer__filter`, `md3-nav-drawer__section`, `md3-nav-drawer__item`, `md3-nav-drawer__link`, and so on | `_sidebar.scss` defines an entirely different class family: `md3-sidebar`, `md3-sidebar__section`, `md3-sidebar__item`, and so on | No class in common at all. `<Md3NavDrawer>` currently renders completely unstyled. |
| `Md3TextField` | `md3-text-field`, `md3-text-field__input`, `md3-text-field__label`, and so on | `_forms.scss` defines an entirely different class family: `md3-field`, `md3-field__input`, `md3-field__label`, and so on | No class in common at all. `<Md3TextField>` currently renders completely unstyled, and it does not use the `placeholder=" "` plus adjacent-sibling technique `_forms.scss` relies on for its floating label, so reusing `_forms.scss`'s existing rules directly would require restructuring `Md3TextField`'s template, not just renaming its classes. |

Reconciling these pairs — either by renaming the SCSS classes to match the Vue templates, or the
templates to match the SCSS — is the single highest-value follow-up to this layer as it stands.

**The Material Symbols icon font is not declared anywhere in this layer.** Every component that
shows an icon (buttons, chips, menus, the sidebar, the top bar, and more) applies the
`material-symbols-outlined` class and relies on a *ligature* icon font, where the element's text
content (for example the literal word `close` or `settings`) is the thing that must render as a
glyph. Nothing in `app/assets/stylesheets/md3/` or elsewhere in the repository declares an
`@font-face` for Material Symbols or a base `.material-symbols-outlined { font-family: ...; }`
rule (this is intentional — the stack notes for this layer explicitly say not to fetch the font
remotely). Until a consumer supplies that font through GitLab's normal font-loading path, every
`.material-symbols-outlined` element renders as literal text instead of an icon.

**`--md3-chip-color` and `--md3-chip-text-color` are set but unused.** `Md3Chip` computes these
two custom properties from its `color`/`textColor` props and applies them via an inline `style`
binding, but `_chips.scss` does not read either one anywhere, so setting `color` or `textColor`
on `<Md3Chip>` currently has no visible effect.

**`color-mix()` is used for every disabled-state treatment.** Buttons, icon buttons, chips, the
FAB, form fields, and menu items all compute their disabled colors with CSS `color-mix()` against
`transparent`. This is supported in all current evergreen browsers, but there is no fallback for
a browser that lacks it — such a browser would show a disabled element with no dimming applied
rather than a broken layout, since the property simply fails to parse and the previous
(non-disabled-looking) color remains.

**No RTL-specific handling.** Directional properties throughout (padding, positioning like the
side sheet's `right: 12px`, and so on) are written as physical (left/right) rather than logical
(start/end) properties, so right-to-left layout has not been considered.
