import { migrateDatabase } from "../packages/db/src/migrate.ts";

const url = process.env.DATABASE_URL;
if (!url)
  throw new Error(
    "Set DATABASE_URL to the database to migrate. Back up an existing database first.",
  );
await migrateDatabase(url);
console.log("Database migrations applied");
