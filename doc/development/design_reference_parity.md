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
```

The negative regression removes each required reference, route, tuple, deterministic
input, audit, and evidence boundary from every row in memory. It must turn red for the
removed boundary and green after restoring the original inventory. This prevents a
discovery-only list, stale route, or filename-only evidence manifest from passing.

No raw or derived capture is committed by the reference application itself. Capture
production remains a separate, explicitly verified step.
