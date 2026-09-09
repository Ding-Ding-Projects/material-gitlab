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

## Running the whole set

`scripts/design-parity/run-parity-captures.mjs` wraps the driver and the probe so one
command per side covers all 25 inventory rows or all 70 layout-matrix tuples. It launches
nothing: start the reference viewer with `--cdp-port`, or the isolated browser with
`--remote-debugging-port` and `--app` pointed at the instance, on the approved hidden
desktop first, then pass `--cdp`. On the built side it signs in once, on the first row,
because the sign-in page redirects an already signed-in user away from its form; the
browser profile cookie carries the remaining rows. `--derive` runs side-by-side and diff
for every row whose two raw captures and receipts exist and skips the rest rather than
inventing anything. `--write-reference-manifest` records the reference viewer entry file
as the reference-side artifact. Every row is attempted, the outcome table is printed, and
an ignored ledger is written under `artifacts/parity/_local/`.

## Recording evidence into the inventories

`scripts/design-parity/record-evidence.mjs` copies what is really on disk into
`design/parity-inventory.json` (`--inventory`) and `design/layout-matrix.json`
(`--matrix`). An inventory entry becomes verified only when its file exists and its
receipt is verified, names the same row and kind, and is bound to the same `--commit`;
a receipt bound to another commit is reported as stale and left pending. A matrix entry
becomes verified when its file exists, and every layout-probe finding without a recorded
deviation is listed as open. Material audits (`--audit=<json>`) and intentional
deviations (`--deviations=<json>`) are judgements supplied by a reviewer and are copied,
never derived. `--dry-run` prints the outcome table and writes nothing. The strict guard
remains the authority afterwards.

## Built-side session against the packaged instance

The order that produced evidence on a WSL2 instance of the packaged fork, kept here so a
later run does not rediscover it:

1. Keep the distro alive for the whole session (`wsl -d <distro> -- sleep infinity` in the
   background), then confirm `curl -fsS http://localhost:8929/-/health` answers.
2. Seed and prepare, both through the instance's own runner:
   `gitlab-rails runner scripts/design-parity/seed.rb` and
   `gitlab-rails runner scripts/design-parity/prepare-capture-user.rb`, with
   `DESIGN_PARITY_FIXTURE_INSTANCE=lan-omnibus` and `DESIGN_PARITY_FIXTURE_HOST=<host>`.
   The seed prints the fixture identifiers; the route fixture JSON for the driver is
   `{"namespace": "design-parity-fixture", "project": "product-verification", "id": "design-parity-fixture", "ref": "main"}`.
3. Fetch the exact package the instance runs and mint the built-artifact manifest:
   `node scripts/design-parity/fetch-built-artifact.mjs --tag <release tag> --commit <sha>`.
4. Launch the isolated browser on the approved hidden desktop with a fresh profile,
   `--app=http://localhost:8929`, `--remote-debugging-port=<port>`, and the isolation flags
   named in `tools/design-reference/README.md`; require exactly one page target.
5. Run every inventory row once, signing in on the first:
   `node scripts/design-parity/run-parity-captures.mjs --kind=built --cdp=http://127.0.0.1:<port> --commit=<sha> --base-url=http://localhost:8929 --fixture=<fixture.json> --sign-in-user=root --password-file=<distro-only file> --probe --mint-receipt --artifact-manifest=artifacts/parity/built-artifact-manifest.json --artifact=<package path from the manifest>`.
6. Run the layout matrix the same way with `--matrix` (no receipts; the matrix binds by hash).
7. Capture the reference side at the same commit through the viewer with `--cdp-port`, then
   `--derive` for side-by-side and diff, `review-diff.mjs` per row with the honest verdict,
   `record-evidence.mjs --inventory` and `--matrix`, and finally
   `node tools/design-reference/scripts/parity-guard.mjs --strict`, whose real result is
   reported as it is.
