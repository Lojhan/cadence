import { openPostgres } from "./postgres/index.ts";
import { openSqlite } from "./sqlite/index.ts";
export async function migrateDatabase(url: string, migrationsRoot?: string) {
  const store = url.startsWith("file:")
    ? await openSqlite(url.slice(5), true, migrationsRoot)
    : await openPostgres(url, true, migrationsRoot);
  await store.close();
}
