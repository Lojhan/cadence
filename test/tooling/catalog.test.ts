import { readFileSync } from "node:fs";
import { strict as assert } from "poku";
import { defaultSongs, parseChart } from "../../packages/music/src/index.ts";
import { buildCatalog } from "../../tooling/prepare-catalog.ts";

const candidates = [
  { rank: 1, title: "First", attribution: "Traditional", category: "folk" },
  { rank: 2, title: "Second", attribution: "", category: "folk" },
];
const prepared = buildCatalog(candidates, new Map([[1, "C G Am F"]]));
assert.deepEqual(prepared.pending, [2]);
assert.deepEqual(prepared.songs, [
  {
    id: "catalog:starter:001",
    title: "First",
    attribution: "Traditional",
    chords: ["C", "G", "Am", "F"],
    sourceChart: "C G Am F",
    tuning: "standard",
    revision: 1,
    catalog: true,
  },
]);
assert.throws(
  () => buildCatalog(candidates, new Map([[1, "C H7 G"]])),
  /Unsupported chord/,
);
assert.throws(
  () =>
    buildCatalog(
      [{ rank: 1, title: "First", attribution: "", category: "folk" }],
      new Map([[1, "C G"]]),
    ),
  /Missing attribution/,
);
assert.throws(
  () =>
    buildCatalog(
      [
        ...candidates,
        {
          rank: 1,
          title: "Again",
          attribution: "Traditional",
          category: "folk",
        },
      ],
      new Map(),
    ),
  /Duplicate rank/,
);

const fullList = JSON.parse(
  readFileSync(
    new URL("../../docs/catalog/candidates.json", import.meta.url),
    "utf8",
  ),
) as typeof candidates;
assert.equal(fullList.length, 100);
assert.deepEqual(
  fullList.map((candidate) => candidate.rank),
  Array.from({ length: 100 }, (_, index) => index + 1),
);
assert.equal(buildCatalog(fullList, new Map()).pending.length, 100);

const imported = defaultSongs.filter((song) =>
  song.id.startsWith("catalog:starter:"),
);
assert.equal(imported.length, 51);
assert.equal(new Set(imported.map((song) => song.id)).size, imported.length);
const importedReview = JSON.parse(
  readFileSync(
    new URL("../../docs/catalog/imported-review.json", import.meta.url),
    "utf8",
  ),
) as { rank: number; source_url: string; chord_count: number }[];
const pendingReview = JSON.parse(
  readFileSync(
    new URL("../../docs/catalog/pending-review.json", import.meta.url),
    "utf8",
  ),
) as { rank: number; reason: string }[];
assert.deepEqual(
  importedReview.map(({ rank }) => rank),
  imported.map((song) => Number(song.id.slice(-3))),
);
assert.deepEqual(
  pendingReview.map(({ rank }) => rank),
  fullList.filter(({ attribution }) => !attribution).map(({ rank }) => rank),
);
assert.equal(importedReview.length + pendingReview.length, 100);
for (const review of importedReview) {
  assert.ok(review.source_url.startsWith("https://"));
  const song = imported.find((item) =>
    item.id.endsWith(String(review.rank).padStart(3, "0")),
  );
  assert.equal(review.chord_count, song?.chords.length);
}
for (const review of pendingReview) assert.ok(review.reason.length > 20);
for (const song of imported) {
  assert.equal(song.catalog, true);
  assert.ok(song.attribution.trim());
  assert.ok(song.sourceChart);
  if (!song.sourceChart) throw new Error(`Missing chart for ${song.id}`);
  assert.deepEqual(parseChart(song.sourceChart).chords, song.chords);
  assert.ok(song.chords.length >= 5);
}
