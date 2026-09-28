import { strict as assert } from "poku";
import { parseTab } from "../../packages/music/src/tab.ts";

// An original, short accompaniment exercise using the harmonic loop of
// Knockin' on Heaven's Door. It contains no melody, lyrics, or copied tab.
const knockingExercise = `G / D / Am / C
e|----3-------2-------0-------0---|
B|----0-------3-------1-------1---|
G|----0-------2-------2-------0---|
D|----0-------0-------2-------2---|
A|----2---------------0-------3---|
E|----3---------------------------|

Repeat
e|----3-------2-------0-------0---|
B|----0-------3-------1-------1---|
G|----0-------2-------2-------0---|
D|----0-------0-------2-------2---|
A|----2---------------0-------3---|
E|----3---------------------------|`;

const tab = parseTab(knockingExercise);
assert.equal(tab.events.length, 8);
assert.deepEqual(
  tab.events[0]?.notes.map((note) => [note.string, note.fret, note.midi]),
  [
    [1, 3, 67],
    [2, 0, 59],
    [3, 0, 55],
    [4, 0, 50],
    [5, 2, 47],
    [6, 3, 43],
  ],
);
assert.equal(tab.events[4]?.staff, 1);
assert.equal(tab.staves.length, 2);

const annotated = parseTab(`{chords: G - D -}
{rhythm: D8 U8 D4 P4}
e|--3---3---2---2--|
B|--0---0---3---3--|
G|--0---0---2---2--|
D|--0---0---0---0--|
A|--2---2----------|
E|--3---3----------|`);
assert.deepEqual(
  annotated.events.map((event) => event.chord),
  ["G", undefined, "D", undefined],
);
assert.deepEqual(
  annotated.events.map((event) => event.rhythm),
  [
    { stroke: "down", value: 8 },
    { stroke: "up", value: 8 },
    { stroke: "down", value: 4 },
    { stroke: "pluck", value: 4 },
  ],
);
assert.throws(
  () =>
    parseTab(`{rhythm: D8 U8}
e|--3---2---0--|
B|--0---3---1--|
G|--0---2---2--|
D|--0---0---2--|
A|--2-------0--|
E|--3----------|`),
  /rhythm.*event/i,
);

const highFrets = parseTab(
  `e|--12--|\nB|------|\nG|------|\nD|------|\nA|------|\nE|------|`,
);
assert.equal(highFrets.events[0]?.notes[0]?.midi, 76);
const dropD = parseTab(
  `{tuning: drop_d}\ne|-----|\nB|-----|\nG|-----|\nD|-----|\nA|-----|\nE|--0--|`,
);
assert.equal(dropD.events[0]?.notes[0]?.midi, 38);
assert.throws(
  () =>
    parseTab(
      `{tuning: mystery}\ne|--0--|\nB|-----|\nG|-----|\nD|-----|\nA|-----|\nE|-----|`,
    ),
  /Unsupported tab tuning/,
);
assert.throws(() => parseTab("e|--3--|\nB|--0--|"), /six strings/i);
assert.throws(
  () => parseTab(`e|--3--|\nB|--0---|\nG|--0--|\nD|--0--|\nA|--2--|\nE|--3--|`),
  /aligned/i,
);
assert.throws(
  () =>
    parseTab(
      `e|--3h5--|\nB|-------|\nG|-------|\nD|-------|\nA|-------|\nE|-------|`,
    ),
  /unsupported/i,
);
