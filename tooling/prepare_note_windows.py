"""Select annotation-isolated calibration note windows; no detector output is used.

Usage: python3 tooling/prepare_note_windows.py artifacts/guitarset
Audio remains CC BY 4.0. This prepares research data, not a trained runtime model.
"""
import hashlib
import io
import json
import math
from pathlib import Path
import re
import sys
import wave
import zipfile

WINDOW = 8192
GUARD_SECONDS = 0.1


def calibration_solo(name):
    return re.fullmatch(r"0[0-3]_[^/]+_solo\.jams", name) is not None


def select_windows(notes, rate, total_frames):
    if not isinstance(rate, int) or rate <= 0 or total_frames < 0:
        raise ValueError("Invalid recording dimensions")
    intervals = []
    for note in notes:
        if not all(math.isfinite(note[key]) for key in ["time", "duration", "value"]):
            raise ValueError("Non-finite note annotation")
        if note["time"] < 0 or note["duration"] <= 0:
            raise ValueError("Invalid note interval")
        intervals.append((math.floor(note["time"] * rate), math.ceil((note["time"] + note["duration"]) * rate)))
    guard = math.ceil(GUARD_SECONDS * rate)
    selected = []
    for index, note in enumerate(notes):
        midi = round(note["value"])
        if not 40 <= midi <= 88:
            continue
        first = math.ceil((note["time"] + GUARD_SECONDS) * rate)
        last = min(total_frames - guard, math.floor((note["time"] + note["duration"] - GUARD_SECONDS) * rate)) - WINDOW
        if last < first:
            continue
        seen = set()
        for phase, start in [("attack", first), ("middle", (first + last) // 2), ("late", last)]:
            if start in seen:
                continue
            seen.add(start)
            if any(other != index and begin < start + WINDOW + guard and end > start - guard
                   for other, (begin, end) in enumerate(intervals)):
                continue
            selected.append({"noteIndex": index, "midi": midi, "annotatedMidi": note["value"],
                             "phase": phase, "sampleStart": start, "sampleCount": WINDOW})
    return selected


def digest(path, algorithm="sha256"):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, algorithm).hexdigest()


def prepare(root):
    audio_archive = root / "audio_mono-mic.zip"
    annotation_archive = root / "annotation.zip"
    expected_audio = "275966d6610ac34999b58426beb119c3"
    expected_annotations = "b39b78e63d3446f2e54ddb7a54df9b10"
    if digest(audio_archive, "md5") != expected_audio or digest(annotation_archive, "md5") != expected_annotations:
        raise ValueError("GuitarSet archive checksum mismatch")
    destination = root / "audio-solo-calibration"
    destination.mkdir(exist_ok=True)
    files, windows = [], []
    with zipfile.ZipFile(audio_archive) as audio_zip, zipfile.ZipFile(annotation_archive) as annotation_zip:
        for name in sorted(annotation_zip.namelist()):
            filename = Path(name).name
            # Do not deserialize or extract held-out annotations or recordings.
            if not calibration_solo(filename):
                continue
            encoded = annotation_zip.read(name)
            document = json.loads(encoded)
            notes = [note for annotation in document["annotations"] if annotation["namespace"] == "note_midi" for note in annotation["data"]]
            audio_name = filename.removesuffix(".jams") + "_mic.wav"
            data = audio_zip.read(audio_name)
            with wave.open(io.BytesIO(data)) as recording:
                rate, frames = recording.getframerate(), recording.getnframes()
                selected = select_windows(notes, rate, frames)
            if not selected:
                continue
            (destination / audio_name).write_bytes(data)
            relative = f"audio-solo-calibration/{audio_name}"
            files.append({"file": relative, "player": filename[:2], "sampleRate": rate,
                          "sha256": hashlib.sha256(data).hexdigest(),
                          "annotationSha256": hashlib.sha256(encoded).hexdigest()})
            windows.extend({"file": relative, **window} for window in selected)
    manifest = {"source": "https://zenodo.org/records/3371780", "license": "CC-BY-4.0",
                "split": "calibration", "heldOutRead": False,
                "audioArchiveMd5": expected_audio, "annotationArchiveMd5": expected_annotations,
                "selection": "8192-sample attack/middle/late windows within a single annotated MIDI note, with 100 ms margins and no other annotated note overlapping the guarded window; only players 00-03 solo recordings",
                "files": files, "windows": windows}
    (root / "calibration-note-windows.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"files": len(files), "windows": len(windows), "heldOutRead": False}))


if __name__ == "__main__":
    prepare(Path(sys.argv[1]).resolve())
