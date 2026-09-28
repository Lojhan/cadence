import { strict as assert } from "poku";
import { createApplication } from "../../packages/application/src/index.ts";
import { openSqlite } from "../../packages/db/src/sqlite/index.ts";

const tab = `Knockin' progression exercise
{chords: G - D -}
{rhythm: D8 U8 D4 P4}
e|--3---2---0---0--|
B|--0---3---1---1--|
G|--0---2---2---0--|
D|--0---0---2---2--|
A|--2-------0---3--|
E|--3--------------|`;
const store = await openSqlite(":memory:");
const app = createApplication(store, () => crypto.randomUUID());
const principal = { userId: "tab-test", mode: "local" as const };
try {
  await app.provision(principal);
  const catalogTab = (await app.library(principal)).find(
    (song) => song.id === "catalog:tab:knockin",
  );
  assert.equal(catalogTab?.tab?.events.length, 48);
  assert.equal(catalogTab?.revision, 2);
  assert.equal(catalogTab?.catalog, true);
  const saved = await app.saveSong(principal, {
    title: "Knockin' accompaniment practice",
    chart: tab,
  });
  assert.equal(saved.tab?.events.length, 4);
  assert.equal(saved.tab?.events[0]?.chord, "G");
  assert.equal(saved.tab?.events[1]?.rhythm?.stroke, "up");
  assert.deepEqual(
    saved.tab?.events[0]?.notes.map((note) => note.midi),
    [67, 59, 55, 50, 47, 43],
  );
  const loaded = (await app.library(principal)).find(
    (song) => song.id === saved.id,
  );
  assert.equal(loaded?.tab?.events.length, 4);
  assert.equal(loaded?.tab?.events[2]?.chord, "D");
  assert.equal(loaded?.tab?.events[3]?.rhythm?.stroke, "pluck");
  await app.savePosition(principal, {
    songId: saved.id,
    songRevision: saved.revision,
    index: 3,
    completed: false,
    revision: 0,
  });
  assert.equal((await app.position(principal, saved.id))?.index, 3);
  const archive = await app.exportData(principal);
  assert.equal(archive.songs.find((song) => song.key === saved.id)?.chart, tab);
} finally {
  await store.close();
}
