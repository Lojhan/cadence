import { strict as assert } from "poku";
import { createApplication } from "../../packages/application/src/index.ts";
import { openPostgres } from "../../packages/db/src/postgres/index.ts";
import { openSqlite } from "../../packages/db/src/sqlite/index.ts";

const store = process.env.CADENCE_TEST_DATABASE_URL
  ? await openPostgres(process.env.CADENCE_TEST_DATABASE_URL, true)
  : await openSqlite(":memory:");
const app = createApplication(store, () => crypto.randomUUID());
const alice = { userId: crypto.randomUUID(), mode: "local" as const };
const bob = { userId: crypto.randomUUID(), mode: "hosted" as const };
try {
  await app.provision(alice);
  await app.provision(bob);
  const catalog = (await app.library(alice)).find(
    (song) => song.id === "catalog:four",
  );
  if (!catalog) throw new Error("Missing catalog");
  await app.savePosition(alice, {
    songId: catalog.id,
    songRevision: catalog.revision,
    index: 2,
    completed: false,
    revision: 0,
  });
  await app.savePosition(bob, {
    songId: catalog.id,
    songRevision: catalog.revision,
    index: 0,
    completed: false,
    revision: 0,
  });
  const archive = await app.exportData(alice);
  assert.equal(
    archive.version,
    2,
    "portable archives include catalog progress in version 2",
  );
  await app.importData(bob, archive);
  assert.equal(
    (await app.position(bob, catalog.id))?.index,
    2,
    "default-repertoire progress transfers between users",
  );
  assert.equal(
    (await app.position(bob, catalog.id))?.revision,
    2,
    "import respects the destination revision",
  );
  const legacy = {
    version: 1,
    preferences: archive.preferences,
    songs: [
      {
        title: "Legacy music",
        chart: "C G",
        key: "old-song",
        position: { index: 1, completed: false },
      },
    ],
  };
  await app.importData(bob, legacy);
  const imported = (await app.library(bob)).find(
    (song) => song.title === "Legacy music",
  );
  if (!imported) throw new Error("Legacy song was not imported");
  assert.equal(
    (await app.position(bob, imported.id))?.index,
    1,
    "version 1 archives retain their progress",
  );
  await app.importData(bob, {
    ...archive,
    catalogPositions: [
      { songId: catalog.id, chords: ["Em"], index: 0, completed: true },
      {
        songId: imported.id,
        chords: imported.chords,
        index: 0,
        completed: true,
      },
    ],
  });
  assert.equal(
    (await app.position(bob, catalog.id))?.index,
    2,
    "a changed catalog sequence does not overwrite valid destination progress",
  );
  assert.equal(
    (await app.position(bob, imported.id))?.index,
    1,
    "catalog references cannot overwrite personal-song progress",
  );
  await assert.rejects(
    () =>
      app.importData(bob, {
        ...archive,
        catalogPositions: [
          {
            songId: catalog.id,
            chords: catalog.chords,
            index: 999,
            completed: false,
          },
        ],
      }),
    /position/i,
  );
  assert.equal(
    (await app.position(bob, catalog.id))?.index,
    2,
    "invalid archives leave existing progress intact",
  );
  const before = await app.position(bob, catalog.id);
  const duplicate = {
    songId: catalog.id,
    chords: catalog.chords,
    index: 0,
    completed: false,
  };
  const beforeCount = (await app.library(bob)).length;
  await assert.rejects(
    () =>
      app.importData(bob, {
        ...archive,
        songs: [{ title: "Must roll back", chart: "C G" }],
        catalogPositions: [duplicate, duplicate],
      }),
    /duplicate/i,
  );
  assert.deepEqual(
    await app.position(bob, catalog.id),
    before,
    "duplicate catalog entries roll back earlier progress writes",
  );
  assert.equal(
    (await app.library(bob)).length,
    beforeCount,
    "archive rollback includes personal songs",
  );
  await app.importData(bob, {
    version: 1,
    preferences: { ...archive.preferences, lastSongId: "catalog:missing" },
    songs: [],
  });
  assert.equal(
    (await app.preferences(bob)).values.lastSongId,
    "catalog:four",
    "unavailable catalog references restore a usable default",
  );
} finally {
  await store.close();
}
