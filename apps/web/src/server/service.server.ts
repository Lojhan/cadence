import "@tanstack/react-start/server-only";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createApplication } from "@cadence/application";
import { CadenceError, type Principal } from "@cadence/contracts";
import { openPostgres } from "@cadence/db/postgres";
import { openSqlite } from "@cadence/db/sqlite";

const principal: Principal = {
  userId: "00000000-0000-4000-8000-000000000001",
  mode: "local",
};
async function initialize() {
  if (process.env.AUTH_MODE && process.env.AUTH_MODE !== "local")
    throw new Error("The public distribution supports local personal mode.");
  const url = process.env.DATABASE_URL ?? "file:./data/cadence.db";
  const filename = url.startsWith("file:") ? resolve(url.slice(5)) : null;
  if (filename) mkdirSync(dirname(filename), { recursive: true });
  const store = filename ? await openSqlite(filename) : await openPostgres(url);
  const application = createApplication(store, randomUUID);
  await application.provision(principal);
  return application;
}
let application: ReturnType<typeof initialize> | undefined;
export async function call<T>(
  run: (
    app: Awaited<ReturnType<typeof initialize>>,
    actor: Principal,
  ) => Promise<T>,
): Promise<T> {
  try {
    application ??= initialize().catch((error) => {
      application = undefined;
      throw error;
    });
    return await run(await application, principal);
  } catch (error) {
    if (error instanceof CadenceError) throw new Error(error.message);
    if (error instanceof Error && error.name === "ZodError")
      throw new Error("Check the submitted values.");
    throw new Error("Storage is unavailable. Try again.");
  }
}
