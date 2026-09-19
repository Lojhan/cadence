import { fileURLToPath } from "node:url";
import {
  backupDatabase,
  migrateDatabase,
  restoreDatabase,
} from "@cadence/db/admin";

const url = process.env.DATABASE_URL ?? "file:/data/cadence.db";
const [command, path] = process.argv.slice(2);
if (command === "migrate")
  await migrateDatabase(
    url,
    fileURLToPath(new URL("../migrations", import.meta.url)),
  );
else if (command === "backup" && path) await backupDatabase(url, path);
else if (command === "restore" && path) restoreDatabase(url, path);
else
  throw new Error(
    "Usage: node server/admin.mjs migrate | backup PATH | restore PATH. Restore requires an empty target.",
  );
console.log(`${command} completed`);
