import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@cadence/application";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { repository } from "../repository.ts";
export async function openPostgres(
  url: string,
  initialize = false,
  migrationsRoot?: string,
): Promise<Store> {
  const pool = new Pool({ connectionString: url, max: 10 });
  const migrationsFolder = migrationsRoot
    ? resolve(migrationsRoot, "postgres")
    : fileURLToPath(new URL("../../migrations/postgres", import.meta.url));
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(6742391)");
    const exists = await client.query(
      "SELECT to_regclass('public.users') AS name",
    );
    if (!exists.rows[0]?.name || initialize)
      await migrate(drizzle(client), { migrationsFolder });
    else {
      const latest = readMigrationFiles({ migrationsFolder }).at(-1);
      const applied = await client.query(
        "SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1",
      );
      if (latest && applied.rows[0]?.hash !== latest.hash)
        throw new Error(
          "Database migration required. Back up and run pnpm db:migrate.",
        );
    }
  } catch (error) {
    client.release(true);
    await pool.end();
    throw error;
  }
  await client.query("SELECT pg_advisory_unlock(6742391)");
  client.release();
  return {
    async transaction(run) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const db = drizzle(client);
        const result = await run(
          repository(async (query) => (await db.execute(query)).rows),
        );
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}
