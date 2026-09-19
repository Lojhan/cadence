"""Derive annotated full-tone strum attempts without consulting engine outcomes.
Reports remain separate from the broader accompaniment-segment spike.
"""
import json
from pathlib import Path
import sys

root = Path(sys.argv[1])
for split in ["calibration", "held-out"]:
    manifest = json.loads((root / f"{split}.json").read_text())
    result = []
    excluded = 0
    annotations = {}
    starts = {}
    for case in manifest["cases"]:
        group = case["id"].rsplit(":", 1)[0]
        if case["expectedMatch"]:
            stem = Path(case["file"]).name.removesuffix("_mic.wav")
            if stem not in annotations:
                annotations[stem] = json.loads((root / "annotations" / f"{stem}.jams").read_text())
            notes = [n for a in annotations[stem]["annotations"] if a["namespace"] == "note_midi" for n in a["data"]]
            original_start = case["startSeconds"]
            original_end = original_start + case["durationSeconds"]
            target = {i for i in range(12) if case["targetMask"] & (1 << i)}
            interval = None
            for onset in sorted(n["time"] for n in notes if original_start <= n["time"] < original_end - 0.5):
                attack = [n for n in notes if onset <= n["time"] <= onset + 0.15]
                pitches = {round(n["value"]) % 12 for n in attack}
                held = {round(n["value"]) % 12 for n in attack if n["time"] + n["duration"] >= onset + 0.4}
                foreign = [n for n in notes if round(n["value"]) % 12 not in target and n["time"] + n["duration"] > onset]
                # A held foreign note invalidates the attempt. A later foreign
                # onset ends the label, even if the coarse chord annotation has
                # not changed yet. Apply the same interval to negative targets.
                if any(n["time"] < onset + 0.15 for n in foreign):
                    continue
                end = min([original_end] + [n["time"] for n in foreign])
                if pitches == target and held == target and end - onset >= 0.5:
                    interval = (onset, end)
                    break
            starts[group] = interval
        interval = starts.get(group)
        if interval is None:
            excluded += 1
            continue
        start, end = interval
        result.append({**case, "startSeconds": start, "durationSeconds": end - start})
    report = {**manifest, "selection": "All target pitch classes attacked within 150 ms, no extra attacked pitch classes, all target classes annotated sounding at 400 ms; no held foreign notes; interval ends before any foreign onset, with at least 500 ms available; selected without engine output", "excludedIncompleteStrums": excluded, "cases": result}
    (root / f"{split}-strums.json").write_text(json.dumps(report, indent=2) + "\n")
    print(split, len(result), "cases", excluded, "excluded")
