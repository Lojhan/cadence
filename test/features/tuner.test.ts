import { strict as assert } from "poku";
import { detectPitchAutocorrelation } from "../../packages/features/src/tuner.ts";
import {
  centsDifference,
  TUNING_PRESETS,
} from "../../packages/music/src/index.ts";

const standard = TUNING_PRESETS[0];
assert.ok(standard, "Standard preset exists");
if (!standard) throw new Error("Missing preset");
const sampleRate = 44100;
const bufferSize = 2048;

for (const string of standard.strings) {
  const targetHz = string.targetHz;
  const buffer = new Float32Array(bufferSize);

  // Generate pure sine wave at targetHz
  for (let i = 0; i < bufferSize; i++) {
    buffer[i] = 0.5 * Math.sin((2 * Math.PI * targetHz * i) / sampleRate);
  }

  const detected = detectPitchAutocorrelation(buffer, sampleRate);
  assert.ok(detected !== null, `Detected pitch for ${string.note}`);
  if (!detected) continue;
  assert.ok(detected.confidence > 0.8, `High confidence for ${string.note}`);

  const cents = Math.abs(centsDifference(detected.frequency, targetHz));
  assert.ok(
    cents < 3,
    `Pitch for ${string.note} (${targetHz} Hz) detected with < 3 cents error (got ${detected.frequency.toFixed(2)} Hz, error = ${cents.toFixed(2)}c)`,
  );
}

// Silence should return null
const silence = new Float32Array(bufferSize);
assert.equal(
  detectPitchAutocorrelation(silence, sampleRate),
  null,
  "Silence returns null",
);

// Noise below RMS threshold should return null
const noise = new Float32Array(bufferSize);
for (let i = 0; i < bufferSize; i++) {
  noise[i] = (Math.random() - 0.5) * 0.005; // tiny amplitude
}
assert.equal(
  detectPitchAutocorrelation(noise, sampleRate),
  null,
  "Quiet noise returns null",
);
