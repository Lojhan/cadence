import { strict as assert } from "poku";
import {
  fingeringPitchClasses,
  parseChart,
  parseChord,
} from "../../packages/music/src/index.ts";

assert.deepEqual(parseChord("Cmaj7").notes, [0, 4, 7, 11]);
assert.deepEqual(parseChord("Cm7").notes, [0, 3, 7, 10]);
assert.deepEqual(parseChord("Bb").notes, [10, 2, 5]);
assert.throws(() => parseChord("Cgarbage"), /Unsupported chord/);
assert.throws(() => parseChord("H7"), /Unsupported chord/);
assert.deepEqual(parseChart("[C] A lovely day [Am]\n[F] Home [G]").chords, [
  "C",
  "Am",
  "F",
  "G",
]);
assert.deepEqual(parseChart("C G Am F\nA lovely day\nC G").chords, [
  "C",
  "G",
  "Am",
  "F",
  "C",
  "G",
]);
assert.deepEqual(parseChart("|: C G :| Am Am").chords, [
  "C",
  "G",
  "C",
  "G",
  "Am",
  "Am",
]);
assert.throws(() => parseChart("[C] [H7]"), /Unsupported chord/);
assert.throws(() => parseChart("C H7 G"), /Unsupported chord/);
assert.throws(() => parseChart("nothing to play"), /No chords/);
assert.throws(() => parseChart("[C"), /Unclosed/);
assert.throws(() => parseChart("|: C G"), /Unclosed/);
assert.throws(() => parseChart("C ".repeat(10001)), /limit/);
for (const root of [
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
]) {
  for (const quality of ["", "m", "7", "m7", "maj7"]) {
    const name = root + quality;
    const chord = parseChord(name);
    for (const voicing of chord.voicings)
      assert.deepEqual(
        [...fingeringPitchClasses(voicing)].sort((a, b) => a - b),
        [...chord.notes].sort((a, b) => a - b),
        `${name} fingering sounds the declared chord`,
      );
  }
}
assert.deepEqual(parseChart("C G\nA day in C\nAm F").chords, [
  "C",
  "G",
  "Am",
  "F",
]);
