# Design parity capture status

The inventory defines internal reference inputs and production Rails targets. Reference
renders are comparison inputs only. Production evidence must come from the real built
Rails surface through isolated Edge on Windows, with no mock page, DOM injection, demo
capture, or promoted reference render.

The inventory remains intentionally pending. Its deterministic reference tuple does not
prove production determinism: the committed isolated Rails seed has not been executed, and authentication, time
freeze, or production fixture behavior has not been verified for capture yet.

For a missing PNG plan, `capture.mjs --kind=built` reports the row's reviewed
`productionRoute`; `--kind=reference` reports its internal reference route. The plan
does not certify the production route is reachable or authorized.

Embedded command-palette and regex states use the normal reachable controls within
their owning screen. Their action metadata is the existing screen state plus the
normal command-palette or regex-builder invocation, not a synthetic standalone
production route.

Every route now records `productionRouteEvidence: "source-registration-only"`.
This establishes the intended Rails entry point, not successful runtime navigation.
Code uses its branches page and Repository uses its tree page as representative
initial states. Replace route parameters with the isolated fixture manifest values;
never navigate the literal parameter placeholders. Shell A, Shell B, Sidebar,
Command Palette, and Regex Builder all start at `/dashboard/projects`. Their
`productionActions` select the documented persisted header preference and, where
needed, invoke the visible control by its accessible name. No synthetic standalone
shell or overlay route qualifies as product evidence.

## Capture driver and layout probe

`tools/design-reference/scripts/drive-capture.mjs` drives either side of a capture
(the internal Electron reference renderer, or the real built Rails application) through
the Chrome DevTools Protocol, so the reference and built captures for a row go through
the identical mechanism and land at the identical pixel tuple. It never launches a
browser itself — the caller launches the target on the approved cheap Lowlevel headless
route with remote debugging enabled and hands the driver the CDP endpoint — and it
requires that endpoint to expose exactly one `page` target before it will touch the page
at all. For the built side it substitutes every `:token` in a row's `productionRoute`
from a small fixture manifest, applies the row's `productionActions` (a persisted
preference write plus a click by computed accessible name), and can drive the Devise
sign-in form first, typing a password supplied out of band through
`Input.insertText` rather than ever interpolating it into an evaluated expression.

`tools/design-reference/scripts/layout-probe.mjs` connects to that same still-open page
(it never navigates, so it never discards whatever state the driver or a
`productionActions` click put the page into) and looks for clipping candidates: an
element whose content overflows its own scroll box, a host box that exceeds its
parent's box, and a text run whose own laid-out range exceeds the box meant to contain
it, across every registered `md-*` Material host and every element inside the shell
(navigation, header, toolbar, and search/regex-builder containers). See
`tools/design-reference/README.md` for the full option reference, and
`design/layout-matrix.json` for the 70-row (10 surfaces times 7 theme/scale/viewport
tuples) inventory this pair of scripts populates. `parity-guard.mjs --strict` validates
that matrix in the same way it validates the 25-row parity inventory: structurally
complete, hash-bound whenever a row claims verified evidence, and — specific to the
layout matrix — every layout-probe finding a verified row actually recorded must be
named by a reviewed `intentionalFindings` entry or the row is red.
