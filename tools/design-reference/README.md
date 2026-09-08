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
node scripts/capture.mjs --id=surface.issues --kind=reference --png=artifacts/parity/surface.issues/reference.png --commit=<sha> --artifact-sha256=<reference-app-artifact-sha256> --font-proof='<document-fonts-proof-json>'
node scripts/capture.mjs --id=surface.issues --kind=built --png=artifacts/parity/surface.issues/built.png --commit=<sha> --artifact-sha256=<built-app-artifact-sha256>
node scripts/side-by-side.mjs --id=surface.issues --reference=artifacts/parity/surface.issues/reference.png --built=artifacts/parity/surface.issues/built.png --output=artifacts/parity/surface.issues/side-by-side.svg --tuple='<tuple-json>' --commit=<sha>
node scripts/diff.mjs --id=surface.issues --reference=artifacts/parity/surface.issues/reference.png --built=artifacts/parity/surface.issues/built.png --output=artifacts/parity/surface.issues/diff.json --tuple='<tuple-json>' --commit=<sha>
```

The inventory currently records explicit pending evidence because no capture was
fabricated in this implementation lane. The structural command validates the
hand-written inventory while preserving those honest pending rows. `--strict` is the
completion command: it stays red until every row has known production routing,
verified raw inputs, comparison and diff evidence, audited Material Design 3 controls,
and hash-bound receipts for the exact route, tuple, source commit, and rendered
application artifact. A receipt cannot be substituted for another row's input.
Reference receipts also need a cheap-headless `document.fonts` proof for every named
reference family. That proof blocks strict completion when a remote design font falls
back locally. It records the problem without downloading or substituting a font asset.
