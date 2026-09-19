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
  for (const [label, release, extra, expected] of [
    ["required note release", 0.65, [], 0.65],
    [
      "octave overlap preserves the same pitch class",
      0.65,
      [{ time: 0.5, duration: 0.5, value: 64 }],
      1,
    ],
    [
      "a later note cannot bridge an earlier gap",
      0.65,
      [{ time: 0.7, duration: 0.5, value: 64 }],
      0.65,
    ],
    ["short full-tone intervals are excluded", 0.45, [], null],
  ] as const) {
    const released = [
      { time: 0, duration: 1.5, value: 48 },
      { time: 0, duration: release, value: 52 },
      { time: 0, duration: 1.5, value: 55 },
      ...extra,
    ];
    writeFileSync(
      join(root, "annotations/example.jams"),
      JSON.stringify({
        annotations: [{ namespace: "note_midi", data: released }],
      }),
    );
    const selected = spawnSync("python3", ["tooling/prepare-strums.py", root], {
      encoding: "utf8",
    });
    assert.equal(selected.status, 0, selected.stderr);
    const result = JSON.parse(
      readFileSync(join(root, "calibration-strums.json"), "utf8"),
    );
    if (expected === null) assert.equal(result.cases.length, 0, label);
    else {
      assert.equal(result.cases.length, 2, label);
      for (const row of result.cases)
        assert.equal(row.durationSeconds, expected, label);
    }
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}
