import { strict as assert } from "poku";
import { defaultSongs, parseTab } from "../../packages/music/src/index.ts";

const expected = [
  ["catalog:tab:knockin", "Knockin' on Heaven's Door", 24],
  ["catalog:tab:amazing-grace", "Amazing Grace", 12],
  ["catalog:tab:saints", "When the Saints Go Marching In", 16],
  ["catalog:tab:jingle-bells", "Jingle Bells", 12],
] as const;

for (const [id, title, minimumEvents] of expected) {
  const song = defaultSongs.find((entry) => entry.id === id);
  assert.ok(song, `${title} is in the shared catalog`);
  if (!song?.sourceChart) throw new Error(`${title} has no source chart`);
  assert.ok(song.title.includes(title));
  assert.ok(song.catalog);
  assert.equal(song.revision, 2, `${title} upgrades existing catalog rows`);
  assert.ok(song.sourceChart);
  const tab = parseTab(song.sourceChart);
  assert.ok(
    tab.events.length >= minimumEvents,
    `${title} has a full practice sequence`,
  );
  assert.equal(song.chords.length, tab.events.length);
  assert.deepEqual(song.tab?.events, tab.events);
  assert.ok(tab.staves.length > 1, `${title} spans multiple staves`);
  assert.ok(tab.events[0]?.chord);
  assert.equal(tab.events[1]?.chord, undefined);
  assert.ok(
    tab.events.every((event) => event.rhythm?.value === 8),
    `${title} includes an explicit eighth-note stroke for every event`,
  );
}

const knocking = defaultSongs.find((song) => song.id === "catalog:tab:knockin");
assert.deepEqual(
  knocking?.tab?.events[0]?.notes.map((note) => note.midi),
  [67, 59, 55, 50, 47, 43],
);
