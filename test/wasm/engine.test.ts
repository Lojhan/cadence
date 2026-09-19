import { readFile } from "node:fs/promises";
import { strict as assert } from "poku";

const { initSync, RecognitionEngine } = await import(
  "../../packages/audio-engine/generated/cadence_wasm.js"
);
const { memory } = initSync({
  module: await readFile(
    new URL(
      "../../packages/audio-engine/generated/cadence_wasm_bg.wasm",
      import.meta.url,
    ),
  ),
});
const engine = new RecognitionEngine(48000, 1);
engine.arm(145);
let matches = 0;
const initialBytes = memory.buffer.byteLength;
for (let block = 0; block < 50; block++) {
  const input = new Float32Array(memory.buffer, engine.input_pointer(), 2048);
  for (let j = 0; j < input.length; j++)
    input[j] = [48, 52, 55, 60, 64].reduce(
      (sum, note) =>
        sum +
        0.08 *
          Math.sin(
            (2 * Math.PI * 440 * 2 ** ((note - 69) / 12) * (block * 2048 + j)) /
              48000,
          ),
      0,
    );
  if (engine.process(2048)) matches++;
}
assert.equal(matches, 1, "WASM recognizes the native fixture once");
assert.equal(
  memory.buffer.byteLength,
  initialBytes,
  "processing does not grow WASM memory",
);
assert.throws(() => engine.process(2049));
engine.reset();
assert.equal(engine.process(2048), false);
engine.free();
