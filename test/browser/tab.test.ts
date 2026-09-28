import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
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
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.goto(`http://localhost:${port}`);
  await page.getByRole("button", { name: "Open music library" }).click();
  await page.getByRole("tab", { name: "Import", exact: true }).click();
  await page.getByLabel("Song title").fill("Knockin' accompaniment exercise");
  await page.getByLabel("Chord chart").fill(`Pass 1
e|--3---2---0---0--|
B|--0---3---1---1--|
G|--0---2---2---0--|
D|--0---0---2---2--|
A|--2-------0---3--|
E|--3--------------|

Pass 2
e|--3---2---0---0--|
B|--0---3---1---1--|
G|--0---2---2---0--|
D|--0---0---2---2--|
A|--2-------0---3--|
E|--3--------------|`);
  await page.getByRole("button", { name: "Review chart" }).click();
  await page.getByRole("button", { name: "Save music" }).click();
  await page.getByRole("region", { name: "Guitar tablature" }).waitFor();
  const tab = page.getByRole("region", { name: "Guitar tablature" });
  assert.equal(await tab.locator("[data-tab-event]").count(), 8);
  assert.equal(await tab.locator("[data-tab-row]").count(), 1);
  const scoreBounds = await tab
    .locator("[data-tab-row] > div")
    .last()
    .boundingBox();
  const lastEventBounds = await tab
    .locator("[data-tab-event]")
    .last()
    .boundingBox();
  if (!scoreBounds || !lastEventBounds)
    throw new Error("Tablature row bounds are unavailable");
  assert.ok(
    Math.abs(
      lastEventBounds.x +
        lastEventBounds.width -
        (scoreBounds.x + scoreBounds.width),
    ) < 4,
    "the events fill the available row width",
  );
  assert.equal(await tab.getByText("Tablature").count(), 0);
  assert.equal(await tab.getByText("Note 1 of 8").count(), 0);
  assert.equal(await tab.getByText("Pass 1").count(), 0);
  assert.equal(await tab.locator('[aria-current="step"]').count(), 1);
  const inactiveFret = tab
    .locator('[data-tab-event="1"] [data-tab-fret]')
    .first();
  assert.equal(
    await inactiveFret.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    ),
    "rgba(0, 0, 0, 0)",
    "unselected fret numbers use the page background",
  );
  const activeFret = tab
    .locator('[data-tab-event="0"] [data-tab-fret]')
    .first();
  const activeFretBounds = await activeFret.boundingBox();
  const activeEventBounds = await tab
    .locator('[data-tab-event="0"]')
    .boundingBox();
  if (!activeFretBounds || !activeEventBounds)
    throw new Error("Active fret bounds are unavailable");
  assert.ok(
    activeFretBounds.width < activeEventBounds.width / 2,
    "the active marker fits the number rather than the whole event column",
  );
  assert.equal(
    await page.getByRole("button", { name: "Next tab note" }).count(),
    0,
  );
  assert.equal(
    await page.getByRole("button", { name: "Previous tab note" }).count(),
    0,
  );
  const screenshotDirectory = process.env.CADENCE_TAB_SCREENSHOT_DIR;
  if (screenshotDirectory) {
    await mkdir(screenshotDirectory, { recursive: true });
    await page.screenshot({
      path: join(screenshotDirectory, "desktop-start.png"),
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await tab.locator("[data-tab-row]").count(), 1);
  assert.equal(
    await tab.evaluate((element) => element.scrollWidth <= element.clientWidth),
    true,
    "tablature does not overflow the page",
  );
  if (screenshotDirectory)
    await page.screenshot({
      path: join(screenshotDirectory, "mobile-start.png"),
    });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Open music library" }).click();
  await page
    .getByRole("button", {
      name: /^Knockin' on Heaven's Door — tab practice/,
    })
    .click();
  await tab.locator("[data-tab-event]").first().waitFor();
  assert.equal(await tab.locator("[data-tab-event]").count(), 48);
  assert.equal(await tab.locator("[data-tab-row]").count(), 1);
  assert.ok((await tab.locator("[data-tab-chord]").count()) > 0);
  assert.equal(
    await tab.locator("[data-tab-chord]").first().textContent(),
    "G",
  );
  if (screenshotDirectory)
    await page.screenshot({
      path: join(screenshotDirectory, "desktop-knockin.png"),
    });
  const scroll = tab.locator("[data-tab-scroll]");
  const labelsBefore = await tab.locator("[data-tab-labels]").boundingBox();
  const manualPosition = await scroll.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
    return element.scrollLeft;
  });
  assert.ok(manualPosition > 0, "the full tab can be scrolled sideways");
  await page.waitForTimeout(150);
  assert.equal(
    await scroll.evaluate((element) => element.scrollLeft),
    manualPosition,
  );
  assert.equal(
    await scroll.evaluate((element) => element.scrollTop),
    0,
    "the tab stays on one vertical level",
  );
  const labelsAfter = await tab.locator("[data-tab-labels]").boundingBox();
  if (!labelsBefore || !labelsAfter)
    throw new Error("String label bounds are unavailable");
  assert.ok(
    Math.abs(labelsBefore.x - labelsAfter.x) < 1,
    "string labels stay fixed while the score scrolls",
  );
  if (screenshotDirectory)
    await page.screenshot({
      path: join(screenshotDirectory, "desktop-continuation.png"),
    });
  {
    const mobilePage = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    await mobilePage.goto(`http://localhost:${port}`);
    await mobilePage
      .getByRole("button", { name: "Open music library" })
      .click();
    await mobilePage
      .getByRole("button", {
        name: /^Knockin' on Heaven's Door — tab practice/,
      })
      .click();
    await mobilePage.getByText("Your practice").waitFor({ state: "hidden" });
    assert.equal(await mobilePage.locator("[data-tab-row]").count(), 1);
    if (screenshotDirectory)
      await mobilePage.screenshot({
        path: join(screenshotDirectory, "mobile-knockin.png"),
      });
    await mobilePage.locator("[data-tab-scroll]").evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    await mobilePage.waitForTimeout(150);
    const mobileLastEvent = await mobilePage
      .locator("[data-tab-event]")
      .last()
      .boundingBox();
    if (!mobileLastEvent)
      throw new Error("The last mobile tab event is unavailable");
    assert.ok(
      mobileLastEvent.x < 390 && mobileLastEvent.x + mobileLastEvent.width > 80,
      "the end of the score is visible after scrolling on mobile",
    );
    if (screenshotDirectory)
      await mobilePage.screenshot({
        path: join(screenshotDirectory, "mobile-continuation.png"),
      });
    await mobilePage.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
    });
    if (screenshotDirectory)
      await mobilePage.screenshot({
        path: join(screenshotDirectory, "mobile-dark.png"),
      });
    await mobilePage.setViewportSize({ width: 844, height: 390 });
    if (screenshotDirectory)
      await mobilePage.screenshot({
        path: join(screenshotDirectory, "landscape-dark.png"),
      });
    const landscapeTab = await mobilePage
      .getByRole("region", { name: "Guitar tablature" })
      .boundingBox();
    const lastStringLabel = await mobilePage
      .locator("[data-tab-labels] > div")
      .last()
      .boundingBox();
    const lastStringRow = await mobilePage
      .locator('[data-tab-event="0"] > div')
      .last()
      .boundingBox();
    if (!landscapeTab || !lastStringLabel || !lastStringRow)
      throw new Error("Landscape tablature bounds are unavailable");
    assert.ok(
      lastStringLabel.y + lastStringLabel.height <=
        landscapeTab.y + landscapeTab.height,
      "all six string labels fit in the landscape tab viewport",
    );
    assert.ok(
      lastStringRow.y + lastStringRow.height <=
        landscapeTab.y + landscapeTab.height,
      "all six string rows fit in the landscape tab viewport",
    );
    assert.ok(
      landscapeTab.x >= 16 && landscapeTab.x + landscapeTab.width <= 844 - 16,
      "a landscape device without a notch keeps normal edge spacing",
    );
    const device = await mobilePage.context().newCDPSession(mobilePage);
    const notchDirections: [number, number][] = [
      [59, 0],
      [0, 59],
    ];
    for (const [left, right] of notchDirections) {
      await device.send("Emulation.setSafeAreaInsetsOverride", {
        insets: { top: 0, right, bottom: 0, left },
      });
      const safeTab = await mobilePage
        .getByRole("region", { name: "Guitar tablature" })
        .boundingBox();
      const safeLabels = await mobilePage
        .locator("[data-tab-labels]")
        .boundingBox();
      if (!safeTab || !safeLabels)
        throw new Error("Landscape safe-area bounds are unavailable");
      assert.ok(
        safeTab.x >= Math.max(16, left) &&
          safeTab.x + safeTab.width <= 844 - Math.max(16, right),
        "landscape score stays within both device safe areas",
      );
      assert.ok(
        safeLabels.x >= left,
        "fixed string labels clear the device notch",
      );
      if (screenshotDirectory)
        await mobilePage.screenshot({
          path: join(
            screenshotDirectory,
            left ? "landscape-safe-left.png" : "landscape-safe-right.png",
          ),
        });
    }
    await mobilePage.close();
  }
} finally {
  await browser?.close();
  server.kill();
  await rm(directory, { recursive: true, force: true });
}
