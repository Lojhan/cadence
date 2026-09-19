"""Expand verified strum intervals to nearby supported chord targets.
Usage: python3 tooling/prepare-confusions.py INPUT.json OUTPUT.json
Selection uses pitch-class sets only, never recognition output.
"""
import json
import os
from pathlib import Path
import sys

source = Path(sys.argv[1]).resolve()
destination = Path(sys.argv[2]).resolve()
manifest = json.loads(source.read_text())
roots = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
qualities = {"": [0, 4, 7], "m": [0, 3, 7], "7": [0, 4, 7, 10], "m7": [0, 3, 7, 10], "maj7": [0, 4, 7, 11]}
targets = [(root + suffix, sum(1 << ((index + interval) % 12) for interval in intervals)) for index, root in enumerate(roots) for suffix, intervals in qualities.items()]
cases = []
seen = set()
for case in manifest["cases"]:
    if not case["expectedMatch"]:
        continue
    if case["id"] in seen:
        raise SystemExit("Duplicate positive case ID")
    seen.add(case["id"])
    base = {**case, "file": os.path.relpath(source.parent / case["file"], destination.parent)}
    cases.append({**base, "targetChord": case["chord"]})
    actual = case["targetMask"]
    for name, mask in targets:
        if mask == actual or (mask ^ actual).bit_count() > 2 or (mask & actual).bit_count() < 2:
            continue
        cases.append({**base, "id": case["id"].rsplit(":", 1)[0] + ":target-" + name, "targetMask": mask, "targetChord": name, "expectedMatch": False})
manifest["cases"] = cases
manifest["negativeSelection"] = "All supported major, minor, dominant seventh, minor seventh and major seventh targets sharing at least two pitch classes and differing in one or two pitch classes; exact source mask excluded. Same verified audio interval for every target."
destination.write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps({"positive": sum(case["expectedMatch"] for case in cases), "negative": sum(not case["expectedMatch"] for case in cases)}))
