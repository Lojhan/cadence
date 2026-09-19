import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strict as assert } from "poku";
import wavefile from "wavefile";
import { readWave } from "../../tooling/evaluate-wasm.ts";

const { WaveFile } = wavefile;
const root = mkdtempSync(join(tmpdir(), "cadence-wave-decoding-"));
try {
  for (const [depth, input, expected] of [
    ["8", [0, 128, 192], [-1, 0, 0.5]],
    ["16", [-32768, 0, 16384], [-1, 0, 0.5]],
    ["24", [-8388608, 0, 4194304], [-1, 0, 0.5]],
    ["32", [-2147483648, 0, 1073741824], [-1, 0, 0.5]],
    ["32f", [-0.5, 0, 0.25], [-0.5, 0, 0.25]],
  ] as const) {
    const file = join(root, `${depth}.wav`);
    const wav = new WaveFile();
    wav.fromScratch(1, 48000, depth, [...input]);
    writeFileSync(file, wav.toBuffer());
    const decoded = readWave(file);
    assert.equal(decoded.sampleRate, 48000);
    assert.deepEqual(
      [...decoded.samples],
      [...expected],
      `${depth} preserves native signed PCM scaling`,
    );
  }
  const stereo = new WaveFile();
  stereo.fromScratch(2, 44100, "16", [
    [16384, 8192],
    [-16384, 8192],
  ]);
  const file = join(root, "stereo.wav");
  writeFileSync(file, stereo.toBuffer());
  assert.deepEqual(
    [...readWave(file).samples],
    [0, 0.25],
    "all channels contribute to the mono average",
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
