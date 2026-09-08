#!/usr/bin/env python3
"""Validate Blender masters and export portable responsive editorial graphics."""

import argparse
import hashlib
import json
import os
import shutil
import uuid
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


SCENES = ("hero", "collaboration", "pipelines", "appearance")
THEMES = ("light", "dark")
MAX_SOURCE_BYTES = 10 * 1024 * 1024


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Directory containing Blender PNGs and render-results.json")
    parser.add_argument("--output", required=True, help="Directory for copied masters and derivatives")
    parser.add_argument("--verify-only", action="store_true", help="Rehash and decode an existing export only")
    args = parser.parse_args()
    args.input = Path(args.input).expanduser().resolve()
    args.output = Path(args.output).expanduser().resolve()
    if not args.input.is_dir():
        parser.error("--input must be an existing directory")
    if args.verify_only and not args.output.is_dir():
        parser.error("--verify-only requires an existing --output directory")
    return args


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def required_names():
    return [f"{scene}-{theme}" for theme in THEMES for scene in SCENES]


def canonical_dimensions(name):
    return (2400, 1600) if name.startswith("hero-") else (1200, 1200)


def contained(root, candidate):
    try:
        candidate.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def read_results(source):
    result_path = source / "render-results.json"
    if not result_path.is_file():
        raise ValueError("missing render-results.json")
    payload = json.loads(result_path.read_text(encoding="utf-8"))
    entries = payload.get("results")
    generator_hash = payload.get("generator_sha256")
    if payload.get("status") != "complete":
        raise ValueError("render-results.json status must be complete before export")
    if not isinstance(entries, list) or len(entries) != 8:
        raise ValueError("render-results.json must contain exactly eight results")
    if not isinstance(generator_hash, str) or len(generator_hash) != 64 or any(char not in "0123456789abcdef" for char in generator_hash):
        raise ValueError("render-results.json must bind renders to a generator_sha256")
    current_generator = Path(__file__).with_name("generate.py")
    if not current_generator.is_file() or generator_hash != sha256(current_generator):
        raise ValueError("render-results.json generator_sha256 does not match the current generator source")
    by_name = {}
    for item in entries:
        filename = item.get("filename")
        blend = item.get("blend")
        if not isinstance(filename, str) or not isinstance(blend, str) or Path(filename).name != filename or Path(blend).name != blend or "/" in filename or "\\" in filename or "/" in blend or "\\" in blend:
            raise ValueError("render result sources must be basename-only filenames")
        name = Path(filename).stem
        if name in by_name:
            raise ValueError("render-results.json contains duplicate PNG stems")
        by_name[name] = item
    wanted = required_names()
    if set(by_name) != set(wanted):
        raise ValueError("render-results.json must contain exactly the eight expected scene/theme PNGs")
    for name, item in by_name.items():
        if item.get("filename") != name + ".png" or item.get("blend") != name + ".blend":
            raise ValueError(f"render source names are not canonical for {name}")
        if item.get("scene") + "-" + item.get("theme") != name:
            raise ValueError(f"render scene/theme fields are not canonical for {name}")
        if item.get("scale") != 100 or (item.get("width"), item.get("height")) != canonical_dimensions(name):
            raise ValueError(f"{name} must be a canonical 100 percent master, not a preview")
        for filename in (item["filename"], item["blend"]):
            if not contained(source, source / filename):
                raise ValueError(f"render source escapes --input: {filename}")
    return by_name, generator_hash


def check_rgba_png(path, entry):
    with Image.open(path) as opened:
        opened.load()
        if opened.format != "PNG" or opened.mode != "RGBA":
            raise ValueError(f"{path.name} must be a decoded RGBA PNG")
        expected = (int(entry["width"]), int(entry["height"]))
        if opened.size != expected:
            raise ValueError(f"{path.name} is {opened.size}, expected {expected}")
        alpha = opened.getchannel("A")
        minimum, maximum = alpha.getextrema()
        if minimum != 0 or maximum == 0:
            raise ValueError(f"{path.name} must have transparent pixels and visible nonempty artwork")
    return {"width": expected[0], "height": expected[1], "mode": "RGBA"}


def copy_source(source, destination):
    if source.resolve() != destination.resolve():
        shutil.copy2(source, destination)


def webp_copy(source, destination, width=None):
    with Image.open(source) as opened:
        rgba = opened.convert("RGBA")
        if width:
            height = max(1, round(rgba.height * width / rgba.width))
            rgba = rgba.resize((width, height), Image.Resampling.LANCZOS)
        rgba.save(destination, "WEBP", lossless=True, method=6, quality=100)
    with Image.open(destination) as check:
        check.load()
        if check.format != "WEBP" or check.mode != "RGBA":
            raise ValueError(f"{destination.name} did not reopen as RGBA WebP")
        return {"width": check.width, "height": check.height, "mode": check.mode}


def contact_sheet(source, destination):
    cell_w, cell_h, margin, label_h = 520, 380, 28, 34
    sheet = Image.new("RGB", (margin + 4 * (cell_w + margin), margin + 2 * (cell_h + label_h + margin)), (30, 24, 46))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=16)
    backgrounds = {"light": (241, 235, 255), "dark": (31, 20, 58)}
    for row, theme in enumerate(THEMES):
        for col, scene in enumerate(SCENES):
            x = margin + col * (cell_w + margin)
            y = margin + row * (cell_h + label_h + margin)
            draw.rounded_rectangle((x, y, x + cell_w, y + cell_h + label_h), radius=18, fill=backgrounds[theme])
            path = source / f"{scene}-{theme}.png"
            with Image.open(path) as opened:
                image = opened.convert("RGBA")
                image.thumbnail((cell_w - 32, cell_h - 32), Image.Resampling.LANCZOS)
                backdrop = Image.new("RGBA", (cell_w, cell_h), backgrounds[theme] + (255,))
                backdrop.alpha_composite(image, ((cell_w - image.width) // 2, (cell_h - image.height) // 2))
            sheet.paste(backdrop.convert("RGB"), (x, y))
            label_color = (255, 250, 255) if theme == "dark" else (40, 24, 62)
            draw.text((x + 16, y + cell_h + 10), f"{scene} · {theme}", fill=label_color, font=font)
    sheet.save(destination, "JPEG", quality=94, progressive=True, subsampling=0)
    with Image.open(destination) as check:
        check.load()
        if check.format != "JPEG" or check.mode != "RGB":
            raise ValueError("contact-sheet.jpg did not reopen as RGB JPEG")
        return {"width": check.width, "height": check.height, "mode": check.mode}


def file_entry(path, kind, dimensions=None):
    item = {"filename": path.name, "kind": kind, "bytes": path.stat().st_size, "sha256": sha256(path)}
    if dimensions:
        item.update(dimensions)
    return item


def expected_inventory():
    inventory = {}
    for name in required_names():
        inventory[name + ".png"] = "png-master"
        inventory[name + ".blend"] = "blend-source"
        inventory[name + ".webp"] = "webp-original"
        inventory[name + ("-1200.webp" if name.startswith("hero-") else "-600.webp")] = "webp-responsive"
    inventory["contact-sheet.jpg"] = "contact-sheet"
    return inventory


def build_export(source, output):
    entries, generator_hash = read_results(source)
    output.mkdir(parents=True, exist_ok=False)
    files = []
    source_objects = []
    render_info = []
    for name in required_names():
        entry = entries[name]
        png_source = source / entry["filename"]
        blend_source = source / entry["blend"]
        if not contained(source, png_source) or not contained(source, blend_source) or not png_source.is_file() or not blend_source.is_file():
            raise ValueError(f"missing source object for {name}")
        dimensions = check_rgba_png(png_source, entry)
        if blend_source.stat().st_size >= MAX_SOURCE_BYTES:
            raise ValueError(f"{blend_source.name} is at least 10 MiB and cannot be copied")
        png_dest = output / png_source.name
        blend_dest = output / blend_source.name
        copy_source(png_source, png_dest)
        copy_source(blend_source, blend_dest)
        files.extend((file_entry(png_dest, "png-master", dimensions), file_entry(blend_dest, "blend-source")))
        source_objects.extend((file_entry(png_source, "input-png", dimensions), file_entry(blend_source, "input-blend")))
        full = output / f"{name}.webp"
        responsive = output / f"{name}-{'1200' if name.startswith('hero-') else '600'}.webp"
        files.append(file_entry(full, "webp-original", webp_copy(png_source, full)))
        responsive_width = 1200 if name.startswith("hero-") else 600
        files.append(file_entry(responsive, "webp-responsive", webp_copy(png_source, responsive, responsive_width)))
        render_info.append({key: entry[key] for key in ("scene", "theme", "width", "height", "blender", "expected_blender", "blender_build_hash", "engine", "device", "device_names", "requested_device", "samples", "scale", "denoiser", "filename", "blend") if key in entry})
    contact = output / "contact-sheet.jpg"
    files.append(file_entry(contact, "contact-sheet", contact_sheet(source, contact)))
    generator = Path(__file__).with_name("generate.py")
    manifest = {
        "format": 1,
        "render_info": render_info,
        "source": {"generator": generator.name, "generator_sha256": generator_hash, "exporter_pillow": Image.__version__, "objects": source_objects},
        "files": files,
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return verify_export(output)


def export_all(source, output):
    if source == output:
        raise ValueError("--input and --output must be different directories")
    output.parent.mkdir(parents=True, exist_ok=True)
    token = uuid.uuid4().hex
    staging = output.parent / ("." + output.name + ".staging-" + token)
    build_export(source, staging)
    # Directory renames are atomic on this filesystem. Keep a previous verified export as a backup.
    if output.exists():
        backup = output.parent / (output.name + ".previous-" + token)
        os.replace(output, backup)
    os.replace(staging, output)
    return verify_export(output)


def verify_export(output):
    manifest_path = output / "manifest.json"
    if not manifest_path.is_file():
        raise ValueError("missing manifest.json")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    provenance = manifest.get("source")
    if not isinstance(provenance, dict) or not isinstance(provenance.get("generator_sha256"), str) or len(provenance["generator_sha256"]) != 64 or not provenance.get("exporter_pillow"):
        raise ValueError("manifest lacks generator provenance or Pillow version")
    files = manifest.get("files")
    inventory = expected_inventory()
    if not isinstance(files, list) or len(files) != len(inventory):
        raise ValueError("manifest must enumerate the exact canonical export inventory")
    render_info = manifest.get("render_info")
    if not isinstance(render_info, list) or len(render_info) != 8:
        raise ValueError("manifest must contain eight canonical render records")
    if {record.get("scene", "") + "-" + record.get("theme", "") for record in render_info} != set(required_names()):
        raise ValueError("manifest render_info does not cover all canonical scene/theme records")
    for record in render_info:
        name = record["scene"] + "-" + record["theme"]
        if record.get("filename") != name + ".png" or record.get("blend") != name + ".blend" or record.get("scale") != 100:
            raise ValueError(f"manifest render_info is noncanonical for {name}")
        if (record.get("width"), record.get("height")) != canonical_dimensions(name):
            raise ValueError(f"manifest master dimensions are invalid for {name}")
    names = set()
    for item in files:
        filename = item.get("filename", "")
        if not filename or Path(filename).name != filename or filename in names or inventory.get(filename) != item.get("kind"):
            raise ValueError("manifest filenames must be unique relative filenames")
        names.add(filename)
        path = output / filename
        if not path.is_file() or path.stat().st_size != item.get("bytes") or sha256(path) != item.get("sha256"):
            raise ValueError(f"manifest hash or size mismatch: {filename}")
        if path.suffix.lower() == ".webp":
            with Image.open(path) as opened:
                opened.load()
                if opened.format != "WEBP" or opened.mode != "RGBA" or (opened.width, opened.height) != (item.get("width"), item.get("height")):
                    raise ValueError(f"invalid WebP output: {filename}")
        elif path.suffix.lower() == ".png":
            with Image.open(path) as opened:
                opened.load()
                name = path.stem
                dimensions = {"width": canonical_dimensions(name)[0], "height": canonical_dimensions(name)[1], "mode": "RGBA"}
                if opened.format != "PNG" or opened.mode != "RGBA" or (opened.width, opened.height) != (dimensions["width"], dimensions["height"]) or (opened.width, opened.height) != (item.get("width"), item.get("height")):
                    raise ValueError(f"invalid PNG output: {filename}")
        elif path.suffix.lower() == ".jpg":
            with Image.open(path) as opened:
                opened.load()
                if opened.format != "JPEG" or opened.mode != "RGB" or (opened.width, opened.height) != (item.get("width"), item.get("height")):
                    raise ValueError(f"invalid contact sheet: {filename}")
    if names != set(inventory):
        raise ValueError("manifest inventory is incomplete or contains substitutions")
    print("Verified", len(files), "exported files from", output)
    return manifest


def main():
    args = parse_args()
    if args.verify_only:
        verify_export(args.output)
    else:
        export_all(args.input, args.output)


if __name__ == "__main__":
    main()
