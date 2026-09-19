import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strict as assert } from "poku";

const directory = mkdtempSync(join(tmpdir(), "cadence-eval-"));
const rate = 48000,
  count = rate * 2;
const wave = Buffer.alloc(44 + count * 2);
wave.write("RIFF");
wave.writeUInt32LE(wave.length - 8, 4);
wave.write("WAVEfmt ", 8);
wave.writeUInt32LE(16, 16);
wave.writeUInt16LE(1, 20);
wave.writeUInt16LE(1, 22);
wave.writeUInt32LE(rate, 24);
wave.writeUInt32LE(rate * 2, 28);
wave.writeUInt16LE(2, 32);
wave.writeUInt16LE(16, 34);
wave.write("data", 36);
wave.writeUInt32LE(count * 2, 40);
for (let i = 0; i < count; i++) {
  const sample = [48, 52, 55, 60, 64].reduce(
    (sum, note) =>
      sum +
      0.08 * Math.sin((2 * Math.PI * 440 * 2 ** ((note - 69) / 12) * i) / rate),
    0,
  );
  wave.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
}
try {
  writeFileSync(join(directory, "chord.wav"), wave);
  const cases = [
    {
      id: "correct",
      file: "chord.wav",
      targetMask: 145,
      expectedMatch: true,
      startSeconds: 0,
      durationSeconds: 2,
      split: "engineering",
      chord: "C",
      targetChord: "C",
    },
    {
      id: "wrong",
      file: "chord.wav",
      targetMask: 137,
      expectedMatch: false,
      startSeconds: 0,
      durationSeconds: 2,
      split: "engineering",
      chord: "C",
      targetChord: "Cm",
    },
  ];
  writeFileSync(join(directory, "manifest.json"), JSON.stringify({ cases }));
  const result = spawnSync(
    "cargo",
    [
      "run",
      "--quiet",
      "--locked",
      "-p",
      "cadence-eval",
      "--",
      join(directory, "manifest.json"),
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.cases[0].matched, true);
  assert.equal(report.cases[1].matched, false);
  assert.ok(report.cases[0].latencyMs > 0);
  assert.equal(report.summary.truePositive, 1);
  assert.equal(report.summary.falsePositive, 0);
  for (const profile of ["gentle", "precise"]) {
    const evaluation = spawnSync(
      "cargo",
      [
        "run",
        "--quiet",
        "--locked",
        "-p",
        "cadence-eval",
        "--",
        join(directory, "manifest.json"),
        profile,
      ],
      { encoding: "utf8" },
    );
    assert.equal(evaluation.status, 0, evaluation.stderr);
    const measured = JSON.parse(evaluation.stdout);
    assert.equal(
      measured.profile,
      profile,
      "evaluation uses the requested matching profile",
    );
    assert.equal(measured.summary.truePositive, 1);
    assert.equal(measured.summary.falsePositive, 0);
  }
  assert.equal(
    report.trace,
    undefined,
    "ordinary evaluation emits no diagnostic trace",
  );
  const traced = spawnSync(
    "cargo",
    [
      "run",
      "--quiet",
      "--locked",
      "-p",
      "cadence-eval",
      "--",
      join(directory, "manifest.json"),
      "balanced",
      "--trace-case",
      "correct",
    ],
    { encoding: "utf8" },
  );
  assert.equal(traced.status, 0, traced.stderr);
  const diagnostics = JSON.parse(traced.stdout);
  assert.deepEqual(
    diagnostics.cases,
    report.cases,
    "tracing preserves every recognition result and latency",
  );
  assert.deepEqual(diagnostics.summary, report.summary);
  assert.equal(diagnostics.trace.caseId, "correct");
  const frames = diagnostics.trace.frames as {
    sampleEnd: number;
    timeMs: number;
    chroma: number[];
    matched: boolean;
  }[];
  assert.ok(frames.length > 0, "trace contains actual engine feature frames");
  assert.equal(frames.at(-1)?.timeMs, report.cases[0].latencyMs);
  assert.equal(frames.filter((frame) => frame.matched).length, 1);
  for (const [i, frame] of frames.entries()) {
    assert.equal(frame.chroma.length, 12);
    assert.ok(
      frame.chroma.every((value) => Number.isFinite(value) && value >= 0),
    );
    assert.ok(frame.sampleEnd > (frames[i - 1]?.sampleEnd ?? 0));
    const ordered = frame.chroma
      .map((energy, note) => ({ energy, note }))
      .sort((a, b) => b.energy - a.energy)
      .slice(0, 3)
      .map((value) => value.note)
      .sort((a, b) => a - b);
    assert.deepEqual(
      ordered,
      [0, 4, 7],
      "diagnostics expose the performed C/E/G pitch classes",
    );
  }
  const unknownTrace = spawnSync(
    "cargo",
    [
      "run",
      "--quiet",
      "--locked",
      "-p",
      "cadence-eval",
      "--",
      join(directory, "manifest.json"),
      "balanced",
      "--trace-case",
      "missing",
    ],
    { encoding: "utf8" },
  );
  assert.notEqual(
    unknownTrace.status,
    0,
    "unknown trace cases cannot silently emit empty evidence",
  );
  const invalidProfile = spawnSync(
    "cargo",
    [
      "run",
      "--quiet",
      "--locked",
      "-p",
      "cadence-eval",
      "--",
      join(directory, "manifest.json"),
      "unknown",
    ],
    { encoding: "utf8" },
  );
  assert.notEqual(
    invalidProfile.status,
    0,
    "unknown profiles cannot silently use Balanced",
  );

  assert.equal(
    report.confusions["engineering:C→Cm"].trueNegative,
    1,
    "confusion report separates performed and target chords",
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
