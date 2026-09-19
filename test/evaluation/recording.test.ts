import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { strict as assert } from "poku";
import {
  initSync,
  RecognitionEngine,
} from "../../packages/audio-engine/generated/cadence_wasm.js";

const fixture = new URL("../../fixtures/audio/guitarset/", import.meta.url);
const manifest = JSON.parse(
  readFileSync(new URL("manifest.json", fixture), "utf8"),
);
const result = spawnSync(
  "cargo",
  [
    "run",
    "--quiet",
    "--locked",
    "-p",
    "cadence-eval",
    "--",
    new URL("manifest.json", fixture).pathname,
  ],
  { encoding: "utf8" },
);
assert.equal(result.status, 0, result.stderr);
const report = JSON.parse(result.stdout);
for (const row of report.cases)
  assert.equal(row.matched, row.expectedMatch, row.id);

const { memory } = initSync({
  module: readFileSync(
    new URL(
      "../../packages/audio-engine/generated/cadence_wasm_bg.wasm",
      import.meta.url,
    ),
  ),
});
for (const [index, testCase] of manifest.cases.entries()) {
  const wave = readFileSync(new URL(testCase.file, fixture));
  const provenance = manifest.files.find(
    (entry: { file: string }) => entry.file === testCase.file,
  );
  assert.equal(
    createHash("sha256").update(wave).digest("hex"),
    provenance.sha256,
  );
  // Fixtures are mono PCM16. Walk RIFF chunks so metadata is never audio.
  let data: Buffer | undefined;
  let rate = 0;
  for (let offset = 12; offset + 8 <= wave.length; ) {
    const size = wave.readUInt32LE(offset + 4);
    const chunk = wave.subarray(offset + 8, offset + 8 + size);
    const tag = wave.toString("ascii", offset, offset + 4);
    if (tag === "fmt ") {
      assert.equal(chunk.readUInt16LE(0), 1);
      assert.equal(chunk.readUInt16LE(2), 1);
      assert.equal(chunk.readUInt16LE(14), 16);
      rate = chunk.readUInt32LE(4);
    }
    if (tag === "data") data = chunk;
    offset += 8 + size + (size % 2);
  }
  assert.ok(data);
  if (!data) throw new Error("Fixture has no PCM data");
  const engine = new RecognitionEngine(rate, 1);
  engine.arm(testCase.targetMask);
  let consumed = 0;
  let latency: number | null = null;
  while (consumed < data.length / 2) {
    const count = Math.min(2048, data.length / 2 - consumed);
    const input = new Float32Array(
      memory.buffer,
      engine.input_pointer(),
      count,
    );
    for (let sample = 0; sample < count; sample++)
      input[sample] = data.readInt16LE((consumed + sample) * 2) / 32768;
    consumed += count;
    if (engine.process(count)) {
      latency = (consumed / rate) * 1000;
      break;
    }
  }
  engine.free();
  assert.equal(
    latency,
    report.cases[index].latencyMs,
    `native/WASM parity: ${testCase.id}`,
  );
}
