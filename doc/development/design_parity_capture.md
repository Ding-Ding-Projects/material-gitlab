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
