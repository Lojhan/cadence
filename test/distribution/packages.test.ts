import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "poku";
import {
  engineVersion,
  protocolVersion,
} from "../../packages/audio-engine/src/index.ts";
import { defaultSongs } from "../../packages/music/src/index.ts";

const names = [
  "contracts",
  "core",
  "music",
  "application",
  "db",
  "audio-engine",
  "audio-browser",
  "ui",
  "features",
];
for (const name of names) {
  const root = resolve("artifacts/packages", name);
  assert.ok(existsSync(`${root}/package.json`), `${name} has a distribution`);
  const manifest = JSON.parse(readFileSync(`${root}/package.json`, "utf8"));
  assert.equal(manifest.license, "MIT");
  assert.ok(existsSync(`${root}/LICENSE`));
  for (const entry of Object.values(manifest.exports) as (
    | string
    | { types: string; import: string }
  )[]) {
    if (typeof entry === "string") assert.ok(existsSync(resolve(root, entry)));
    else {
      assert.ok(
        existsSync(resolve(root, entry.types)),
        `${name} has declarations`,
      );
      assert.ok(existsSync(resolve(root, entry.import)), `${name} has ESM`);
      assert.ok(!entry.import.endsWith(".ts"));
    }
  }
  for (const value of Object.values(manifest.dependencies ?? {}) as string[]) {
    assert.ok(
      !/^(workspace|catalog):/.test(value),
      "distribution resolves outside the workspace",
    );
  }
}
const audio = readFileSync(
  "artifacts/packages/audio-browser/src/index.js",
  "utf8",
);
assert.ok(
  audio.includes('new URL("./worker.js", import.meta.url)'),
  "worker URL points to shipped JavaScript",
);
assert.ok(
  existsSync("artifacts/packages/audio-engine/generated/cadence_wasm_bg.wasm"),
);
assert.ok(
  existsSync("artifacts/packages/db/migrations/sqlite/0000_funny_korg.sql"),
);

const release = JSON.parse(
  readFileSync("artifacts/release/RELEASE.json", "utf8"),
);
const sha256 = (path: string) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
assert.equal(release.schemaVersion, 1);
assert.match(release.source.revision, /^[a-f0-9]{40}$/);
assert.equal(release.audio.engineVersion, engineVersion);
assert.equal(release.audio.protocolVersion, protocolVersion);
assert.equal(
  release.audio.wasmSha256,
  sha256("artifacts/packages/audio-engine/generated/cadence_wasm_bg.wasm"),
  "release identifies the actual shipped WASM",
);
assert.equal(
  release.catalog.version,
  `sha256:${createHash("sha256").update(JSON.stringify(defaultSongs)).digest("hex")}`,
  "catalog version identifies its exact contents",
);
for (const name of names) {
  const entry = release.packages[`@cadence/${name}`];
  const packed = JSON.parse(
    readFileSync(`artifacts/packages/${name}/package.json`, "utf8"),
  );
  assert.equal(entry.version, packed.version);
  assert.equal(entry.version, release.version);
  assert.equal(entry.sha256, sha256(`artifacts/release/${entry.file}`));
}
for (const dialect of ["sqlite", "postgres"]) {
  const root = `packages/db/migrations/${dialect}`;
  const journal = JSON.parse(
    readFileSync(`${root}/meta/_journal.json`, "utf8"),
  );
  assert.equal(
    release.database[dialect].requiredMigration,
    journal.entries.at(-1).tag,
  );
  assert.deepEqual(
    release.database[dialect].migrations,
    journal.entries.map((entry: { tag: string }) => ({
      name: entry.tag,
      sha256: sha256(`${root}/${entry.tag}.sql`),
    })),
  );
}
assert.ok(
  readFileSync("artifacts/release/SHA256SUMS", "utf8").includes(
    `${sha256("artifacts/release/RELEASE.json")}  RELEASE.json`,
  ),
  "release metadata is covered by the checksums",
);
