import { cpSync } from "node:fs";

cpSync(
  new URL("../packages/db/migrations", import.meta.url),
  new URL("../apps/web/.output/migrations", import.meta.url),
  { recursive: true },
);
