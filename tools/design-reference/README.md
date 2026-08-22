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
node scripts/capture.mjs --id=surface.issues --kind=reference --png=artifacts/parity/surface.issues/reference.png --commit=<sha>
node scripts/capture.mjs --id=surface.issues --kind=built --png=artifacts/parity/surface.issues/built.png --commit=<sha>
node scripts/side-by-side.mjs --id=surface.issues --reference=artifacts/parity/surface.issues/reference.png --built=artifacts/parity/surface.issues/built.png --output=artifacts/parity/surface.issues/side-by-side.svg
node scripts/diff.mjs --id=surface.issues --reference=artifacts/parity/surface.issues/reference.png --built=artifacts/parity/surface.issues/built.png --output=artifacts/parity/surface.issues/diff.json
```

The inventory currently records explicit pending evidence because no capture was
fabricated in this implementation lane. A row becomes verified only after both raw
images, the labelled comparison, the diff record, and a reviewed Material Design 3
audit are present and hash-bound to the same tuple and source commit.
