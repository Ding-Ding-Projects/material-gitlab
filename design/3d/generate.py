#!/usr/bin/env python3
"""Deterministic Blender 4.5 scene generator for Material GitLab editorial art.

Run with Blender in background mode, for example:
  blender -b --python design/3d/generate.py -- --output /absolute/output/path
"""

import argparse
import hashlib
import json
import math
import os
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector


BLENDER_VERSION = "4.5.13"
SCENES = ("hero", "collaboration", "pipelines", "appearance")


def arguments():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, help="Absolute output directory")
    parser.add_argument("--device", choices=("CPU", "CUDA"), default="CPU")
    parser.add_argument("--samples", type=int, default=48)
    parser.add_argument("--scale", type=int, default=100, help="Render percentage")
    parser.add_argument("--scene", choices=("all",) + SCENES, default="all")
    parser.add_argument("--theme", choices=("all", "light", "dark"), default="all")
    args = parser.parse_args(argv)
    target = Path(args.output).expanduser()
    if not target.is_absolute():
        parser.error("--output must be an absolute directory")
    if args.samples < 1 or args.scale < 1 or args.scale > 200:
        parser.error("--samples must be positive and --scale must be 1..200")
    return args, target


def source_hash():
    return hashlib.sha256(Path(__file__).read_bytes()).hexdigest()


def build_hash():
    value = bpy.app.build_hash
    return value.decode("ascii") if isinstance(value, bytes) else str(value)


def require_blender_version():
    if tuple(bpy.app.version) != (4, 5, 13):
        raise RuntimeError("This generator requires Blender 4.5.13, found " + bpy.app.version_string)


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.film_transparent = True
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.resolution_percentage = 100
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 1200
    scene.render.image_settings.compression = 15
    world = bpy.data.worlds.new("Studio World")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.055, 0.035, 0.10, 1)
    background.inputs["Strength"].default_value = 0.18
    scene.world = world
    scene.render.use_file_extension = True
    return scene


def configure(scene, args, width, height):
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = args.scale
    scene.cycles.samples = args.samples
    scene.cycles.use_denoising = True
    scene.cycles.preview_samples = min(16, args.samples)
    effective_device = "CPU"
    device_names = ["CPU"]
    if args.device == "CUDA":
        try:
            prefs = bpy.context.preferences.addons["cycles"].preferences
            prefs.compute_device_type = "CUDA"
            if hasattr(prefs, "refresh_devices"):
                prefs.refresh_devices()
            cuda_devices = list(prefs.get_devices_for_type("CUDA"))
            usable_cuda = [device for device in cuda_devices if getattr(device, "type", None) == "CUDA"]
            for device in cuda_devices:
                device.use = device in usable_cuda
            if usable_cuda:
                scene.cycles.device = "GPU"
                effective_device = "CUDA"
                device_names = [device.name for device in usable_cuda]
                print("Using CUDA devices:", ", ".join(device_names))
            else:
                scene.cycles.device = "CPU"
                print("No CUDA device was enumerated, using CPU.")
        except Exception as exc:
            scene.cycles.device = "CPU"
            print("CUDA preference unavailable, using CPU:", exc)
    else:
        scene.cycles.device = "CPU"
    return effective_device, device_names


def palette(theme):
    if theme == "dark":
        return {
            "base": (0.055, 0.042, 0.11, 1), "ceramic": (0.19, 0.14, 0.31, 1),
            "lavender": (0.44, 0.30, 0.75, 1), "violet": (0.29, 0.12, 0.60, 1),
            "pale": (0.76, 0.68, 0.93, 1), "orange": (1.0, 0.34, 0.10, 1),
            "ink": (0.04, 0.025, 0.08, 1), "glow": (0.70, 0.48, 1.0, 1),
        }
    return {
        "base": (0.95, 0.91, 1.0, 1), "ceramic": (0.82, 0.75, 0.94, 1),
        "lavender": (0.57, 0.40, 0.86, 1), "violet": (0.35, 0.16, 0.67, 1),
        "pale": (0.99, 0.96, 1.0, 1), "orange": (0.98, 0.30, 0.08, 1),
        "ink": (0.12, 0.065, 0.23, 1), "glow": (0.72, 0.54, 1.0, 1),
    }


def material(name, color, metallic=0.0, roughness=0.34, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = color
    node.inputs["Metallic"].default_value = metallic
    node.inputs["Roughness"].default_value = roughness
    if emission:
        node.inputs["Emission Color"].default_value = color
        node.inputs["Emission Strength"].default_value = emission
    return mat


def rounded_box(name, location, scale, mat, bevel=0.14, rotation=None):
    bpy.ops.mesh.primitive_cube_add(location=location)
    ob = bpy.context.object
    ob.name = name
    ob.scale = (scale[0] / 2, scale[1] / 2, scale[2] / 2)
    if rotation:
        ob.rotation_euler = rotation
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel_mod = ob.modifiers.new("Soft editorial bevel", "BEVEL")
    bevel_mod.width = bevel
    bevel_mod.segments = 4
    bevel_mod.limit_method = "ANGLE"
    ob.data.materials.append(mat)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.shade_smooth_by_angle()
    return ob


def disc(name, location, radius, depth, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=radius, depth=depth, location=location, rotation=rotation)
    ob = bpy.context.object
    ob.name = name
    ob.data.materials.append(mat)
    bevel = ob.modifiers.new("Disc edge", "BEVEL")
    bevel.width = min(radius * 0.18, depth * 0.45)
    bevel.segments = 3
    bpy.ops.object.shade_smooth_by_angle()
    return ob


def sphere(name, location, radius, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=radius, location=location)
    ob = bpy.context.object
    ob.name = name
    ob.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return ob


def path(name, points, mat, radius=0.065):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = 4
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    ob = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    return ob


def camera(location, target, focal=55, ortho=10.5):
    bpy.ops.object.camera_add(location=location)
    cam = bpy.context.object
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = ortho
    cam.data.lens = focal
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam


def area(name, location, energy, size, color, target=(0, 0, 0)):
    bpy.ops.object.light_add(type="AREA", location=location)
    lamp = bpy.context.object
    lamp.name = name
    lamp.data.energy = energy
    lamp.data.shape = "DISK"
    lamp.data.size = size
    lamp.data.color = color[:3]
    lamp.rotation_euler = (Vector(target) - lamp.location).to_track_quat("-Z", "Y").to_euler()


def studio(p, theme):
    area("Lavender key", (-5, -4, 8), 950, 5.5, p["pale"])
    area("Warm rim", (5, 1, 6), 700, 4.0, p["orange"])
    area("Violet fill", (0, 6, 4), 620, 4.5, p["lavender"])
    # Film transparency preserves a fully transparent canvas for either theme.


def panel(name, loc, size, p, accent=True, rot=None):
    body = rounded_box(name, loc, size, material(name + " ceramic", p["ceramic"], 0.05, 0.26), 0.18, rot)
    if accent:
        rounded_box(name + " inset", (loc[0], loc[1], loc[2] + size[2] / 2 + 0.012),
                    (size[0] * 0.72, size[1] * 0.055, 0.045), material(name + " accent", p["violet"], 0.08, 0.24), 0.025, rot)
    return body


def hero(p, theme):
    studio(p, theme)
    panel("Hero primary floating panel", (-0.65, 0.2, 0.4), (5.5, 3.35, 0.52), p, True, (0.10, -0.18, -0.16))
    panel("Hero rear panel", (1.25, 1.28, -0.1), (4.25, 2.35, 0.42), p, False, (0.14, 0.15, 0.17))
    # restrained primitives make the panels feel connected without becoming a UI mockup
    for x, y, z, r, color in [(-2.5, 1.0, 0.95, .28, "orange"), (1.45, -.4, .82, .35, "lavender"), (2.75, 1.2, .43, .21, "pale")]:
        sphere("Hero floating node", (x, y, z), r, material("Hero node", p[color], 0.15, 0.22))
    violet = material("Hero violet connector", p["violet"], 0.15, 0.2)
    path("Hero connection one", [(-2.5, 1.0, .95), (-1.75, 1.75, 1.35), (0.15, 1.4, .93), (1.45, -.4, .82)], violet, .075)
    path("Hero connection two", [(1.45, -.4, .82), (2.1, .25, 1.3), (2.75, 1.2, .43)], violet, .055)
    for i in range(4):
        rounded_box("Hero relief %d" % i, (-1.95 + i * .72, -0.27, .77), (.42, .26, .12), material("Hero relief", p["pale"], 0, .32), .06, (0.10, -0.18, -0.16))
    camera((8.8, -10.8, 9.8), (0.25, 0.45, 0.25), ortho=10.8)


def collaboration(p, theme):
    studio(p, theme)
    rotations = [(0.08, -0.10, -0.32), (-0.04, 0.11, 0.28), (0.09, 0.03, 0.07)]
    locations = [(-2.55, .85, .34), (2.35, 1.05, .25), (0, -2.0, .35)]
    for index, (loc, rot) in enumerate(zip(locations, rotations)):
        panel("Collaboration panel %d" % index, loc, (3.25, 2.05, .45), p, index != 1, rot)
        for row in range(3):
            rounded_box("Collaboration tile", (loc[0] - .72 + row * .63, loc[1] - .25, loc[2] + .45), (.42, .17, .08), material("Tile", p["pale"], 0, .35), .05, rot)
    pathmat = material("Converging paths", p["violet"], .18, .2)
    orange = material("Warm collaboration marker", p["orange"], .1, .24)
    hub = (0.0, 0.06, 1.48)
    for i, loc in enumerate(locations):
        start = (loc[0], loc[1], loc[2] + .55)
        path("Converging path %d" % i, [start, ((start[0] + hub[0]) / 2, (start[1] + hub[1]) / 2, 1.7), hub], pathmat, .08)
        sphere("Path endpoint", start, .16, material("Endpoint", p["lavender"], .2, .22))
    sphere("Collaboration hub", hub, .42, orange)
    disc("Hub halo", (0, .06, 1.11), .75, .08, material("Hub halo", p["pale"], .05, .26))
    camera((8.5, -10.0, 10.5), (0, 0, .35), ortho=10.3)


def pipelines(p, theme):
    studio(p, theme)
    violet = material("Pipeline link", p["violet"], .15, .2)
    orange = material("Pipeline emphasis", p["orange"], .08, .22)
    coordinates = [(-3.2, 1.65, .4), (-.65, 1.2, .64), (2.2, 1.45, .32), (-2.25, -1.35, .33), (.45, -1.2, .45), (3.1, -1.15, .37)]
    for i, loc in enumerate(coordinates):
        disc("Pipeline node %d" % i, loc, .54 if i in (1, 4) else .42, .30, orange if i == 4 else material("Pipeline ceramic", p["ceramic"], .1, .24))
        disc("Pipeline node inset", (loc[0], loc[1], loc[2] + .18), .17, .05, material("Node inset", p["pale"], .05, .22))
    links = [(0, 1), (1, 2), (0, 3), (1, 4), (2, 5), (3, 4), (4, 5)]
    for a, b in links:
        start, end = coordinates[a], coordinates[b]
        mid = ((start[0] + end[0]) / 2, (start[1] + end[1]) / 2 + (.55 if start[1] < end[1] else -.55), 1.1)
        path("Pipeline route", [(start[0], start[1], start[2] + .24), mid, (end[0], end[1], end[2] + .24)], violet, .065)
    for i, loc in enumerate([(-3.4, -2.85, .2), (-1.3, -2.75, .35), (.95, -2.9, .22)]):
        rounded_box("Pipeline package %d" % i, loc, (1.35, .92, .52), material("Package", p["lavender" if i == 1 else "pale"], .06, .25), .16, (0.06, -0.08, -.08))
        rounded_box("Package seal", (loc[0], loc[1], loc[2] + .3), (.58, .11, .07), orange, .04, (0.06, -0.08, -.08))
    camera((8.5, -10.8, 10.0), (0, -.25, .3), ortho=10.8)


def appearance(p, theme):
    studio(p, theme)
    panel("Appearance base", (0, .22, -.18), (6.25, 5.2, .5), p, False, (0.08, -0.12, -0.08))
    panel("Appearance middle", (-.28, .55, .45), (5.25, 4.15, .38), p, True, (0.06, -.08, .11))
    panel("Appearance top", (.45, .75, .92), (3.75, 2.75, .32), p, False, (0.08, .09, -.12))
    swatches = [("pale", -1.3), ("lavender", -.45), ("violet", .4), ("orange", 1.25)]
    for key, x in swatches:
        disc("Material swatch", (x, .25, 1.28), .31, .16, material("Swatch " + key, p[key], .12, .22))
        disc("Swatch highlight", (x - .07, .17, 1.39), .08, .03, material("Highlight", p["pale"], .0, .18))
    for i in range(3):
        rounded_box("Appearance relief", (-1.55 + i * .72, -1.1, 1.24), (.46, .27, .12), material("Appearance relief", p["pale"], 0, .3), .06, (0.08, .09, -.12))
    sphere("Appearance focal", (1.72, -.75, 1.45), .44, material("Appearance focal", p["orange"], .08, .2))
    path("Appearance orbit", [(-1.25, 1.35, 1.52), (.1, 1.75, 1.88), (1.72, -.75, 1.45)], material("Appearance orbit", p["violet"], .12, .19), .065)
    camera((7.8, -9.5, 10.5), (0, .2, .45), ortho=8.8)


BUILDERS = {"hero": hero, "collaboration": collaboration, "pipelines": pipelines, "appearance": appearance}


def render_one(name, theme, output, args):
    random.seed(1408 + SCENES.index(name) * 11 + (1 if theme == "dark" else 0))
    scene = reset_scene()
    width, height = (2400, 1600) if name == "hero" else (1200, 1200)
    effective_device, device_names = configure(scene, args, width, height)
    BUILDERS[name](palette(theme), theme)
    png = output / (name + "-" + theme + ".png")
    blend = output / (name + "-" + theme + ".blend")
    # The blend lives beside its PNG, so this remains portable after copying the output directory.
    scene.render.filepath = "//" + png.name
    bpy.context.preferences.filepaths.save_version = 0
    if bpy.ops.wm.save_as_mainfile(filepath=str(blend), check_existing=False, compress=True) != {"FINISHED"} or not blend.is_file():
        raise RuntimeError("Blender did not finish saving " + blend.name)
    if bpy.ops.render.render(write_still=True) != {"FINISHED"} or not png.is_file():
        raise RuntimeError("Blender did not finish rendering " + png.name)
    rendered_width = max(1, int(width * args.scale / 100))
    rendered_height = max(1, int(height * args.scale / 100))
    return {"filename": png.name, "blend": blend.name, "width": rendered_width, "height": rendered_height,
            "blender": bpy.app.version_string, "expected_blender": BLENDER_VERSION,
            "blender_build_hash": build_hash(),
            "engine": "CYCLES", "device": effective_device, "device_names": device_names,
            "requested_device": args.device, "samples": args.samples, "denoiser": str(getattr(scene.cycles, "denoiser", "AUTO")),
            "scale": args.scale, "theme": theme, "scene": name}


def main():
    args, output = arguments()
    require_blender_version()
    output.mkdir(parents=True, exist_ok=True)
    results_path = output / "render-results.json"
    selected_scenes = SCENES if args.scene == "all" else (args.scene,)
    selected_themes = ("light", "dark") if args.theme == "all" else (args.theme,)
    selected = [(name, theme) for name in selected_scenes for theme in selected_themes]
    collisions = [output / (name + "-" + theme + suffix) for name, theme in selected for suffix in (".png", ".blend")]
    if results_path.exists() or any(path.exists() for path in collisions):
        raise RuntimeError("Choose a fresh output directory, refusing to overwrite an existing render or ledger")
    results = {"status": "in_progress", "generator": "design/3d/generate.py", "generator_sha256": source_hash(),
               "blender": bpy.app.version_string, "blender_build_hash": build_hash(), "expected_blender": BLENDER_VERSION,
               "requested": {"scenes": list(selected_scenes), "themes": list(selected_themes), "samples": args.samples,
                             "scale": args.scale, "device": args.device}, "results": []}
    results_path.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    try:
        for name, theme in selected:
            entry = render_one(name, theme, output, args)
            results["results"].append(entry)
            results_path.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
            print("Rendered", entry["filename"])
        if len(results["results"]) != len(selected):
            raise RuntimeError("render ledger is incomplete")
        results["status"] = "complete"
    except Exception as exc:
        results["status"] = "failed"
        results["failure"] = str(exc)
        raise
    finally:
        results_path.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
