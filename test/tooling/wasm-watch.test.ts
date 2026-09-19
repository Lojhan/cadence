import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strict as assert } from "poku";
import {
  RustDevelopmentLoop,
  rustFingerprint,
} from "../../tooling/wasm-watch.ts";

const events: string[] = [];
let finishBuild: ((success: boolean) => void) | undefined;
const loop = new RustDevelopmentLoop({
  stop: async () => {
    events.push("stop");
  },
  build: () =>
    new Promise<boolean>((resolve) => {
      events.push("build");
      finishBuild = resolve;
    }),
  start: async () => {
    events.push("start");
  },
});
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
loop.change();
await flush();
assert.deepEqual(events, ["stop", "build"]);
loop.change();
loop.change();
finishBuild?.(true);
await flush();
assert.deepEqual(
  events,
  ["stop", "build", "stop", "build"],
  "edits during compilation coalesce and never serve a stale build",
);
finishBuild?.(false);
await flush();
assert.equal(
  events.includes("start"),
  false,
  "failed compilation cannot start the server",
);
loop.change();
await flush();
finishBuild?.(true);
await flush();
assert.equal(
  events.at(-1),
  "start",
  "a corrected edit recovers without restarting the watcher",
);
loop.change();
await flush();
const closing = loop.close();
finishBuild?.(true);
await closing;
assert.equal(
  events.filter((event) => event === "start").length,
  1,
  "shutdown during a build cannot start another server",
);
loop.change();
await flush();
assert.equal(events.at(-1), "stop");

const directory = mkdtempSync(join(tmpdir(), "cadence-wasm-watch-"));
try {
  mkdirSync(join(directory, "crates/cadence-dsp/src"), { recursive: true });
  writeFileSync(join(directory, "Cargo.toml"), "workspace");
  writeFileSync(join(directory, "Cargo.lock"), "lock");
  const source = join(directory, "crates/cadence-dsp/src/lib.rs");
  writeFileSync(source, "first");
  const initial = await rustFingerprint(directory);
  mkdirSync(join(directory, "target"));
  writeFileSync(join(directory, "target/ignored.rs"), "generated");
  assert.equal(
    await rustFingerprint(directory),
    initial,
    "build outputs do not trigger rebuild loops",
  );
  writeFileSync(source, "other");
  assert.notEqual(
    await rustFingerprint(directory),
    initial,
    "same-size Rust edits trigger rebuilds",
  );
  const edited = await rustFingerprint(directory);
  writeFileSync(join(directory, "crates/cadence-dsp/src/new.rs"), "new");
  assert.notEqual(
    await rustFingerprint(directory),
    edited,
    "new modules are detected",
  );
  rmSync(join(directory, "crates/cadence-dsp/src/new.rs"));
  assert.equal(
    await rustFingerprint(directory),
    edited,
    "removed modules are detected",
  );
  writeFileSync(join(directory, "Cargo.lock"), "changed");
  assert.notEqual(
    await rustFingerprint(directory),
    edited,
    "lockfile edits trigger rebuilds",
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
