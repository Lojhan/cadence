import { readFileSync } from "node:fs";
import { strict as assert } from "poku";
import {
  initSync,
  TunerEngine,
} from "../../packages/audio-engine/src/index.ts";
import {
  centsDifference,
  TUNING_PRESETS,
} from "../../packages/music/src/index.ts";

const { memory } = initSync({
  module: readFileSync(
    new URL(
      "../../packages/audio-engine/generated/cadence_wasm_bg.wasm",
      import.meta.url,
    ),
  ),
});
const standard = TUNING_PRESETS[0];
assert.ok(standard, "Standard preset exists");
if (!standard) throw new Error("Missing standard preset");
const sampleRate = 44_100;

for (const string of standard.strings) {
  const engine = new TunerEngine(sampleRate);
  const samples = new Float32Array(memory.buffer, engine.input_pointer(), 2048);
  assert.equal(engine.frequency(), 0, "No pitch before listening");
  for (let block = 0; block < 8; block++) {
    for (let i = 0; i < samples.length; i++) {
      const t = (block * samples.length + i) / sampleRate;
      samples[i] = 0.12 * Math.sin(2 * Math.PI * string.targetHz * t);
    }
    engine.process(samples.length);
  }
  assert.ok(engine.confidence() > 0.7, `Stable pitch for ${string.note}`);
  const cents = Math.abs(centsDifference(engine.frequency(), string.targetHz));
  assert.ok(cents < 3, `${string.note}: ${cents.toFixed(2)} cents from target`);
  samples.fill(0);
  for (let block = 0; block < 5; block++) engine.process(samples.length);
  assert.equal(engine.frequency(), 0, "Silence clears stale note");
  engine.free();
}
