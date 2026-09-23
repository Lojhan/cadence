import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, webkit } from "playwright";
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

  await page.goto(origin);
  const practiceDock = await page.locator(".transport").boundingBox();
  if (!practiceDock) throw new Error("Practice dock is missing");
  await page.goto(`${origin}/tuning`);
  await page.locator(".tuner-preset-trigger").click();
  await page.getByRole("button", { name: "Standard", exact: true }).click();
  const standardDock = await page.locator(".tuner-control-dock").boundingBox();
  if (!standardDock) throw new Error("Tuner dock is missing");
  assert.ok(
    Math.abs(
      practiceDock.y +
        practiceDock.height -
        (standardDock.y + standardDock.height),
    ) < 1,
    "practice and tuner docks share the same bottom edge",
  );
  assert.ok(
    Math.abs(
      practiceDock.x +
        practiceDock.width / 2 -
        (standardDock.x + standardDock.width / 2),
    ) < 1,
    "practice and tuner docks share the same center",
  );
  await page.locator(".tuner-preset-trigger").click();
  await page
    .getByRole("button", { name: "Full Step Down (D Standard)" })
    .click();
  const longDock = await page.locator(".tuner-control-dock").boundingBox();
  if (!longDock) throw new Error("Tuner dock is missing with a long preset");
  assert.ok(
    longDock.x >= 0 && longDock.x + longDock.width <= 390,
    "long preset fits the phone viewport",
  );
  assert.ok(
    Math.abs(longDock.width - standardDock.width) < 1,
    "preset changes do not resize the dock",
  );
  const label = await page
    .locator(".tuner-preset-name")
    .evaluate((element) => ({
      overflow: getComputedStyle(element).textOverflow,
      clipped: element.scrollWidth > element.clientWidth,
    }));
  assert.equal(label.overflow, "ellipsis", "long preset uses an ellipsis");
  assert.ok(label.clipped, "long preset text is actually clipped");
  await page.close();

  const safari = await webkit.launch();
  try {
    const phone = await safari.newPage({
      viewport: { width: 390, height: 844 },
    });
    await phone.goto(`${origin}/tuning`);
    await phone.getByRole("button", { name: "Chromatic" }).click();
    const gauge = await phone.locator(".tuner-gauge-art").evaluate((svg) => {
      const ticks = [...svg.querySelectorAll(".tuner-gauge-tick")];
      const coordinates = ticks.flatMap((tick) => [
        Number(tick.getAttribute("x1")),
        Number(tick.getAttribute("x2")),
      ]);
      return {
        span: Math.max(...coordinates) - Math.min(...coordinates),
        width: svg.getBoundingClientRect().width,
      };
    });
    assert.ok(
      gauge.span >= gauge.width * 0.8,
      "chromatic scale uses the phone width in Safari",
    );
    await phone.close();
  } finally {
    await safari.close();
  }
} finally {
  await browser.close();
  server.kill("SIGTERM");
  await rm(directory, { recursive: true, force: true });
}
