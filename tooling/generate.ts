import { spawnSync } from "node:child_process";

const usage =
  "Usage: pnpm db:generate sqlite|postgres\nGenerates migration files only; does not connect to a database.";
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--help") {
  console.log(usage);
} else if (
  args.length !== 1 ||
  (args[0] !== "sqlite" && args[0] !== "postgres")
) {
  console.error(usage);
  process.exitCode = 2;
} else {
  const result = spawnSync(
    "pnpm",
    [
      "--filter",
      "@cadence/db",
      "exec",
      "drizzle-kit",
      "generate",
      "--config",
      `drizzle.${args[0]}.ts`,
    ],
    { stdio: "inherit" },
  );
  if (result.error) console.error(result.error.message);
  process.exitCode = result.status ?? 1;
}
