import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@cadence/application";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { repository } from "../repository.ts";
export async function openSqlite(
  filename: string,
  initialize = false,
  migrationsRoot?: string,
): Promise<Store> {
  const client = new Database(filename);
  client.pragma("foreign_keys = ON");
  client.pragma("journal_mode = WAL");
  client.pragma("busy_timeout = 5000");
  const db = drizzle(client);
  const migrationsFolder = migrationsRoot
    ? resolve(migrationsRoot, "sqlite")
    : fileURLToPath(new URL("../../migrations/sqlite", import.meta.url));
  const exists = client
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'",
    )
    .get();
  if (!exists || initialize) migrate(db, { migrationsFolder });
  else {
    const latest = readMigrationFiles({ migrationsFolder }).at(-1);
    const applied = client
      .prepare(
        "SELECT hash FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1",
      )
      .get() as { hash: string } | undefined;
    if (latest && applied?.hash !== latest.hash) {
      client.close();
      throw new Error(
        "Database migration required. Back up and run pnpm db:migrate.",
      );
    }
  }
  let pending: Promise<unknown> = Promise.resolve();
  return {
    transaction(run) {
      const result = pending.then(async () => {
        client.exec("BEGIN IMMEDIATE");
        try {
          const value = await run(repository(async (query) => db.all(query)));
          client.exec("COMMIT");
          return value;
        } catch (error) {
          client.exec("ROLLBACK");
          throw error;
        }
      });
      pending = result.catch(() => {});
      return result;
    },
    async close() {
      await pending;
      client.close();
    },
  };
}
