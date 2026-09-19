"""Prepare a reproducible, local-only GuitarSet recognition spike (CC BY 4.0).
Usage: python3 tooling/prepare-guitarset.py artifacts/guitarset [--allow-partial]
The corpus is never bundled into the application or MIT packages.
"""
import hashlib
import json
from pathlib import Path
import struct
import sys
import wave
import zlib
import zipfile

root = Path(sys.argv[1]).resolve()
archive = root / "audio_mono-mic.zip"
expected = "275966d6610ac34999b58426beb119c3"
def digest(path, algorithm):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, algorithm).hexdigest()

complete = digest(archive, "md5") == expected
if not complete and "--allow-partial" not in sys.argv:
    raise SystemExit("Audio checksum mismatch; resume download or explicitly allow a partial spike")
annotation_archive = root / "annotation.zip"
if digest(annotation_archive, "md5") != "b39b78e63d3446f2e54ddb7a54df9b10":
    raise SystemExit("Annotation checksum mismatch")
annotations = root / "annotations"
annotations.mkdir(exist_ok=True)
with zipfile.ZipFile(annotation_archive) as zipped:
    for name in zipped.namelist():
        if name.endswith(".jams"):
            (annotations / Path(name).name).write_bytes(zipped.read(name))
audio = root / "audio"
audio.mkdir(exist_ok=True)
# Local ZIP entries allow an interrupted download to produce an explicitly partial
# engineering spike. Each extracted entry still validates size and CRC32.
with archive.open("rb") as stream:
    while True:
        header = stream.read(30)
        if len(header) < 30:
            break
        fields = struct.unpack("<IHHHHHIIIHH", header)
        if fields[0] != 0x04034B50:
            break
        _, _, flags, compression, _, _, crc, compressed, size, name_size, extra_size = fields
        name = stream.read(name_size).decode()
        stream.read(extra_size)
        if flags & 8:
            raise SystemExit("ZIP data descriptors are unsupported")
        data = stream.read(compressed)
        if len(data) != compressed:
            break
        if not name.endswith("_comp_mic.wav"):
            continue
        if Path(name).name != name:
            raise SystemExit("Unexpected archive path")
        if compression not in [0, 8]:
            raise SystemExit("Unsupported ZIP compression")
        decoded = zlib.decompress(data, -15) if compression == 8 else data
        if len(decoded) != size or zlib.crc32(decoded) != crc:
            raise SystemExit(f"Invalid ZIP entry: {name}")
        (audio / name).write_bytes(decoded)

roots = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
intervals = {"maj": [0, 4, 7], "min": [0, 3, 7], "7": [0, 4, 7, 10], "min7": [0, 3, 7, 10], "maj7": [0, 4, 7, 11]}
labels = {"maj": "", "min": "m", "7": "7", "min7": "m7", "maj7": "maj7"}
cases = []
files = []
skipped = 0
for path in sorted(audio.glob("*_comp_mic.wav")):
    stem = path.name.removesuffix("_mic.wav")
    annotation = json.loads((root / "annotations" / f"{stem}.jams").read_text())
    chords = [a for a in annotation["annotations"] if a["namespace"] == "chord"][-1]["data"]
    notes = [n for a in annotation["annotations"] if a["namespace"] == "note_midi" for n in a["data"]]
    split = "held-out" if stem[:2] in ["04", "05"] else "calibration"
    with wave.open(str(path)) as wav:
        length = wav.getnframes() / wav.getframerate()
    files.append({"name": path.name, "sha256": digest(path, "sha256"), "player": stem[:2], "split": split})
    for i, chord in enumerate(chords):
        value = chord["value"].split("/")[0]
        if ":" not in value:
            skipped += 1
            continue
        note, quality = value.split(":", 1)
        if note not in roots or quality not in intervals:
            skipped += 1
            continue
        boundary = chord["time"]
        end = min(boundary + chord["duration"], length)
        onsets = [n["time"] for n in notes if boundary <= n["time"] < end]
        if not onsets:
            skipped += 1
            continue
        start = min(onsets)
        duration = min(1.5, end - start)
        if duration < 0.7:
            skipped += 1
            continue
        mask = sum(1 << ((roots[note] + interval) % 12) for interval in intervals[quality])
        base = {"file": f"audio/{path.name}", "startSeconds": start, "durationSeconds": duration, "split": split, "chord": note + labels[quality]}
        cases.append({**base, "id": f"{stem}:{i}:correct", "targetMask": mask, "expectedMatch": True})
        opposite = "min" if quality == "maj" else "maj"
        wrong = sum(1 << ((roots[note] + interval) % 12) for interval in intervals[opposite])
        # Do not call a subset target "wrong": seventh recordings can validly
        # contain a complete major/minor triad, depending on product tolerance.
        if quality in ["maj", "min"]:
            cases.append({**base, "id": f"{stem}:{i}:wrong-quality", "targetMask": wrong, "expectedMatch": False})
manifest = {"source": "https://zenodo.org/records/3371780", "license": "CC-BY-4.0", "partialArchive": not complete, "audioArchiveMd5": digest(archive, "md5"), "annotationArchiveMd5": digest(annotation_archive, "md5"), "excludedUnsupportedOrShortSegments": skipped, "files": files, "cases": cases}
for split in ["calibration", "held-out"]:
    (root / f"{split}.json").write_text(json.dumps({**manifest, "cases": [c for c in cases if c["split"] == split]}, indent=2) + "\n")
print(json.dumps({"files": len(files), "cases": len(cases), "partial": not complete, "skipped": skipped}))
