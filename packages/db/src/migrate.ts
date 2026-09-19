import { openPostgres } from "./postgres/index.ts";
import { openSqlite } from "./sqlite/index.ts";
export async function migrateDatabase(url: string) {
  const store = url.startsWith("file:")
    ? await openSqlite(url.slice(5), true)
    : await openPostgres(url, true);
  await store.close();
}
