#!/usr/bin/env python3
"""Focused negative regressions for the Blender editorial export contract."""

import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from PIL import Image


MODULE_PATH = Path(__file__).with_name("export.py")
SPEC = importlib.util.spec_from_file_location("editorial_export", MODULE_PATH)
editorial_export = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(editorial_export)


class ExportContractTests(unittest.TestCase):
    def setUp(self):
        self.real_dimensions = editorial_export.canonical_dimensions
        editorial_export.canonical_dimensions = lambda name: (96, 64) if name.startswith("hero-") else (64, 64)
        self.temp = tempfile.TemporaryDirectory()
        self.source = Path(self.temp.name) / "input"
        self.source.mkdir()
        self.records = []
        for name in editorial_export.required_names():
            width, height = editorial_export.canonical_dimensions(name)
            image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
            image.putpixel((width // 2, height // 2), (124, 84, 224, 255))
            image.save(self.source / (name + ".png"))
            (self.source / (name + ".blend")).write_bytes(b"small portable source")
            scene, theme = name.split("-", 1)
            self.records.append({"filename": name + ".png", "blend": name + ".blend", "width": width, "height": height,
                                 "scale": 100, "scene": scene, "theme": theme, "blender": "4.5.13", "expected_blender": "4.5.13",
                                 "engine": "CYCLES", "device": "CPU", "requested_device": "CPU", "samples": 48})
        self.write_results()

    def tearDown(self):
        editorial_export.canonical_dimensions = self.real_dimensions
        self.temp.cleanup()

    def write_results(self):
        generator_hash = editorial_export.sha256(MODULE_PATH.with_name("generate.py"))
        (self.source / "render-results.json").write_text(json.dumps({"status": "complete", "generator_sha256": generator_hash, "results": self.records}), encoding="utf-8")

    def test_production_canonical_dimensions(self):
        self.assertEqual(self.real_dimensions("hero-light"), (2400, 1600))
        self.assertEqual(self.real_dimensions("appearance-dark"), (1200, 1200))

    def test_duplicate_record_is_rejected(self):
        self.records[-1] = dict(self.records[0])
        self.write_results()
        with self.assertRaises(ValueError):
            editorial_export.read_results(self.source)

    def test_incomplete_ledger_is_rejected(self):
        ledger_path = self.source / "render-results.json"
        ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
        ledger["status"] = "in_progress"
        ledger_path.write_text(json.dumps(ledger), encoding="utf-8")
        with self.assertRaises(ValueError):
            editorial_export.read_results(self.source)

    def test_traversal_record_is_rejected(self):
        self.records[0]["filename"] = "../hero-light.png"
        self.write_results()
        with self.assertRaises(ValueError):
            editorial_export.read_results(self.source)

    def test_preview_dimensions_are_rejected(self):
        self.records[0]["scale"] = 25
        self.records[0]["width"] = 600
        self.records[0]["height"] = 400
        self.write_results()
        with self.assertRaises(ValueError):
            editorial_export.read_results(self.source)

    def test_missing_master_is_rejected(self):
        (self.source / "hero-light.png").unlink()
        with self.assertRaises(ValueError):
            editorial_export.build_export(self.source, Path(self.temp.name) / "export")

    def test_hash_mutation_and_filename_substitution_are_rejected(self):
        output = Path(self.temp.name) / "export"
        editorial_export.build_export(self.source, output)
        target = output / "hero-light.webp"
        target.write_bytes(target.read_bytes() + b"changed")
        with self.assertRaises(ValueError):
            editorial_export.verify_export(output)
        shutil.rmtree(output)
        editorial_export.build_export(self.source, output)
        manifest_path = output / "manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["files"][0]["filename"] = "substituted.png"
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        with self.assertRaises(ValueError):
            editorial_export.verify_export(output)


if __name__ == "__main__":
    unittest.main(verbosity=2)
