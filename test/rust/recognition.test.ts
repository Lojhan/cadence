import { spawnSync } from "node:child_process";
import { strict as assert } from "poku";

const result = spawnSync("cargo", ["test", "--workspace", "--locked"], {
  encoding: "utf8",
});
assert.equal(result.status, 0, result.stdout + result.stderr);
