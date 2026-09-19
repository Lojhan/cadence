import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strict as assert } from "poku";

const directory = mkdtempSync(join(tmpdir(), "cadence-confusions-"));
try {
  const input = join(directory, "strums.json");
  const output = join(directory, "confusions.json");
  const correct = {
    id: "example:0:correct",
    file: "example.wav",
    targetMask: 145,
    expectedMatch: true,
    startSeconds: 0,
    durationSeconds: 1,
    split: "calibration",
    chord: "C",
  };
  writeFileSync(
    input,
    JSON.stringify({
      cases: [
        correct,
        {
          ...correct,
          id: "example:0:wrong-quality",
          targetMask: 137,
          expectedMatch: false,
        },
        {
          ...correct,
          id: "example:1:correct",
          targetMask: 2193,
          chord: "Cmaj7",
        },
      ],
    }),
  );
  const result = spawnSync(
    "python3",
    ["tooling/prepare-confusions.py", input, output],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  const cases = JSON.parse(readFileSync(output, "utf8"))
    .cases as (typeof correct & { targetChord?: string })[];
  assert.equal(cases.filter((row) => row.expectedMatch).length, 2);
  assert.ok(
    cases.some((row) => !row.expectedMatch && row.targetMask === 137),
    "C minor is a negative target",
  );
  assert.ok(
    cases.some((row) => !row.expectedMatch && row.targetMask === 529),
    "relative minor is a negative target",
  );
  assert.ok(
    cases.some((row) => !row.expectedMatch && row.targetMask === 2193),
    "an added major seventh is a negative target",
  );
  assert.equal(
    new Set(cases.map((row) => row.id)).size,
    cases.length,
    "negative cases are not duplicated",
  );
  assert.ok(
    cases.some(
      (row) =>
        row.id.startsWith("example:1:") &&
        !row.expectedMatch &&
        row.targetMask === 145,
    ),
    "dropping the seventh is also a negative target",
  );
  assert.ok(
    cases.every(
      (row) =>
        row.expectedMatch ||
        row.targetMask !== (row.id.startsWith("example:0:") ? 145 : 2193),
    ),
  );
  assert.ok(
    cases.every((row) => row.startSeconds === 0 && row.durationSeconds === 1),
    "confusions use the same verified audio interval",
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
