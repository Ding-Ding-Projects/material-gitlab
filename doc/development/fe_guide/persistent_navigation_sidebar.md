---
stage: none
group: unassigned
info: Any user with at least the Maintainer role can merge updates to this content. For details, see <https://docs.gitlab.com/development/development_processes/#development-guidelines-review>.
title: Persistent navigation sidebar
---

The persistent navigation sidebar replaces the presentation layer of the existing super sidebar.
The shared implementation under `app/assets/javascripts/super_sidebar` remains the authority for
the sidebar mount, component tree, and client-side state.
Ruby sidebar panels remain the authority for visible destinations, access checks, route order, and
item metadata.

A design reference can define dimensions, spacing, section treatment, search placement, and active
item styling.
Sample project names, labels, and `.dc.html` destinations from a design reference must not enter the
application.

## Preserve the mount and payload contracts

`app/views/layouts/_page.html.haml` mounts the sidebar on `.js-super-sidebar` and serializes the
server-provided sidebar payload into the element dataset.
`app/assets/javascripts/super_sidebar/super_sidebar_bundle.js` parses that dataset and passes
`sidebarData` to the shared Vue root.

The replacement must preserve these payload members and their current meanings:

- `current_menu_items`: Ordered menu sections and navigation items from the active Ruby panel
- `current_context_header`: The current project, group, or other navigation context label
- `current_context`: The namespace and resource metadata for the active project or group
- `pinned_items`: The user-specific navigation item identifiers that the sidebar can pin
- `panel_type`: The project, group, organization, or other panel scope
- `shortcut_links`: Hidden keyboard shortcut destinations registered by the client
- `search`: The search context consumed by the existing search surface
- User, status, count, trial, feature, and help data consumed by current sidebar components

The replacement must render `current_menu_items` in the order produced by
`Sidebars::Panel#super_sidebar_menu_items`.
It must preserve each item's existing identifier, title, route, active state, icon, badge, count,
avatar, CSS classes, and `data-method` behavior.
A local navigation filter can reduce the visible item set, but it must not rewrite the payload,
change item order, construct routes, or bypass an access decision from the Ruby panel.

The Ruby extension path also remains unchanged.
Community Edition (CE) panels define the base menu and payload, and Enterprise Edition (EE)
prepending modules add licensed entries and payload fields through the existing helper and panel
extension points.

## Preserve edition alias compatibility

The required sidebar remains in the shared CE path under
`app/assets/javascripts/super_sidebar`.
Do not move the base renderer to an EE-only directory.

Keep existing edition-specific additions attached through the configured alias seams:

- `ee_else_ce` resolves to the CE implementation in a CE build and the EE implementation in an EE
  build when both editions provide the same module contract.
- `ee_component` remains suitable only for optional EE components that have the existing CE empty
  component fallback.
- `jh_else_ee` continues to resolve edition-specific sidebar additions, including the existing
  trial widget integration.

The replacement must not introduce a new alias or direct import from an EE source path.
Both CE and EE must receive the same required navigation shell and payload contract.

## Persist collapsed state and adapt to the viewport

`super_sidebar_collapsed_state_manager.js` and the shared `sidebarState` observable remain the
authorities for responsive state.

On desktop viewports at the `xl` breakpoint or wider:

- The sidebar remains present beside page content.
- A user can switch between the full sidebar and the icon-only state.
- The `super_sidebar_collapsed` cookie stores the icon-only preference for future visits.

On viewports below the `xl` breakpoint:

- The sidebar starts collapsed and opens over page content.
- The overlay, toggle action, or <kbd>Escape</kbd> closes the sidebar.
- A resize recalculates the responsive state and blocks layout transitions during the resize.

The replacement must not create another cookie, storage key, or independent collapsed-state model.
The existing preference and observable state must produce one consistent result across the shell,
toggle, overlay, and menu.

## Preserve accessibility semantics

The sidebar must remain a `nav` landmark labelled by the visually hidden **Primary navigation**
heading.
When the responsive sidebar is closed, the `inert` state must keep hidden links out of keyboard and
assistive technology navigation.

The replacement must preserve these behaviors:

- Active links expose `aria-current` through the existing navigation item contract.
- Section controls expose `aria-expanded` and `aria-controls` for their matching item lists.
- Every link and section control keeps an accessible name from its server-provided title.
- Icon-only items retain accessible names and visible labels through the existing tooltip behavior.
- Keyboard users can open the sidebar, move through links, close an overlapping sidebar with
  <kbd>Escape</kbd>, and return focus to the control that opened it.
- The focus trap applies only while the sidebar overlaps page content.
- Touch users can open and close section flyouts without hover.

Visual clipping must not hide the active item, section labels, project or group context, counts, or
focus indicators at supported viewport sizes and display scales.

## Failure boundaries

The sidebar initializer returns without a mount when `.js-super-sidebar` is absent.
The server selects a fallback panel when the requested panel has no renderable menu.
The replacement must preserve both boundaries.

A missing, malformed, or unsupported payload must not activate sample navigation, guess routes, or
display destinations that the server did not authorize.
A section with no visible items must not leave an empty interactive control.
An optional edition component failure must not remove the shared CE navigation shell.
Failures in search, counts, badges, avatars, trial content, or optional help content must not change
the destination or method of a navigation item.

## Security considerations

Treat the serialized sidebar payload as display and route data from the server, not as permission
to create additional destinations in the client.
Keep authorization and feature availability in the Ruby panel layer.
Do not infer access from a menu label, icon, active state, or design reference.

Vue text interpolation must continue to render titles and context labels as text.
Do not insert payload values as untrusted HTML.
Preserve existing route and `data-method` bindings so a visual replacement cannot turn a protected
action into a different request.

The collapsed-state cookie stores only a Boolean display preference.
Do not persist the full sidebar payload, status data, resource identifiers, avatar URLs, or route
metadata in a new client-side store.
Do not write the payload to logs, error messages, analytics fields, or diagnostics.

## Verification status

This ultra-speed implementation lane did not run tests, lint checks, reviews, builds, or screen
captures.
The document records the implementation contract only and does not provide runtime or release
evidence.

## Change record

The persistent navigation presentation now uses a dedicated Material Design shell with a branded
header, project or group context card, an operative global-search launcher, pill-shaped section
controls, and direct semantic navigation links. The change retains the existing Ruby menu payload,
edition aliases, pin management, counts, flyouts, keyboard behavior, responsive collapse state, and
hidden shortcut links.
