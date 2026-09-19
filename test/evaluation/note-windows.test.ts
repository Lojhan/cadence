import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strict as assert } from "poku";

function select(
  notes: { time: number; duration: number; value: number }[],
  rate = 48000,
  frames = 96000,
) {
  const result = spawnSync(
    "python3",
    [
      "-c",
      `
import json, sys
sys.path.insert(0, "tooling")
from prepare_note_windows import select_windows, calibration_solo
request = json.load(sys.stdin)
print(json.dumps({"windows": select_windows(request["notes"], request["rate"], request["frames"]), "players": [calibration_solo(name) for name in ["00_test_solo.jams", "03_test_solo.jams", "04_test_solo.jams", "05_test_solo.jams", "00_test_comp.jams"]]}))
`,
    ],
    { input: JSON.stringify({ notes, rate, frames }), encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as {
    windows: {
      sampleStart: number;
      sampleCount: number;
      midi: number;
      noteIndex: number;
      phase: string;
    }[];
    players: boolean[];
  };
}
const note = { time: 0, duration: 1, value: 55.12 };
const clean = select([note]);
assert.deepEqual(
  clean.players,
  [true, true, false, false, false],
  "selection excludes held-out players and accompaniment before loading annotations",
);
assert.equal(
  clean.windows.length,
  3,
  "sample attack, middle and late portions of an isolated note",
);
assert.deepEqual(
  clean.windows.map((window) => window.phase),
  ["attack", "middle", "late"],
);
for (const window of clean.windows) {
  assert.equal(window.midi, 55);
  assert.equal(window.sampleCount, 8192);
  assert.ok(window.sampleStart >= 4800);
  assert.ok(window.sampleStart + window.sampleCount <= 43200);
}
assert.equal(
  select([note, { time: 0, duration: 1, value: 55 }]).windows.length,
  0,
  "same-pitch overlap on another string is not isolated",
);
assert.equal(
  select([note, { time: 0, duration: 1, value: 95 }]).windows.length,
  0,
  "out-of-range notes still exclude contaminated windows",
);
const attackOverlap = select([note, { time: 0.15, duration: 0.01, value: 60 }]);
assert.deepEqual(
  attackOverlap.windows.map((window) => window.phase),
  ["middle", "late"],
  "short overlapping notes exclude the whole affected frame and guard",
);
assert.equal(
  select([{ time: 0, duration: 0.3, value: 55 }]).windows.length,
  0,
  "reject notes too short for a full guarded FFT window",
);
assert.equal(
  select([{ time: 1.9, duration: 1, value: 55 }]).windows.length,
  0,
  "never select beyond the audio file",
);
assert.ok(
  select([note], 44100, 88200).windows.every(
    (window) => window.sampleStart + window.sampleCount <= 39690,
  ),
  "selection uses the recording sample rate",
);
assert.ok(
  select([{ time: 0, duration: 3, value: 55 }], 48000, 48000).windows.every(
    (window) => window.sampleStart + window.sampleCount <= 43200,
  ),
  "retain the full guard inside truncated recordings",
);

const directory = mkdtempSync(join(tmpdir(), "cadence-note-archive-"));
try {
  writeFileSync(join(directory, "audio_mono-mic.zip"), "invalid archive");
  writeFileSync(join(directory, "annotation.zip"), "invalid archive");
  const invalid = spawnSync(
    "python3",
    ["tooling/prepare_note_windows.py", directory],
    { encoding: "utf8" },
  );
  assert.notEqual(invalid.status, 0, "reject unverified source archives");
  assert.match(invalid.stderr, /archive checksum mismatch/);
  assert.equal(
    existsSync(join(directory, "audio-solo-calibration")),
    false,
    "checksum failure cannot extract or select data",
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
