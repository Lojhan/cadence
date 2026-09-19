import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strict as assert } from "poku";
import { openSqlite } from "../../packages/db/src/sqlite/index.ts";

const directory = await mkdtemp(join(tmpdir(), "cadence-backup-"));
const database = join(directory, "source.db");
const backup = join(directory, "backup.db");
const restored = join(directory, "restored.db");
function admin(url: string, ...args: string[]) {
  return spawnSync(
    process.execPath,
    ["apps/web/.output/server/admin.mjs", ...args],
    { env: { ...process.env, DATABASE_URL: `file:${url}` }, encoding: "utf8" },
  );
}
try {
  const store = await openSqlite(database);
  await store.transaction((repo) => repo.createUser("backup-user"));
  await store.close();
  const saved = admin(database, "backup", backup);
  assert.equal(saved.status, 0, saved.stderr);
  assert.notEqual(
    admin(database, "backup", backup).status,
    0,
    "backup refuses to overwrite a file",
  );
  const result = admin(restored, "restore", backup);
  assert.equal(result.status, 0, result.stderr);
  const restoredStore = await openSqlite(restored);
  assert.equal(
    await restoredStore.transaction((repo) => repo.hasUser("backup-user")),
    true,
  );
  await restoredStore.close();
  assert.notEqual(
    admin(database, "restore", backup).status,
    0,
    "restore requires an empty target",
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
