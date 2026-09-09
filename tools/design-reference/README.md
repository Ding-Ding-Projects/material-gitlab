# Design reference application

This package is the dedicated Electron reference application for the checked-in
`design/*.dc.html` contracts. It serves the original files through stable
`/design-reference/<surface>` routes; it does not copy their templates into a second
implementation. The local React UMD files are supplied by the package dependencies so
the reference renderer has no runtime CDN requirement.

## Run a reference route

```powershell
npm install
npm start -- --surface=issues --state=default --theme=light --width=1280 --height=800 --scale=1
```

The application accepts the 25 stable surface slugs listed in
`design/parity-inventory.json`. It freezes time and random values, disables motion, and
blocks requests to non-loopback origins. The route query parameters are part of the
deterministic capture tuple; do not reuse a capture from another tuple.

Add `--cdp-port=<port>` to also open a Chrome DevTools Protocol endpoint
(`--remote-debugging-port`) on that port, so `scripts/drive-capture.mjs` (below) can
attach to the already-loaded page instead of driving a separate browser:

```powershell
npm start -- --surface=issues --state=default --theme=light --width=1280 --height=800 --scale=1 --cdp-port=9333
```

## Driving a capture over CDP

`scripts/drive-capture.mjs` drives EITHER side of a parity comparison — this reference
application, or the real built Rails application — through the Chrome DevTools Protocol,
so both captures go through the identical mechanism and land at the identical pixel
tuple. It never launches a browser itself: launch the target process on the approved
cheap Lowlevel headless route (a named hidden desktop) with remote debugging enabled,
then hand this script the CDP HTTP endpoint it printed.

Before touching the page it requires the CDP endpoint to expose **exactly one** target
of type `page`. Finding one acceptable target among several proves nothing about
isolation — an extra target is exactly what a restored tab, a synced extension, or a
second launched instance looks like — so anything but a singleton is refused outright.
It never calls `Runtime.evaluate` with `awaitPromise: true`: on this project's
development machine that hangs indefinitely for trivial expressions on some
Node/Electron/Chromium combinations, so every asynchronous page condition is instead
observed by polling a synchronous expression on a bounded interval and timeout.

Reference side:

```powershell
node scripts/drive-capture.mjs --cdp=http://127.0.0.1:9333 --id=surface.issues --kind=reference --commit=<40-hex sha> --out-dir=artifacts/parity/surface.issues
```

Built side (once a real GitLab instance exists to point it at):

```powershell
node scripts/drive-capture.mjs --cdp=http://127.0.0.1:9333 --id=surface.issues --kind=built --commit=<40-hex sha> --out-dir=artifacts/parity/surface.issues --base-url=http://127.0.0.1:3000 --fixture=fixture.json --sign-in-user=root --password-command="pass show gitlab/root"
```

`--fixture` points at a small JSON object supplying every `:token` route parameter the
row's `productionRoute` needs (`{"namespace": "acme", "project": "widgets"}` for
`/:namespace/:project/-/issues`, plus `id` for the Epics group route and `ref` for the
Repository tree route). A route with no `:token` (the shared shell, sidebar, command
palette, regex builder, and dashboard/todos routes) needs no fixture. `--sign-in-user`
together with **either** `--password-file=<path>` **or**
`--password-command="<shell command whose stdout is the password>"` drives the Devise
sign-in form first; the password is read into memory and typed through
`Input.insertText` into the already-focused field — it is never interpolated into a
`Runtime.evaluate` expression, never printed, and never written to any file this script
produces. For a `productionActions` row (the shared shell, sidebar, command palette, and
regex builder), the driver writes the requested preference into the same
`material-system.settings.v1` `localStorage` key the product's own settings screen uses
and dispatches the same `material-system:settings-changed` event, then clicks the first
control whose computed accessible name matches exactly, before waiting for the row's
`productionMount` selector to appear.

Optional `--theme`, `--scale`, `--width`, and `--height` override the inventory row's
own tuple for one run (state and locale stay at the row's value). This is what lets
`design/layout-matrix.json`'s wider theme/scale/viewport grid for a surface be captured
through this same driver, one run per matrix row, without a second parity-inventory row
per tuple:

```powershell
node scripts/drive-capture.mjs --cdp=http://127.0.0.1:9333 --id=surface.issues --kind=reference --commit=<sha> --out-dir=artifacts/layout/issues/1280x800@1.5.dark --theme=dark --scale=1.5
```

Every run writes `<out-dir>/<kind>.png`, `<out-dir>/<kind>.session.json` (the exact
launched target plus the CDP endpoint label, with no credentials), and — for
`--kind=reference` — `<out-dir>/<kind>.font-proof.json`. It then prints the exact
`capture.mjs` command that would mint the row's evidence receipt from those outputs.
Pass `--mint-receipt` together with `--artifact-manifest=<repo-relative path>` and
`--artifact=<repo-relative path>` to run that `capture.mjs` invocation immediately
(this only works when `--out-dir` is inside the repository, since `capture.mjs`
refuses any path that is not).

## Layout probe

`scripts/layout-probe.mjs` connects to the same already-loaded page (the same CDP
session `drive-capture.mjs` just used, or a fresh connection to the same still-open
target) and looks for clipping candidates. It never navigates — doing so
would discard whatever state the page was driven into, such as an opened
command-palette overlay from a built-side `productionActions` click.

```powershell
node scripts/layout-probe.mjs --cdp=http://127.0.0.1:9333 --id=surface.issues --kind=reference --commit=<40-hex sha> --out-dir=artifacts/parity/surface.issues
```

It scans every registered Material host (any custom element whose tag name starts with
`md-`, per `app/assets/javascripts/material_system/components/register.js`) and every
element inside "the shell" — `nav`, `header`, `[role="toolbar"]`, and this probe's
heuristic for search field containers: `input[type="search"]`, `[role="search"]`, and
anything whose class list contains `search` or `regex` (case-insensitive). Widen
`SHELL_SELECTOR` in the script if a surface names its search container something else;
it is a heuristic, not a registry.

For each scanned element it checks four things: `scrollWidth > clientWidth`,
`scrollHeight > clientHeight`, the element's own box exceeding its parent's box, and any
text node whose own laid-out `Range` rect exceeds the box that is supposed to contain
it. Every `md-*` host additionally gets its resolved `getComputedStyle` width, height,
and padding recorded on any finding it produces — this **is** "which CSS rule wins":
`getComputedStyle` reports the outcome the cascade already resolved, expressed as a
value rather than a selector name. A finding is a clipping *candidate*, not a proven
defect (a control that intentionally scrolls its own content will legitimately trip the
scroll-overflow check); reviewing a finding against the surface's actual design intent
is a human or a later lane's job. Zero findings is a real, reportable result.

It writes `<out-dir>/layout-probe.json`:

```json
{
  "schemaVersion": 1,
  "id": "surface.issues",
  "kind": "reference",
  "sourceCommit": "<sha>",
  "tuple": { "...": "the row's tuple" },
  "findings": [{ "selector": "...", "kind": "horizontal-scroll-overflow", "rect": {}, "parentRect": null, "computed": null }],
  "summary": { "findings": 0 }
}
```

## Evidence workflow

The capture and evidence scripts are deliberately fail-closed. Running `capture.mjs`
without a real PNG prints a capture plan and exits with a pending-capture status; it
never creates a placeholder image. Use the approved cheap Lowlevel headless route to
capture the built application and the reference application, then validate each raw
PNG with `capture.mjs`. Generate a labelled SVG comparison and machine-readable diff
only from those retained raw inputs.

```powershell
node scripts/parity-guard.mjs
node scripts/parity-guard.mjs --negative
node scripts/parity-guard.mjs --strict
node scripts/capture.mjs --id=surface.issues --kind=reference --png=artifacts/parity/surface.issues/reference.png --commit=<sha> --artifact-manifest=<reference-manifest.json> --artifact=<reference-artifact> --session-provenance=<reference-session.json> --font-proof='<document-fonts-proof-json>'
node scripts/capture.mjs --id=surface.issues --kind=built --png=artifacts/parity/surface.issues/built.png --commit=<sha> --artifact-manifest=<built-manifest.json> --artifact=<built-artifact> --session-provenance=<built-session.json>
node scripts/side-by-side.mjs --id=surface.issues --reference=artifacts/parity/surface.issues/reference.png --built=artifacts/parity/surface.issues/built.png --reference-receipt=artifacts/parity/surface.issues/reference.png.receipt.json --built-receipt=artifacts/parity/surface.issues/built.png.receipt.json --output=artifacts/parity/surface.issues/side-by-side.svg --tuple='<tuple-json>' --commit=<sha>
node scripts/diff.mjs --id=surface.issues --reference=artifacts/parity/surface.issues/reference.png --built=artifacts/parity/surface.issues/built.png --reference-receipt=artifacts/parity/surface.issues/reference.png.receipt.json --built-receipt=artifacts/parity/surface.issues/built.png.receipt.json --output=artifacts/parity/surface.issues/diff.json --tuple='<tuple-json>' --commit=<sha>
node scripts/review-diff.mjs --diff=artifacts/parity/surface.issues/diff.json --reviewer='<reviewer>' --approval='<approval record>'
```

The inventory currently records explicit pending evidence because no capture was
fabricated in this implementation lane. The structural command validates the
hand-written inventory while preserving those honest pending rows. `--strict` is the
completion command: it stays red until every row has known production routing,
verified raw inputs, comparison and diff evidence, audited Material Design 3 controls,
and hash-bound receipts for the exact route, tuple, source commit, and rendered
application artifact. The artifact hash is read from a source-commit-bound manifest
and verified against the actual local artifact. A receipt cannot be substituted for
another row's input. Derived tools reject raw images unless the matching raw receipts
also bind their source commit and tuple. A diff remains immutable and unreviewed until
`review-diff.mjs` writes its separate approval record.
The required session-provenance record binds the actual launched capture target to the
row, capture kind, and source commit. It is a separate boundary: a file manifest proves
bytes on disk, not that those bytes were the process or bundle loaded by the capture.
Reference receipts also need a cheap-headless `document.fonts` proof for every named
reference family. That proof blocks strict completion when a remote design font falls
back locally. It records the problem without downloading or substituting a font asset.

The renderer includes one pinned local variable Google Sans v14.000 file under
`fonts/`, with `Google Sans` explicitly fixed to optical size 18 and `Google Sans Text`
to optical size 17. `fonts/GoogleSans-v14.000.provenance.json` records its official
release, source path, hashes, axes, and OFL provenance. At runtime, wait for
`window.__DESIGN_REFERENCE_CAPTURE_READY__` and record
`window.__DESIGN_REFERENCE_FONT_PROOF__`; those values make actual loaded-family
availability inspectable before capture. `window.__DESIGN_REFERENCE_CAPTURE_READY__`
starts as `document.fonts.ready` (a `Promise`) and is reassigned to the literal boolean
`true` once that promise settles, specifically so a caller can poll for
`window.__DESIGN_REFERENCE_CAPTURE_READY__ === true` with a synchronous
`Runtime.evaluate` — never `awaitPromise: true`, which hangs on this project's
development machine for some Node/Electron/Chromium combinations.

## Layout matrix

`design/layout-matrix.json` is a hand-written, 70-row inventory (10 surfaces times 7
theme/scale/viewport tuples) hunting clipping candidates across a wider grid
than the single pinned tuple each `design/parity-inventory.json` row carries: light and
dark at scale 1, 1.5, and 2 on a 1280x800 viewport, plus one narrower 1024x768 tuple at
scale 1 in light. The 10 covered surfaces are `settings`, `issues`, `merge-requests`,
`plan`, `epics`, `shell-a`, `shell-b`, `sidebar`, `command-palette`, and `regex-builder`.
This Rails application has no runtime language-mode switch, so the matrix records that
non-applicability once, at `languageModes`, rather than enumerating language-mode rows
or silently omitting the question.

Each row's `evidence.builtRaw` and `evidence.layoutProbe` follow the identical
`{path, sha256, status, reason}` shape a parity-inventory row's evidence uses, and start
`pending` with `sha256: null` — the matrix is meant to be populated incrementally as
real captures land, not all at once. Populate a row by launching the surface's real
built application (or, while no built instance exists yet, the reference application:
`npm start -- --surface=<slug> --theme=<theme> --width=<width> --height=<height>
--scale=<scale> --cdp-port=<port>`, using the row's own `surfaceId` to find the matching
`design/parity-inventory.json` entry for its route and mount selector) and running
`drive-capture.mjs` with that row's `--theme`/`--scale`/`--width`/`--height` overrides,
followed by `layout-probe.mjs` against the same still-open page.

`parity-guard.mjs --strict` validates the matrix (the plain and `--negative` invocations
do not touch it, so their behavior and output are unchanged by this): every one of the
70 declared surface/tuple rows is present exactly once; any evidence a row claims is
`verified` must actually exist on disk with the recorded hash; and once
`evidence.layoutProbe` is `verified`, every finding actually recorded in that row's real
`layout-probe.json` must be named by a `reason`- and `approval`-carrying entry in that
row's `intentionalFindings`, or the row is red — an unresolved clipping candidate can
never quietly pass because nobody looked at it. Today, with every row honestly pending,
`--strict`'s layout-matrix portion is fully green; `--strict` overall still stays red
purely on the parity inventory's own pending evidence, which this lane does not touch.

```powershell
node scripts/parity-guard.mjs --strict
```
