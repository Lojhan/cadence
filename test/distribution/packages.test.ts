import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { strict as assert } from "poku";

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
