import { spawnSync } from "node:child_process";
import { get } from "node:http";
import { chromium } from "playwright";
import { strict as assert } from "poku";

const runtime = process.env.CONTAINER_ENGINE ?? "docker";
const image = process.env.CADENCE_TEST_IMAGE ?? "cadence:test";
const name = `cadence-test-${crypto.randomUUID()}`;
const volume = `${name}-data`;
function command(args: string[]) {
  const result = spawnSync(runtime, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}
async function ready() {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const response = await fetch("http://localhost:3110/ready");
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(command(["logs", name]));
}
try {
  command(["volume", "create", volume]);
  command([
    "run",
    "--detach",
    "--name",
    name,
    "--publish",
    "127.0.0.1:3110:3000",
    "--env",
    "PUBLIC_ORIGIN=http://localhost:3110",
    "--volume",
    `${volume}:/data`,
    image,
  ]);
  await ready();
  assert.ok(
    (await fetch("http://localhost:3110")).ok,
    "blank installation responds without provider accounts",
  );
  assert.equal(
    command(["exec", name, "id", "-u"]),
    "1000",
    "runtime is non-root",
  );
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto("http://localhost:3110");
    await page.getByRole("region", { name: "Practice stage" }).waitFor();
    assert.ok(
      await page
        .getByRole("region", { name: "Practice stage" })
        .getByRole("heading", { level: 1 })
        .isVisible(),
      "blank installation shows the practice target",
    );
    await page.getByRole("button", { name: "Open settings" }).click();
    const saved = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.ok(),
    );
    await page
      .getByRole("combobox", { name: "Appearance" })
      .selectOption("dark");
    await saved;
  } finally {
    await browser.close();
  }
  const readPreferences =
    'const Database=require("/app/server/node_modules/better-sqlite3"); const db=new Database("/data/cadence.db"); console.log(JSON.stringify(db.prepare("SELECT * FROM preferences").all())); db.close()';
  const fingerprint = command(["exec", name, "node", "-e", readPreferences]);
  assert.notEqual(fingerprint, "[]", "local preferences are persisted");
  command(["restart", name]);
  await ready();
  assert.equal(
    command(["exec", name, "node", "-e", readPreferences]),
    fingerprint,
    "preferences survive restart",
  );
  command([
    "exec",
    name,
    "node",
    "server/admin.mjs",
    "backup",
    "/data/backup.db",
  ]);
  assert.equal(command(["exec", name, "test", "-s", "/data/backup.db"]), "");
  const rejectedStatus = await new Promise<number | undefined>(
    (resolve, reject) => {
      get(
        "http://localhost:3110",
        { headers: { host: "untrusted.example" } },
        (response) => {
          response.resume();
          resolve(response.statusCode);
        },
      ).on("error", reject);
    },
  );
  assert.equal(rejectedStatus, 403, "unrecognized hosts are rejected");
  const healthcheck = JSON.parse(
    command([
      "image",
      "inspect",
      "--format",
      "{{json .Config.Healthcheck.Test}}",
      image,
    ]),
  ) as string[];
  assert.equal(healthcheck[0], "CMD-SHELL");
  command(["exec", name, "sh", "-c", healthcheck[1] ?? "exit 1"]);
} finally {
  try {
    command(["rm", "--force", name]);
  } finally {
    command(["volume", "rm", volume]);
  }
}
