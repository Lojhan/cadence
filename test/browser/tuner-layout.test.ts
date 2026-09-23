import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { strict as assert } from "poku";

const directory = await mkdtemp(join(tmpdir(), "cadence-tuner-browser-"));
const origin = "http://localhost:3102";
const server = spawn(process.execPath, [".output/server/index.mjs"], {
  cwd: "apps/web",
  env: {
    ...process.env,
    PORT: "3102",
    PUBLIC_ORIGIN: origin,
    DATABASE_URL: `file:${join(directory, "tuner.db")}`,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
server.stdout.on("data", (chunk) => {
  logs += chunk;
});
server.stderr.on("data", (chunk) => {
  logs += chunk;
});
const browser = await chromium.launch();
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(`${origin}/health`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, logs);
  for (const [width, height] of [
    [390, 844],
    [768, 1024],
    [1280, 800],
  ] as const) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`${origin}/tuning`);
    await page.locator(".tuner-string-cell").first().waitFor();
    const layout = await page.evaluate(() => {
      const cells = [...document.querySelectorAll(".tuner-string-cell")];
      const wires = [...document.querySelectorAll(".tuner-wire")];
      const boxes = cells.map((cell) => cell.getBoundingClientRect());
      const wire = wires[0]?.getBoundingClientRect();
      const presetIcon = document
        .querySelector(".tuner-preset-trigger svg")
        ?.getBoundingClientRect();
      const presetName = document
        .querySelector(".tuner-preset-name")
        ?.getBoundingClientRect();
      const stage = document
        .querySelector(".tuner-experience-stage")
        ?.getBoundingClientRect();
      return {
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        count: cells.length,
        presetCount: document.querySelectorAll(".tuner-preset-trigger").length,
        xIncreasing: boxes.every(
          (box, index) => index === 0 || box.x > (boxes[index - 1]?.x ?? box.x),
        ),
        yIncreasing: boxes.every(
          (box, index) => index === 0 || box.y > (boxes[index - 1]?.y ?? box.y),
        ),
        wireWidth: wire?.width ?? 0,
        wireHeight: wire?.height ?? 0,
        presetHorizontal:
          !!presetIcon &&
          !!presetName &&
          presetName.left >= presetIcon.right &&
          Math.abs(
            (presetName.top + presetName.bottom) / 2 -
              (presetIcon.top + presetIcon.bottom) / 2,
          ) < 4,
        stringCenterOffset:
          stage && boxes.length > 0
            ? Math.abs(
                ((boxes[0]?.left ?? 0) +
                  (boxes[boxes.length - 1]?.right ?? 0)) /
                  2 -
                  (stage.left + stage.right) / 2,
              )
            : Number.POSITIVE_INFINITY,
      };
    });
    assert.equal(layout.count, 6);
    assert.equal(layout.presetCount, 1);
    assert.ok(layout.presetHorizontal, "preset icon and label align in a row");
    assert.ok(
      layout.scrollWidth <= width && layout.scrollHeight <= height,
      `tuner fits ${width}×${height}`,
    );
    if (width < 700) {
      assert.ok(
        layout.stringCenterOffset < 4,
        "phone string board is centered on the tuner stage",
      );
      assert.ok(
        layout.xIncreasing && layout.wireHeight > layout.wireWidth,
        "phone strings are vertical",
      );
    } else {
      assert.ok(
        layout.yIncreasing && layout.wireWidth > layout.wireHeight,
        "tablet and desktop strings are horizontal",
      );
    }
    await page.getByRole("button", { name: "Chromatic" }).click();
    assert.equal(await page.locator(".tuner-note-rail-item").count(), 12);
    const needle = await page
      .locator(".tuner-gauge-needle")
      .evaluate((line) => ({
        y1: Number(line.getAttribute("y1")),
        y2: Number(line.getAttribute("y2")),
        stroke: getComputedStyle(line).stroke,
      }));
    assert.ok(
      needle.y1 > needle.y2 && needle.stroke !== "none",
      "chromatic needle is drawn",
    );
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${origin}/tuning?preset=drop_d`);
  const tunerDock = page.getByRole("navigation", { name: "Tuner controls" });
  assert.equal(
    await tunerDock.count(),
    1,
    "tuner uses the shared control dock",
  );
  await page.locator(".tuner-preset-trigger").click();
  await page.getByRole("button", { name: "Drop D", exact: true }).click();
  await tunerDock.getByRole("button", { name: "Microphone options" }).click();
  await page.getByRole("combobox", { name: "Microphone input" }).waitFor();
  await page.getByRole("combobox", { name: "Input boost" }).waitFor();
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Microphone options",
  );
  assert.equal(
    await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label"),
    ),
    "Microphone options",
    "closing microphone options restores focus to its trigger",
  );
  await page.goto(`${origin}/tuning`);
  await page.locator(".tuner-preset-trigger").waitFor();
  assert.match(
    (await page.locator(".tuner-preset-trigger").getAttribute("aria-label")) ??
      "",
    /Drop D selected/,
    "selecting the previewed preset persists it",
  );
  await page.getByRole("button", { name: "Close tuner" }).click();
  assert.equal(
    await page.getByText(/Voicing adapted for/).count(),
    0,
    "tuning advice does not add a third item to the practice stage",
  );
  await page
    .getByRole("button", { name: /Tuning mismatch:|Guitar tuner/ })
    .click();
  await page.locator(".tuner-preset-trigger").waitFor();
  assert.match(
    (await page.locator(".tuner-preset-trigger").getAttribute("aria-label")) ??
      "",
    /Drop D selected/,
    "returning through practice keeps the saved tuning",
  );
  await page.close();
} finally {
  await browser.close();
  server.kill("SIGTERM");
  await rm(directory, { recursive: true, force: true });
}
