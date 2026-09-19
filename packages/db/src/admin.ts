import {
  constants,
  copyFileSync,
  existsSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import Database from "better-sqlite3";

export { migrateDatabase } from "./migrate.ts";

function filename(url: string) {
  if (!url.startsWith("file:"))
    throw new Error("Use pg_dump/pg_restore for PostgreSQL backups.");
  return url.slice(5);
}
export async function backupDatabase(url: string, destination: string) {
  const database = new Database(filename(url), {
    readonly: true,
    fileMustExist: true,
  });
  let reserved = false;
  try {
    writeFileSync(destination, "", { flag: "wx" });
    reserved = true;
    await database.backup(destination);
  } catch (error) {
    if (reserved && existsSync(destination)) unlinkSync(destination);
    throw error;
  } finally {
    database.close();
  }
}
export function restoreDatabase(url: string, source: string) {
  const database = new Database(source, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    if (database.pragma("integrity_check", { simple: true }) !== "ok")
      throw new Error("The backup did not pass its integrity check.");
  } finally {
    database.close();
  }
  copyFileSync(source, filename(url), constants.COPYFILE_EXCL);
}
