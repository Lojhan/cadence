import { spawnSync } from "node:child_process";
import { strict as assert } from "poku";
import { evaluateWasm } from "../../tooling/evaluate-wasm.ts";

const manifest =
  process.env.CADENCE_AUDIO_MANIFEST ??
  "fixtures/audio/guitarset/manifest.json";
for (const profile of ["gentle", "balanced", "precise"] as const) {
  const native = spawnSync(
    "cargo",
    [
      "run",
      "--quiet",
      "--locked",
      "--release",
      "-p",
      "cadence-eval",
      "--",
      manifest,
      profile,
    ],
    { encoding: "utf8" },
  );
  assert.equal(native.status, 0, native.stderr);
  const expected = JSON.parse(native.stdout);
  const actual = evaluateWasm(manifest, profile);
  assert.equal(actual.profile, profile);
  assert.deepEqual(
    actual.cases.map((row) => ({
      id: row.id,
      matched: row.matched,
      latencyMs: row.latencyMs,
    })),
    expected.cases.map(
      (row: { id: string; matched: boolean; latencyMs: number | null }) => ({
        id: row.id,
        matched: row.matched,
        latencyMs: row.latencyMs,
      }),
    ),
    `${profile}: complete manifest agrees between native and WASM`,
  );
}
