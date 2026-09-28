import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { strict as assert } from "poku";

const directory = await mkdtemp(join(tmpdir(), "cadence-tab-browser-"));
const port = 3105;
const server = spawn(process.execPath, [".output/server/index.mjs"], {
  cwd: "apps/web",
  env: {
    ...process.env,
    PORT: String(port),
    PUBLIC_ORIGIN: `http://localhost:${port}`,
    DATABASE_URL: `file:${join(directory, "tab.db")}`,
  },
  stdio: "ignore",
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(`http://localhost:${port}/health`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, "built app starts");
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`http://localhost:${port}`);
  await page.getByRole("button", { name: "Open music library" }).click();
  await page.getByRole("tab", { name: "Import", exact: true }).click();
  await page.getByLabel("Song title").fill("Knockin' accompaniment exercise");
  await page.getByLabel("Chord chart").fill(`G / D / Am / C
e|--3---2---0---0--|
B|--0---3---1---1--|
G|--0---2---2---0--|
D|--0---0---2---2--|
A|--2-------0---3--|
E|--3--------------|`);
  await page.getByRole("button", { name: "Review chart" }).click();
  await page.getByRole("button", { name: "Save music" }).click();
  await page.getByRole("region", { name: "Guitar tablature" }).waitFor();
  assert.equal(
    await page
      .getByRole("region", { name: "Guitar tablature" })
      .getByText("Note 1 of 4")
      .count(),
    1,
    "the full tab becomes a playable song",
  );
  await page.getByRole("button", { name: "Next tab note" }).click();
  assert.equal(
    await page
      .getByRole("region", { name: "Guitar tablature" })
      .getByText("Note 2 of 4")
      .count(),
    1,
  );
  assert.equal(
    await page
      .getByRole("region", { name: "Guitar tablature" })
      .locator("pre div")
      .count(),
    6,
  );
} finally {
  await browser?.close();
  server.kill();
  await rm(directory, { recursive: true, force: true });
}
