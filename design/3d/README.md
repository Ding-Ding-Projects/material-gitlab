# Blender editorial graphics

`generate.py` produces deterministic, genuine Blender Cycles renders for the artwork used by the design system. It creates no text, fonts, image textures, or external linked resources. Each selected scene/theme pair is rebuilt from an empty Blender file, then saved as a compressed portable `.blend` and rendered as a transparent RGBA PNG. The saved render filepath is relative to its `.blend`, so copying the output directory preserves the relationship.

Run it from Blender 4.5.13 or a compatible Blender 4.5 background installation:

```sh
blender -b --python design/3d/generate.py -- \
  --output /absolute/path/to/render-output \
  --device CPU --samples 48 --scale 100 --scene all --theme all
```

`--output` must be an absolute directory. Render outputs stay outside this checkout. The generator creates these files for the default invocation:

| Scene | Composition | PNG size |
| --- | --- | --- |
| `hero` | Floating connected editorial panels with intentional negative space | 2400 × 1600 |
| `collaboration` | Three stacked panels converging on a warm shared hub | 1200 × 1200 |
| `pipelines` | Connected pipeline nodes and package blocks | 1200 × 1200 |
| `appearance` | Layered material panels and physical colour swatches | 1200 × 1200 |

The script renders `light` and `dark` variants by default, with names such as `hero-light.png`, `hero-dark.blend`, and `appearance-dark.png`. It also writes `render-results.json` after each completed render so a partial run retains its completed-output metadata.

Use `--scene hero` or `--theme dark` to narrow a render. `--device CUDA` enumerates CUDA devices and enables only CUDA GPUs. If none are available, the render explicitly uses CPU and records both requested and effective device values. `--samples` defaults to `48` and `--scale` defaults to `100`; `render-results.json` records the scaled output dimensions.

## Exporting responsive assets

After rendering all eight masters, use the Pillow exporter with external input and output directories:

```sh
python design/3d/export.py \
  --input /absolute/path/to/render-output \
  --output /absolute/path/to/public-graphics
```

The exporter accepts only the canonical 100 percent masters: 2400 × 1600 hero renders and 1200 × 1200 feature renders. It verifies every RGBA PNG against `render-results.json`, including its exact dimensions, transparent pixels, and visible content. It copies the PNG masters and compressed `.blend` sources only when each `.blend` is smaller than 10 MiB, produces lossless RGBA WebP originals, produces `-1200.webp` hero variants and `-600.webp` feature variants, and builds a labeled two-row contact sheet with explicitly colored light and dark backgrounds. `manifest.json` records relative filenames, dimensions, byte sizes, hashes, render information, generator provenance captured at render time, Pillow version, and input-source hashes.

Exports are built in a sibling staging directory, fully verified, then published by directory rename. An existing export is retained as a uniquely named sibling backup until a later owner-managed cleanup.

Re-verify an already produced export without generating files again:

```sh
python design/3d/export.py --input /absolute/path/to/render-output \
  --output /absolute/path/to/public-graphics --verify-only
```

Run the focused export-contract regressions with:

```sh
python design/3d/test-export.py
```

The generator is deterministic in scene construction: it uses fixed scene choices, seeds, cameras, lights, and locally defined materials. Pixel bytes can still vary between Cycles devices, driver versions, and denoiser implementations. Render and export outputs should stay outside the source checkout.
