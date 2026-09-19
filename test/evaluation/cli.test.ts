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
    },
    {
      id: "wrong",
      file: "chord.wav",
      targetMask: 137,
      expectedMatch: false,
      startSeconds: 0,
      durationSeconds: 2,
      split: "engineering",
      chord: "Cm",
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
} finally {
  rmSync(directory, { recursive: true, force: true });
}
