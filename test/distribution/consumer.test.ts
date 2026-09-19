import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { strict as assert } from "poku";

const directory = mkdtempSync(join(tmpdir(), "cadence-consumer-"));
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
const version = JSON.parse(
  readFileSync("artifacts/packages/core/package.json", "utf8"),
).version;
const dependencies = Object.fromEntries(
  names.map((name) => [
    `@cadence/${name}`,
    `file:${resolve(`artifacts/release/cadence-${name}-${version}.tgz`)}`,
  ]),
);
function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    cwd: directory,
    encoding: "utf8",
    timeout: 120_000,
  });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`,
  );
}
try {
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
      dependencies: {
        ...dependencies,
        "node-gyp": "12.2.0",
        typescript: "7.0.2",
        "@types/react": "19.3.0",
        "@types/node": "24.10.0",
      },
      pnpm: {
        overrides: dependencies,
        onlyBuiltDependencies: ["better-sqlite3"],
      },
    }),
  );
  run("pnpm", ["install", "--ignore-workspace"]);
  writeFileSync(
    join(directory, "smoke.mjs"),
    `
    import assert from 'node:assert/strict';
    import {parseChord, defaultSongs} from '@cadence/music';
    import {openSqlite} from '@cadence/db/sqlite';
    import {createApplication} from '@cadence/application';
    import {initSync, RecognitionEngine} from '@cadence/audio-engine';
    import {readFileSync} from 'node:fs';
    assert.equal(parseChord('C').symbol, 'C');
    const store = await openSqlite(':memory:');
    const app = createApplication(store, () => crypto.randomUUID());
    const principal = {userId:'00000000-0000-4000-8000-000000000002', mode:'local'};
    await app.provision(principal);
    assert.ok((await app.library(principal)).length >= defaultSongs.length);
    await store.close();
    initSync({module:readFileSync(import.meta.resolve('@cadence/audio-engine/binary').replace('file://', ''))});
    const engine = new RecognitionEngine(48000, 1); engine.free();
  `,
  );
  run("node", ["smoke.mjs"]);
  writeFileSync(
    join(directory, "smoke.ts"),
    `import * as Features from '@cadence/features'; import * as UI from '@cadence/ui'; import {Microphone} from '@cadence/audio-browser'; void [Features, UI, Microphone];`,
  );
  writeFileSync(
    join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        skipLibCheck: false,
        module: "ESNext",
        moduleResolution: "Bundler",
        target: "ES2022",
        noEmit: true,
      },
      include: ["smoke.ts"],
    }),
  );
  run("pnpm", ["exec", "tsc"]);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
