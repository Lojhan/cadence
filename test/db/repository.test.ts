import { createHash } from "node:crypto";
import { strict as assert } from "poku";
import { createApplication } from "../../packages/application/src/index.ts";
import { openPostgres } from "../../packages/db/src/postgres/index.ts";
import { repository } from "../../packages/db/src/repository.ts";
import { openSqlite } from "../../packages/db/src/sqlite/index.ts";

const store = process.env.CADENCE_TEST_DATABASE_URL
  ? await openPostgres(process.env.CADENCE_TEST_DATABASE_URL, true)
  : await openSqlite(":memory:");
const app = createApplication(store, () => crypto.randomUUID());
const alice = {
  userId: `alice-${crypto.randomUUID()}`,
  mode: "local" as const,
};
const bob = { userId: `bob-${crypto.randomUUID()}`, mode: "hosted" as const };
try {
  await app.provision(alice);
  await app.provision(bob);
  const initial = await app.library(alice);
  assert.ok(initial.length >= 4);
  const shared = {
    id: "catalog:test-shared",
    title: "Shared practice",
    attribution: "Cadence test",
    chords: ["C", "G"],
    sourceChart: "C G",
    tuning: "standard",
    catalog: true,
    revision: 1,
  };
  let catalogQueries = 0;
  const cachedCatalog = repository(async () => {
    catalogQueries++;
    return [
      {
        hash: createHash("sha256")
          .update(JSON.stringify([shared]))
          .digest("hex"),
      },
    ];
  });
  await cachedCatalog.seedCatalog([shared]);
  assert.equal(
    catalogQueries,
    1,
    "an unchanged catalog avoids song writes on every hosted request",
  );
  await store.transaction((repo) => repo.seedCatalog([shared]));
  assert.deepEqual(
    (await app.library(bob)).find((item) => item.id === shared.id)?.chords,
    ["C", "G"],
    "one catalog entry is visible to every user",
  );
  await app.savePosition(alice, {
    songId: shared.id,
    songRevision: 1,
    index: 1,
    completed: false,
    revision: 0,
  });
  await store.transaction((repo) =>
    repo.seedCatalog([
      { ...shared, chords: ["Am", "F"], sourceChart: "Am F", revision: 2 },
    ]),
  );
  assert.deepEqual(
    (await app.library(alice)).find((item) => item.id === shared.id)?.chords,
    ["Am", "F"],
    "a new catalog revision updates the shared entry",
  );
  assert.equal(await app.position(alice, shared.id), null);
  await app.savePosition(alice, {
    songId: shared.id,
    songRevision: 2,
    index: 0,
    completed: false,
    revision: 0,
  });
  await app.provision(alice);
  assert.equal(
    (await app.library(alice)).length,
    initial.length + 1,
    "catalog seed is idempotent",
  );
  const song = await app.saveSong(alice, {
    title: "My chords",
    chart: "C G Am F",
  });
  assert.equal(
    (await app.library(bob)).some((item) => item.id === song.id),
    false,
    "private songs are isolated",
  );
  await assert.rejects(
    () =>
      app.saveSong(bob, {
        title: "stolen",
        chart: "C",
        id: song.id,
        revision: 1,
      }),
    /not found/i,
  );
  await assert.rejects(() => app.deleteSong(bob, song.id, 1), /not found/i);
  const updated = await app.saveSong(alice, {
    id: song.id,
    revision: 1,
    title: "Updated",
    chart: "Am F",
  });
  assert.equal(updated.revision, 2);
  await assert.rejects(
    () =>
      app.saveSong(alice, {
        id: song.id,
        revision: 1,
        title: "stale",
        chart: "C",
      }),
    /changed/i,
  );
  await assert.rejects(() =>
    app.saveSong(alice, {
      id: song.id,
      revision: 2,
      title: "bad",
      chart: "[H7]",
    }),
  );
  assert.deepEqual(
    (await app.library(alice)).find((item) => item.id === song.id)?.chords,
    ["Am", "F"],
  );
  const prefs = await app.preferences(alice);
  const saved = await app.savePreferences(alice, {
    revision: prefs.revision,
    values: { ...prefs.values, hand: "left" },
  });
  assert.equal(saved.values.hand, "left");
  assert.equal((await app.preferences(bob)).values.hand, "right");
  await assert.rejects(
    () =>
      app.savePreferences(alice, {
        revision: prefs.revision,
        values: prefs.values,
      }),
    /changed/i,
  );
  await assert.rejects(
    () =>
      app.savePosition(alice, {
        songId: song.id,
        songRevision: 1,
        index: 0,
        completed: false,
        revision: 0,
      }),
    /changed/i,
  );
  await app.savePosition(alice, {
    songId: song.id,
    songRevision: 2,
    index: 1,
    completed: false,
    revision: 0,
  });
  await assert.rejects(() =>
    app.savePosition(alice, {
      songId: song.id,
      songRevision: 2,
      index: 2,
      completed: false,
      revision: 1,
    }),
  );
  await assert.rejects(
    () =>
      store.transaction(async (repo) => {
        await repo.createUser("rollback-user");
        throw new Error("abort");
      }),
    /abort/,
  );
  assert.equal(
    await store.transaction((repo) => repo.hasUser("rollback-user")),
    false,
    "transactions roll back",
  );
  const races = await Promise.allSettled([
    app.savePreferences(alice, {
      revision: saved.revision,
      values: saved.values,
    }),
    app.savePreferences(alice, {
      revision: saved.revision,
      values: saved.values,
    }),
  ]);
  assert.equal(
    races.filter((result) => result.status === "fulfilled").length,
    1,
    "concurrent updates cannot overwrite each other",
  );
  const archive = await app.exportData(alice);
  assert.equal(
    archive.songs[0]?.position?.index,
    1,
    "export preserves progress",
  );
  await app.importData(bob, archive);
  assert.equal(
    (await app.library(bob)).filter((item) => !item.catalog).length,
    1,
  );
  const importedSong = (await app.library(bob)).find((item) => !item.catalog);
  if (!importedSong) throw new Error("Missing imported song");
  assert.equal(
    (await app.position(bob, importedSong.id))?.index,
    1,
    "import remaps progress to new IDs",
  );
  const defaultSong = initial[0];
  if (!defaultSong) throw new Error("Missing catalog");
  await assert.rejects(
    () => app.deleteSong(alice, defaultSong.id, 1),
    /read.only/i,
  );
  await app.deleteSong(alice, song.id, 2);
  assert.equal(
    (await app.library(alice)).some((item) => item.id === song.id),
    false,
  );
  await assert.rejects(() => app.library({ userId: "", mode: "local" }));
} finally {
  await store.close();
}
