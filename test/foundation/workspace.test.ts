import { existsSync, readFileSync } from "node:fs";
import { strict as assert } from "poku";

const config = readFileSync("pnpm-workspace.yaml", "utf8");
assert.match(config, /packages\/\*/);
assert.match(config, /apps\/\*/);
assert.ok(existsSync("LICENSE"));
assert.ok(!existsSync("src/App.tsx"), "POC source is removed");
assert.ok(!existsSync("package-lock.json"), "pnpm is the only JS lockfile");
assert.ok(existsSync("design/prototype.html"), "reviewed design is preserved");
const biome = JSON.parse(readFileSync("biome.json", "utf8"));
assert.equal(biome.linter.enabled, true);
assert.ok(existsSync(".github/workflows/ci.yml"));
