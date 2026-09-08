#!/usr/bin/env python3
"""Reopen all eight delivered Blender scenes and render small verification images.

Run: blender -b -t 6 --python-exit-code 1 --python verify-blends.py -- INPUT OUTPUT
The input scenes are never saved or modified.
"""
import hashlib
import json
import sys
from pathlib import Path

import bpy


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


args = sys.argv[sys.argv.index("--") + 1:]
if len(args) != 2:
    raise SystemExit("Expected input scene directory and verification output directory")
source, output = (Path(value).resolve() for value in args)
if source == output:
    raise SystemExit("Verification output must be separate from the source directory")
output.mkdir(parents=True, exist_ok=False)
results = []
for name in ("hero", "collaboration", "pipelines", "appearance"):
    for theme in ("light", "dark"):
        stem = f"{name}-{theme}"
        path = source / f"{stem}.blend"
        before = digest(path)
        assert bpy.ops.wm.open_mainfile(filepath=str(path), load_ui=False, use_scripts=False) == {"FINISHED"}, "Scene did not reopen"
        scene = bpy.context.scene
        expected = (2400, 1600) if name == "hero" else (1200, 1200)
        assert (scene.render.resolution_x, scene.render.resolution_y) == expected, stem
        assert scene.render.resolution_percentage == 100, stem
        assert scene.camera is not None and scene.render.engine == "CYCLES", stem
        assert scene.render.film_transparent, stem
        assert scene.render.image_settings.color_mode == "RGBA", stem
        assert scene.render.filepath == f"//{stem}.png", stem
        assert not list(bpy.data.libraries), "External linked resources are not portable"
        assert not any(image.source == "FILE" and not image.packed_file for image in bpy.data.images), "Unpacked image"
        # CPU also proves these files reopen independently of saved GPU preferences.
        scene.cycles.device = "CPU"
        scene.cycles.samples = 4
        scene.render.resolution_percentage = 10
        target = output / f"{stem}.png"
        scene.render.filepath = str(target)
        assert bpy.ops.render.render(write_still=True) == {"FINISHED"}, "Verification render did not finish"
        assert before == digest(path), "Verification changed the source scene"
        assert target.is_file() and target.stat().st_size > 0, stem
        results.append({"scene": path.name, "sha256": before, "reopened": True,
                        "rendered": target.name, "render_sha256": digest(target),
                        "device": "CPU", "samples": 4, "scale": 10,
                        "original_unchanged": True})
        (output / "verification.json").write_text(json.dumps({
            "blender": bpy.app.version_string, "results": results
        }, indent=2) + "\n", encoding="utf-8")
print(f"Verified {len(results)} portable saved scenes")
