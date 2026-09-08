# Design reference parity

The checked-in design contracts are verified against the built Windows desktop
application one row at a time. The hand-written inventory is
`design/parity-inventory.json`; it contains one explicit row for each of the 25
`design/*.dc.html` files.

Each row records the immutable design hash, the dedicated reference route, the
production route and mount selector, the named state, theme, locale, viewport, scale,
deterministic inputs, Material Design 3 audit, and all raw and derived evidence paths.
The reference and built routes must use the same normalized tuple. Pending evidence is
represented explicitly with a reason; it is not a passing verdict.

## Reference route

The Electron application at `tools/design-reference` reads the original design file
from `design/` and serves it directly. It injects only the local React runtime needed
by the checked-in support script and deterministic capture controls. External network
requests are refused. Use the stable route form
`/design-reference/<surface>?state=...&theme=...&scale=...&locale=...`.

## Evidence and guard

All captures must come from the approved cheap Lowlevel headless route. The capture
tool refuses to create an image without a real PNG, records its SHA-256 and dimensions,
and writes a receipt containing the tuple and source commit. The side-by-side tool
embeds both retained PNGs and labels the two sides. The diff tool records both input
hashes, dimensions, changed-pixel metrics, threshold, and tool provenance; metrics do
not approve visual differences.

Run the exact inventory guard and its negative regression before relying on a parity
result:

```powershell
node tools/design-reference/scripts/parity-guard.mjs
node tools/design-reference/scripts/parity-guard.mjs --negative
node tools/design-reference/scripts/parity-guard.mjs --strict
```

The default command is a structural inventory check. It remains green while rows
honestly record pending capture evidence. `--strict` is the completion check and
remains red until every row has known production routing, verified raw and derived
evidence, a completed Material Design 3 audit, and an approved intentional-deviation
record when one exists. Each raw receipt is bound to its exact route, capture tuple,
source commit, raw input hash, and rendered artifact SHA-256. The current inventory
contains 25 pending rows, so strict completion is expected to remain red until the
real hidden-desktop capture program supplies that evidence.

For the reference capture, the receipt also records cheap-headless `document.fonts`
availability for every explicitly named family in the design source. A missing local
font blocks strict completion, preventing a fallback-font capture from becoming parity
evidence. The guard records the absence only. It neither downloads nor substitutes a
font asset.

The negative regression removes each required reference, route, tuple, deterministic
input, audit, and evidence boundary from every row in memory. It must turn red for the
removed boundary and green after restoring the original inventory. This prevents a
discovery-only list, stale route, or filename-only evidence manifest from passing.

No raw or derived capture is committed by the reference application itself. Capture
production remains a separate, explicitly verified step.
