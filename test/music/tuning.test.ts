import { createHash } from "node:crypto";
import { strict as assert } from "poku";
import {
  adaptVoicingForTuning,
  centsDifference,
  findClosestString,
  fingeringPitchClasses,
  getTuningPreset,
  isEmergencyBreakRisk,
  normalizeTuningId,
  parseChart,
  parseChord,
  TUNING_PRESETS,
  tuningDirection,
} from "../../packages/music/src/index.ts";

// 1. Presets validation
// Keep every shipped preset value stable while consolidating the source data.
assert.equal(
  createHash("sha256").update(JSON.stringify(TUNING_PRESETS)).digest("hex"),
  "306bc45654246e0841f8b8bc8fff0e462d515eeea535ae420908dcbd2abfb171",
);
assert.ok(TUNING_PRESETS.length >= 9, "At least 9 presets defined");
for (const preset of TUNING_PRESETS) {
  assert.equal(preset.strings.length, 6, `${preset.id} has 6 strings`);
  assert.equal(
    preset.openPitchClasses.length,
    6,
    `${preset.id} has 6 pitch classes`,
  );
  for (let i = 0; i < 6; i++) {
    const string = preset.strings[i];
    const openPitch = preset.openPitchClasses[i];
    assert.ok(string, "string exists");
    assert.ok(openPitch !== undefined, "open pitch exists");
    if (!string || openPitch === undefined) continue;
    assert.equal(string.stringIndex, i);
    assert.equal(string.stringNumber, 6 - i);
    assert.ok(string.targetHz > 50 && string.targetHz < 500);
    assert.equal(string.pitchClass, openPitch);
  }
}

// 2. Normalization
assert.equal(normalizeTuningId("Standard"), "standard");
assert.equal(normalizeTuningId("Drop D"), "drop_d");
assert.equal(normalizeTuningId("drop-d"), "drop_d");
assert.equal(normalizeTuningId("DADGAD"), "dadgad");
assert.equal(normalizeTuningId("Half Step Down"), "half_step_down");
assert.equal(normalizeTuningId("Eb"), "half_step_down");
assert.equal(normalizeTuningId("Full Step Down"), "full_step_down");
assert.equal(normalizeTuningId("Open D"), "open_d");
assert.equal(normalizeTuningId("Open G"), "open_g");
assert.equal(normalizeTuningId("Open E"), "open_e");
assert.equal(normalizeTuningId("unknown_xyz"), "standard");

// 3. Cents difference & directions
const e4Hz = 329.63;
assert.equal(Math.round(centsDifference(e4Hz, e4Hz)), 0);
// 1 octave higher (2x frequency) = 1200 cents
assert.equal(Math.round(centsDifference(e4Hz * 2, e4Hz)), 1200);
// 1 semitone higher (2^(1/12)x) = 100 cents
assert.equal(Math.round(centsDifference(e4Hz * 2 ** (1 / 12), e4Hz)), 100);
// Flat: tune up
assert.equal(tuningDirection(-15), "up");
assert.equal(tuningDirection(-4), "up");
// In tune
assert.equal(tuningDirection(0), "in_tune");
assert.equal(tuningDirection(2.5), "in_tune");
assert.equal(tuningDirection(-2.5), "in_tune");
// Sharp: tune down
assert.equal(tuningDirection(4), "down");
assert.equal(tuningDirection(20), "down");

// 4. Emergency Break Alerts
// High E string (index 5) tuned dangerously sharp (+60 cents)
assert.equal(
  isEmergencyBreakRisk(60, 5),
  true,
  "High E breaking tension flagged",
);
assert.equal(isEmergencyBreakRisk(40, 5), false, "Safe high E tension");
// Low E string (index 0) requires higher threshold
assert.equal(isEmergencyBreakRisk(70, 0), false, "Wound string safe at +70c");
assert.equal(
  isEmergencyBreakRisk(90, 0),
  true,
  "Excessive wound string tension flagged",
);

// 5. Closest string finder
const standard = getTuningPreset("standard");
const detectE2 = findClosestString(82.5, standard);
assert.equal(detectE2.stringIndex, 0);
assert.ok(Math.abs(detectE2.cents) < 5);

const detectE4 = findClosestString(325.0, standard);
assert.equal(detectE4.stringIndex, 5);
assert.ok(detectE4.cents < 0); // flat

// 6. Chart parsing with tuning directives
const chartWithTuning = parseChart(`
{title: Kashmir}
{tuning: DADGAD}
D G D
`);
assert.equal(chartWithTuning.tuning, "dadgad");
assert.deepEqual(chartWithTuning.chords, ["D", "G", "D"]);

const chartWithTune = parseChart(`
{tune: Drop D}
[D] Heavy [G] riff [A]
`);
assert.equal(chartWithTune.tuning, "drop_d");
assert.deepEqual(chartWithTune.chords, ["D", "G", "A"]);

const chartStandard = parseChart("C G Am F");
assert.equal(chartStandard.tuning, "standard");

// 7. Dynamic Voicing Adaptation
const gChordStandard = parseChord("G", "standard");
const gVoicingStandard = gChordStandard.voicings[0];
assert.ok(gVoicingStandard, "Voicing exists");
if (!gVoicingStandard) throw new Error("Missing voicing");
assert.deepEqual(gVoicingStandard.frets, [3, 2, 0, 0, 0, 3]);

// Test direct adaptVoicingForTuning
const directlyAdapted = adaptVoicingForTuning(gVoicingStandard, "drop_d");
assert.equal(directlyAdapted.frets[0], 5, "Direct adapt shifts string 0 to 5");

const gChordDropD = parseChord("G", "drop_d");
const gVoicingDropD = gChordDropD.voicings[0];
assert.ok(gVoicingDropD, "Voicing exists");
if (!gVoicingDropD) throw new Error("Missing voicing");
// In Drop D, string 0 is lowered by 2 semitones, so fret 3 shifts to fret 5!
assert.equal(gVoicingDropD.frets[0], 5, "Drop D String 0 fretted at 5 for G");
assert.deepEqual(
  [...fingeringPitchClasses(gVoicingDropD, "drop_d")].sort((a, b) => a - b),
  [2, 7, 11],
  "Drop D adapted G fingering sounds G major notes (G, B, D)",
);

// C chord in Drop D: string 0 is muted (-1), so it remains unchanged
const cChordDropD = parseChord("C", "drop_d");
const cVoicingDropD = cChordDropD.voicings[0];
assert.ok(cVoicingDropD, "Voicing exists");
if (!cVoicingDropD) throw new Error("Missing voicing");
assert.deepEqual(
  [...fingeringPitchClasses(cVoicingDropD, "drop_d")].sort((a, b) => a - b),
  [0, 4, 7],
  "C chord fingering sounds C major in Drop D",
);
