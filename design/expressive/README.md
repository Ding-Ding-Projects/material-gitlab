# Material 3 Expressive canvas

The current design for this fork. `project/` holds the canvas index (`canvas.json`) and one
`.dc.html` artboard per screen; `tools/` holds the generator and the color scripts that produced the
token scheme. Each artboard loads `./support.js` from the design editor's runtime, which is not part
of this repository, so open the artboards in the design editor or read them as HTML source.

Regenerate:

```shell
python3 design/expressive/tools/build.py design/expressive
```

Regenerate the color scheme (needs `npm install @material/material-color-utilities@0.3.0`):

```shell
node design/expressive/tools/generate-scheme.mjs '#6E49CB' v
node design/expressive/tools/generate-palettes.mjs
node design/expressive/tools/generate-custom-roles.mjs
```

`scheme.json` is the vibrant scheme merged with the custom tertiary, success and warning roles;
the success container is tone 94. Full write-up:
[`doc/development/ux/material-expressive.md`](../../doc/development/ux/material-expressive.md).
