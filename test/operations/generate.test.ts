import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { strict as assert } from "poku";

function generate(...args: string[]) {
  return spawnSync("pnpm", ["--silent", "db:generate", ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: "invalid://generation-must-not-connect",
    },
  });
}
function migrations(directory: string): Record<string, string> {
  return Object.fromEntries(
    readdirSync(directory, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const path = join(entry.parentPath, entry.name);
        return [path, readFileSync(path).toString("base64")];
      }),
  );
}
const before = migrations("packages/db/migrations");
for (const args of [[], ["mysql"], ["sqlite", "postgres"]]) {
  const result = generate(...args);
  assert.equal(
    result.status,
    2,
    "generation requires exactly one supported dialect",
  );
  assert.match(result.stderr, /sqlite\|postgres/);
}
const help = generate("--help");
assert.equal(help.status, 0);
assert.match(help.stdout, /sqlite\|postgres/);
for (const dialect of ["sqlite", "postgres"]) {
  const result = generate(dialect);
  assert.equal(
    result.status,
    0,
    `${dialect}: ${result.stdout}\n${result.stderr}`,
  );
  assert.match(result.stdout, /No schema changes/);
}
assert.deepEqual(
  migrations("packages/db/migrations"),
  before,
  "unchanged schemas generate no files or database writes",
);
