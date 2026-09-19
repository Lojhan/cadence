import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strict as assert } from "poku";

const directory = mkdtempSync(join(tmpdir(), "cadence-release-notes-"));
const notes = join(directory, "notes.md");
function verify(version: string, body: string) {
  writeFileSync(notes, body);
  return spawnSync(
    process.execPath,
    ["tooling/verify-release-notes.ts", notes],
    {
      env: { ...process.env, CADENCE_RELEASE_VERSION: version },
      encoding: "utf8",
    },
  );
}
try {
  const current = verify(
    "0.1.0-alpha.6",
    "Cadence 0.1.0-alpha.6 is an MIT-licensed preview.\n",
  );
  assert.equal(current.status, 0, current.stderr);
  const stale = verify(
    "0.1.0-alpha.6",
    "Cadence 0.1.0-alpha.4 is an MIT-licensed preview.\n",
  );
  assert.notEqual(stale.status, 0, "reject notes copied from an older release");
  assert.match(stale.stderr, /release notes.*0\.1\.0-alpha\.6/i);
  assert.notEqual(
    verify("0.1.0-alpha.6", "Changes since alpha.5\n").status,
    0,
    "require an explicit release identity",
  );
  assert.notEqual(
    verify("0.1.0", "Cadence 0.1.0 is a stable release.\n").status,
    0,
    "alpha workflow cannot publish a stable version",
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
