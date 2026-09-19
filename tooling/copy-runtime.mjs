import { cpSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

cpSync(
  new URL("../packages/db/migrations", import.meta.url),
  new URL("../apps/web/.output/migrations", import.meta.url),
  { recursive: true },
);

await build({
  entryPoints: [fileURLToPath(new URL("./admin.ts", import.meta.url))],
  outfile: fileURLToPath(
    new URL("../apps/web/.output/server/admin.mjs", import.meta.url),
  ),
  bundle: true,
  platform: "node",
  format: "esm",
  external: ["better-sqlite3", "pg"],
});
