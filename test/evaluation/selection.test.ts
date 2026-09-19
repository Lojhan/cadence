import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strict as assert } from "poku";

const root = mkdtempSync(join(tmpdir(), "cadence-strum-selection-"));
try {
  mkdirSync(join(root, "annotations"));
  const notes = [48, 52, 55].map((value) => ({
    time: 0,
    duration: 1.5,
    value,
  }));
  // C changes to C minor when Eb arrives. Neither target may be evaluated
  // against the original C label after that change.
  notes.push({ time: 0.9, duration: 0.5, value: 51 });
  writeFileSync(
    join(root, "annotations/example.jams"),
    JSON.stringify({ annotations: [{ namespace: "note_midi", data: notes }] }),
  );
  const base = {
    file: "audio/example_mic.wav",
    startSeconds: 0,
    durationSeconds: 1.5,
    split: "calibration",
    chord: "C",
  };
  writeFileSync(
    join(root, "calibration.json"),
    JSON.stringify({
      cases: [
        {
          ...base,
          id: "example:0:correct",
          targetMask: 145,
          expectedMatch: true,
        },
        {
          ...base,
          id: "example:0:wrong-quality",
          targetMask: 137,
          expectedMatch: false,
        },
      ],
    }),
  );
  writeFileSync(join(root, "held-out.json"), JSON.stringify({ cases: [] }));
  const run = spawnSync("python3", ["tooling/prepare-strums.py", root], {
    encoding: "utf8",
  });
  assert.equal(run.status, 0, run.stderr);
  const output = JSON.parse(
    readFileSync(join(root, "calibration-strums.json"), "utf8"),
  );
  assert.equal(output.cases.length, 2);
  for (const row of output.cases)
    assert.equal(
      row.durationSeconds,
      0.9,
      "labels end before the played chord changes",
    );
} finally {
  rmSync(root, { recursive: true, force: true });
}
