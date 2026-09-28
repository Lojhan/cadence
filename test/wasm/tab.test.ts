import { readFile } from "node:fs/promises";
import { strict as assert } from "poku";
import { defaultSongs } from "../../packages/music/src/index.ts";

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
const rate = 48000;
const engine = new RecognitionEngine(rate, 1);
function feed(notes: number[], seconds: number) {
  let matches = 0;
  const samples = Math.floor(rate * seconds);
  for (let offset = 0; offset < samples; offset += 2048) {
    const length = Math.min(2048, samples - offset);
    const input = new Float32Array(memory.buffer, engine.input_pointer(), 2048);
    for (let i = 0; i < length; i++)
      input[i] = notes.reduce(
        (sum, midi) =>
          sum +
          0.08 *
            Math.sin(
              (2 * Math.PI * 440 * 2 ** ((midi - 69) / 12) * (offset + i)) /
                rate,
            ),
        0,
      );
    if (engine.process(length)) matches++;
  }
  return matches;
}
engine.arm_note(43);
assert.equal(feed([55], 0.6), 0, "wrong octave is rejected by WASM");
assert.equal(feed([], 0.2), 0);
assert.equal(feed([43], 0.7), 1, "single tab note matches once");
feed([], 0.2);

// An original accompaniment exercise for Knockin' on Heaven's Door.
for (const notes of [
  [43, 47, 50, 55, 59, 67],
  [50, 57, 62, 66],
  [45, 52, 57, 60, 64],
  [48, 52, 55, 60, 64],
]) {
  engine.arm_notes(new Uint8Array(notes));
  assert.equal(feed(notes, 0.8), 1, `WASM matches ${notes.join(",")}`);
  feed([], 0.2);
}
for (const song of defaultSongs.filter((item) =>
  item.id.startsWith("catalog:tab:"),
)) {
  for (const event of song.tab?.events ?? []) {
    const notes = event.notes.map((note) => note.midi);
    if (notes.length === 1) engine.arm_note(notes[0] ?? 0);
    else engine.arm_notes(new Uint8Array(notes));
    assert.equal(
      feed(notes, 0.8),
      1,
      `${song.title} event ${event.staff}:${event.column}`,
    );
    feed([], 0.2);
  }
}
engine.free();
