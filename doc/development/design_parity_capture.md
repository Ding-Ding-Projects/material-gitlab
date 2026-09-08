# Design parity capture status

The inventory defines internal reference inputs and production Rails targets. Reference
renders are comparison inputs only. Production evidence must come from the real built
Rails surface through isolated Edge on Windows, with no mock page, DOM injection, demo
capture, or promoted reference render.

The inventory remains intentionally pending. Its deterministic reference tuple does not
prove production determinism: no committed Rails seed, authentication bootstrap, time
freeze, or production fixture has been verified for capture yet.

For a missing PNG plan, `capture.mjs --kind=built` reports the row's reviewed
`productionRoute`; `--kind=reference` reports its internal reference route. The plan
does not certify the production route is reachable or authorized.

Embedded command-palette and regex states use the normal reachable controls within
their owning screen. Their action metadata is the existing screen state plus the
normal command-palette or regex-builder invocation, not a synthetic standalone
production route.
