# Material Web control geometry: sizing hosts without clipping them

This document records the rule that keeps registered Material Web
(`@material/web`) custom elements from clipping or overflowing the space a
surface's own stylesheet gives them, why the rule exists, the exact token
values each surface uses, and the guard test that enforces it. It is a
companion to [`material_web_components.md`](material_web_components.md), which
covers the Vue 2 adapter contract; this document covers CSS only.

## The rule

**Size a registered Material Web host exclusively through that element's own
official CSS custom properties. Never through plain `width`, `height`,
`padding`, `font-size`, `font-family`, or `white-space` declared on the host
selector.**

This applies to every element listed in
`app/assets/javascripts/material_system/components/register.js`:
`md-icon-button`, `md-text-button`, `md-filled-text-field`, `md-filled-button`,
`md-outlined-button`, `md-filled-tonal-button`, `md-elevated-button`,
`md-checkbox`, `md-radio`, and `md-switch`.

## Why: the plain property is inert, not merely overridden

Every one of those elements renders its real geometry inside shadow DOM, and
each one carries a `:host { ... }` rule that recomputes the host's own
`height`/`min-height`, `width`, `padding-block`/`padding-inline`,
`font-family`, `font-size`, and `line-height` **from that component's own CSS
custom properties**, not from whatever the surrounding page declares on the
same element. This is not a theory about the cascade; it is what the
installed package's compiled CSS actually contains, for example (from
`node_modules/@material/web/button/internal/shared-styles.css`, wrapped here
for readability):

```css
:host {
  min-height: var(--_container-height);
  padding-inline-start: var(--_leading-space);
  padding-inline-end: var(--_trailing-space);
  font-family: var(--_label-text-font);
  font-size: var(--_label-text-size);
}
```

and from `node_modules/@material/web/iconbutton/internal/standard-styles.css`:

```css
:host {
  --_state-layer-height: var(--md-icon-button-state-layer-height, 40px);
  --_state-layer-width: var(--md-icon-button-state-layer-width, 40px);
  height: var(--_state-layer-height);
  width: var(--_state-layer-width);
}
```

`--_container-height`, `--_leading-space`, `--_label-text-size`, and so on are
themselves defined, in the same `:host` rule, as `var(--md-text-button-*, 40px)`
— falling back to the library's own default when nothing has set the public
token. A page-level rule such as `.mr-icon-btn { width: 32px; height: 32px }`
targets the same host element the snippet above targets, and the
token-driven declaration is what actually wins: with no
`--md-icon-button-state-layer-*` token set, the host renders at the
**library's unmodified default** regardless of what plain `width`/`height`
the author wrote. The 32px the author asked for never reaches the screen; the
button renders 40px and either overflows the 32px slot the surrounding layout
reserved for it, or gets clipped by an ancestor sized to that same wrong
assumption. The same mechanism re-specifies `font-family`/`font-size` for
buttons and fields, so an author-level `font-size: 12px` or
`font-family: monospace` on the host is equally inert for the rendered label
or input text.

Only the **official custom properties** feed the internal calculation that
sizes the container, the label, the icon, the ripple, the focus ring, and the
touch target together, coherently. That is the whole reason this rule exists:
it is not a style preference, it is the only mechanism that actually reaches
the rendered control.

## The shared geometry layer

`app/assets/stylesheets/md3/_material_web_geometry.scss` is the one place
these token sets are named. It provides three SCSS mixins
(`mw-button-size`, `mw-icon-button-size`, `mw-field-size`) plus six ready-made
classes built from them (`.mw-btn--default`, `.mw-btn--compact`,
`.mw-icon-btn--default`, `.mw-icon-btn--compact`, `.mw-field--default`,
`.mw-field--compact`) for the common case of applying a size directly to a
new element. Existing surface selectors mostly use the mixins directly
(`@include mw-button-size(...)`) inside their own rule, since that avoids
touching the many `.vue` templates that already carry the class names this
change needed to keep.

### Sizes and their source

| Control family | Size | Values | Cited against |
| --- | --- | --- | --- |
| Buttons (`md-text-button`, `md-filled-button`, `md-outlined-button`, `md-filled-tonal-button`, `md-elevated-button`) | default | container-height 40px, leading/trailing-space 12px | The library's own shipped default (`button/internal/text-styles.css`'s `var(--md-text-button-container-height, 40px)`). |
| | compact | container-height 28px, leading/trailing-space 10px, label-text-size 12px / line-height 16px | `design/Merge Requests.dc.html` and `design/Issues.dc.html`'s regex-mode toggle: `padding:5px 10px;border-radius:999px;font-size:12px;font-weight:700`. |
| Icon buttons (`md-icon-button`) | default | state-layer 40px, icon-size 24px | The library's own shipped default; also `design/Issues.dc.html`'s command-palette and theme-toggle icon buttons, `width:40px;height:40px`. |
| | compact | state-layer 32px, icon-size 18px | `design/Issues.dc.html` and `design/Merge Requests.dc.html`'s in-field regex-builder trigger, `width:32px;height:32px` with an 18px icon. |
| Filled text fields (`md-filled-text-field`) | default | top/bottom-space 16px, with-label top/bottom-space 8px | The library's own shipped default (~56px tall with body-large's 24px line-height). |
| | compact | top/bottom-space 4px, with-label top/bottom-space 4px | Sized so the field's own box stays close to its 24px line-height (~32px total), letting the surrounding pill (`design/Sidebar.dc.html`'s `padding:6px 8px 6px 12px` search pill; `design/Issues.dc.html` / `design/Merge Requests.dc.html`'s `padding:8px 8px 8px 18px` search pill) supply the rest of the visible height. |

A few call sites need a size the two named presets don't cover exactly (the
regex-mode toggle chip, an icon rendered inside a text button rather than an
icon button, a full-width row-opening button with no minimum height at all).
Those call the mixins directly with their own numbers rather than the named
classes, and each one is commented at its call site with the design contract
line it matches.

### Icon-only text buttons

`.mr-icon-btn` / `.mr-icon-btn--lg` (`MergeRequests/mergerequests.scss`) and
similar classes render on `<material-button variant="text">` with only an
icon in the component's default slot (see `MrTopBar.vue`,
`MrDetailHeader.vue`) — an `md-text-button` used to look like an icon button,
because the Vue adapter does not expose an icon-only rendering path onto
`md-icon-button` for these call sites. They are sized with `mw-button-size`
using small, symmetric leading/trailing space (6px for the 32px size, 8px for
the 40px size) to approximate a square button, matching the exact pixel sizes
`design/Merge Requests.dc.html` and `design/Issues.dc.html` draw for these
controls (`width:32px;height:32px` and `width:40px;height:40px`). This
document does not claim to have also corrected the *icon glyph's own*
rendered size inside those buttons — the icon is projected into the
component's plain label slot rather than its `slot="icon"`, so it inherits
its size from the label text rather than from `--md-text-button-icon-size`.
That is a separate, pre-existing typography concern, not a geometry/clipping
one, and is out of this document's scope.

## Where the layer is imported, and why it has to be in two places

1. **`app/assets/stylesheets/md3/index.scss`** imports the partial. That index
   is imported by `app/assets/stylesheets/color_modes/_md3.scss`, which is in
   turn imported by **both**
   `app/assets/stylesheets/application.scss` and
   `app/assets/stylesheets/application_dark.scss` — the two Sprockets entry
   points GitLab compiles separately for light and dark. GitLab's dark mode
   does not toggle a class on top of one shared stylesheet; it requests a
   **wholly separate compiled entry** (`application_dark.scss`, gated by
   `media: "(prefers-color-scheme: dark)"` or an explicit dark-mode choice —
   see `app/views/layouts/_head.html.haml`). A layer imported into only one of
   the two entries is entirely absent for whichever mode requested the other
   one, which is exactly the failure this project's own instructions warn
   about for GitLab's colour-mode stylesheets in general. Importing the
   geometry layer at `md3/index.scss`, which both entries already reach
   through `color_modes/_md3.scss`, means one import serves both.
2. **Every `material_system/surfaces/**/*.scss` file that hosts a registered
   Material Web element** imports the same partial directly
   (`@import 'md3/material_web_geometry';`). Those surface stylesheets are
   compiled independently by
   `config/webpack/loaders/material_scss_loader.js` through
   `sass.compileString`, whose `loadPaths` include
   `app/assets/stylesheets` — so `md3/material_web_geometry` resolves there
   exactly as `md3/index` would, with no extra webpack configuration needed.
   A surface stylesheet that has no registered Material Web element in it at
   all (`operations.scss`, which renders everything through plain
   `<button>`/`<input>`) has no need for the import and does not carry it.

## Overlays stay bounded by the viewport, not by whichever box contains them

A `position: fixed` overlay (a scrim, a command palette, a regex builder) is
normally clipped to the viewport, but only if none of its DOM ancestors have
an `overflow` value other than `visible` — an `overflow: hidden` ancestor
clips **all** of its descendants' paint, including `position: fixed` ones,
whenever that ancestor sits between the overlay and the page in the DOM (this
is a real, commonly-mis-assumed CSS behaviour: `position: fixed` escapes an
ancestor's normal layout flow, but not its overflow clipping). Three
surface-level containers carried an `overflow: hidden` that served no purpose
other than routing scroll to their own inner content region (which already
has its own `overflow-y: auto`/`overflow: auto`), while incidentally putting
every overlay rendered inside them at risk of being clipped to that
container's box instead of the viewport:

- `app/assets/javascripts/material_system/surfaces/shared-shell.scss`'s
  `.material-analyze` (its own `.material-analyze__content` already scrolls).
- `app/assets/javascripts/material_system/surfaces/Plan/plan.scss`'s
  `.gl-mds-plan` (its own `.gl-mds-plan__content` already scrolls).
- `app/assets/javascripts/material_system/surfaces/operations.scss`'s
  `.material-live-surface__card` (a rounded-corner list card, not itself
  scrollable, but the closest ancestor of the `.material-live-surface__palette`
  overlay in some layouts).

All three had their `overflow: hidden` removed rather than converting an
overlay class to the documented `--fixed` modifier
(`doc/development/fe_guide/md3.md`'s `.md3-menu`/`.md3-popover` pattern),
because in every one of these three cases the overlay in question already
renders `position: fixed` and removing the ancestor's clip is sufficient and
strictly additive — nothing in these three containers relied on clipping
non-scrolling content for a cosmetic reason. `.mr-list`, `.mr-diff-pane`,
`.mgl-pl-list-card`, and the several ellipsis-truncation `overflow: hidden`
declarations elsewhere in these surfaces were left untouched: they clip a
rounded card's own background to its border-radius, or truncate a single line
of text with `text-overflow: ellipsis`, and host no overlay.

## `white-space: nowrap` in the plain `.md3-*` class layer

`app/assets/stylesheets/md3/components/_buttons.scss`,
`_forms.scss`, `_topbar.scss`, `_chips.scss`, `_navigation.scss`, and
`_sidebar.scss` style **plain native elements**
(`<button class="md3-btn">`, as documented in
[`fe_guide/md3.md`](fe_guide/md3.md)), not Material Web custom elements, so
none of the shadow-DOM mechanism above applies to them — a `height`/`padding`
declared there is not inert, it is the entire visible geometry. Two
independent fixes were still needed, for the ordinary reason that a fixed
pixel height or an unqualified `nowrap` clips a label that needs more room
than the author assumed (a longer localized string, a higher text-scale
setting, a font whose descenders need more vertical room than the nominal
line-height reserves):

- Every fixed `height`/`width` on a control that can contain user-facing text
  became `min-height`/`min-width`: `.md3-btn`, `.md3-icon-button`,
  `.md3-fab`, `.md3-fab--small`, `.md3-topbar__search-builder-btn`,
  `.md3-topbar__avatar`, `.md3-chip`, `.md3-chip__remove`,
  `.md3-nav-rail__indicator`, `.md3-sidebar__brand-mark`,
  `.md3-sidebar__context-icon`. This is a pure floor-not-ceiling change: it
  changes nothing when content already fits, and only ever prevents the
  content from being forced smaller than it needs.
- `white-space: nowrap` was removed only where it was not already paired with
  `overflow: hidden; text-overflow: ellipsis` (`.md3-btn`,
  `.md3-topbar__search-error`) — that pairing is itself one of the two
  acceptable outcomes this rule allows (wrap, or a stated ellipsis with the
  full text kept available as the element's accessible name or a `title`
  attribute), so removing it from `.md3-sidebar__brand-text`,
  `.md3-sidebar__context-title`, `.md3-sidebar__context-subtitle`,
  `.md3-sidebar__item-label`, and `.md3-breadcrumbs__current` would have
  replaced one correct pattern with another rather than fixing a defect.
  Two further occurrences (`.md3-chip`, `.md3-tabs__tab`, `.md3-segmented__option`)
  were deliberately left alone and commented in place: chip and segmented-option
  labels size their own element (`display: inline-flex`, no width constraint),
  so `nowrap` there cannot clip anything — the label just widens the pill; and
  `.md3-tabs` scrolls horizontally by design (`overflow-x: auto`), so removing
  `nowrap` there would make one long tab wrap to two lines next to
  single-line siblings instead of the row scrolling, which is a worse result,
  not a fix.

`.md3-field__input`'s padding was rebalanced against its own line-height and
expressed relative to its font-size (`em`) rather than as fixed pixels, and
its `height: 56px` became `min-height: 4em` (56px at the 14px `body-large`
font-size this input uses), so the reserved space above/below the text scales
with the text itself instead of staying a fixed number of pixels while a
descender-heavy glyph or a higher scale grows the text into it. The two
focus-state paddings that compensate for a growing border
(`.md3-field--filled .md3-field__input:focus`,
`.md3-field--outlined .md3-field__input:focus`) keep that same relative base
via `calc(<em value> - 1px)`, preserving the existing anti-jitter behaviour
(the border grows by 1px on focus; the padding shrinks by the same 1px so the
outer edge does not shift) without reverting to an absolute pixel value.

## The guard

`spec/frontend/material_system/material_web_geometry_spec.js` reads every
affected `.scss` file as plain text (never the compiled CSS) and fails when:

1. A selector in a hand-written per-file list — the same sites named above,
   plus every registered element's bare tag name where an "official controls
   inherit the current surface theme" block sizes every control in a surface
   at once — declares `width`, `height`, `padding`, `font-size`,
   `font-family`, or `white-space` directly on itself. Matching is by exact
   string equality against the fully `&`-resolved selector for one specific
   rule block (found by walking braces with a depth counter, never a lazy
   span across rules), so a modifier class such as `.mr-icon-btn--lg` can
   never be mistaken for `.mr-icon-btn`, and a declaration inside a nested
   block is never attributed to its parent.
2. `.material-analyze`, `.gl-mds-plan`, or `.material-live-surface__card`
   declares `overflow: hidden` (an `overflow-y`/`overflow-x` or a non-`hidden`
   value does not trip this check).
3. The geometry partial is missing from the import chain reaching either
   `application.scss` or `application_dark.scss`, or from any surface
   stylesheet in the hand-written list above.

The hand-written selector lists were derived from each surface's
`control-inventory.json`, the shell inventory in `components/inventory.js`
(`SHELL_MATERIAL_CONTROLS`), and a direct read of every
`<material-*>`/`<Material*>` usage's class list across every surface's `.vue`
templates — not from scanning the stylesheets themselves, since a check that
only validates selectors it already found in the file could never notice one
that had been quietly removed.

A selector styled only inside a Vue single-file component's own
`<style scoped>` block (for example, several of the Issues and Plan surfaces'
per-component button classes) is outside this stylesheet's reach and is not
listed; the surface-wide "official controls inherit" block for that surface
still sets that surface's baseline geometry, which those per-component blocks
cannot override for the properties this document is about (they are as inert
there as anywhere else on a Material Web host).

The guard's own rule-boundary parser is proven against synthetic SCSS
snippets before it is trusted against the real files (a banned property on
the exact matched selector; the same property name as a substring of a
different, longer property; a nested modifier's declaration correctly kept
out of its parent's own text; two selectors that share a prefix correctly
kept distinct). It was also proven against a real regression: temporarily
restoring `width: 32px; height: 32px;` to `.mr-icon-btn` turned the guard red
with exactly that pair of offending properties named, and removing the
restored lines again turned it green.
