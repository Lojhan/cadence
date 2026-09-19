import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { strict as assert } from "poku";

const directory = await mkdtemp(join(tmpdir(), "cadence-browser-"));
const rate = 48000;
const pcm = Buffer.alloc(44 + rate * 8 * 2);
pcm.write("RIFF", 0);
pcm.writeUInt32LE(pcm.length - 8, 4);
pcm.write("WAVEfmt ", 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(rate, 24);
pcm.writeUInt32LE(rate * 2, 28);
pcm.writeUInt16LE(2, 32);
pcm.writeUInt16LE(16, 34);
pcm.write("data", 36);
pcm.writeUInt32LE(pcm.length - 44, 40);
for (let i = 0; i < rate * 8; i++) {
  const value =
    i < rate * 4
      ? [48, 52, 55, 60, 64].reduce(
          (sum, note) =>
            sum +
            0.08 *
              Math.sin(
                (2 * Math.PI * 440 * 2 ** ((note - 69) / 12) * i) / rate,
              ),
          0,
        )
      : 0;
  pcm.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
}
const wav = join(directory, "c-major.wav");
await writeFile(wav, pcm);
let logs = "";
const server = spawn(process.execPath, [".output/server/index.mjs"], {
  cwd: "apps/web",
  env: {
    ...process.env,
    PORT: "3100",
    PUBLIC_ORIGIN: "http://localhost:3100",
    DATABASE_URL: `file:${join(directory, "practice.db")}`,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (chunk) => {
  logs += chunk;
});
server.stderr.on("data", (chunk) => {
  logs += chunk;
});
let page: Page | undefined;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch("http://localhost:3100/health")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, logs);
  const oversizedStatus = await new Promise<number | undefined>(
    (resolve, reject) => {
      const request = httpRequest(
        "http://localhost:3100/health",
        { method: "POST" },
        (response) => {
          response.resume();
          resolve(response.statusCode);
        },
      );
      request.on("error", reject);
      // Multiple writes produce a chunked request with no Content-Length header.
      for (let index = 0; index < 12; index++)
        request.write(Buffer.alloc(1_000_000, 97));
      request.end();
    },
  );
  assert.equal(
    oversizedStatus,
    413,
    "the built server bounds chunked request bodies",
  );

  browser = await chromium.launch({
    args: [
      "--use-fake-ui-for-media-stream",
      "--disable-audio-input",
      "--disable-audio-output",
      "--autoplay-policy=no-user-gesture-required",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-audio-capture=${wav}`,
    ],
  });
  page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    permissions: ["microphone"],
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((nativeCapture: boolean) => {
    const events: unknown[] = [];
    const streams: MediaStream[] = [];
    Object.assign(window, {
      cadenceTestEvents: events,
      cadenceTestStreams: streams,
    });
    // This fixture replaces only the physical microphone boundary. The application
    // still uses its actual MediaStream source, AudioWorklet, worker and WASM.
    if (!nativeCapture) {
      const OriginalContext = window.AudioContext;
      window.AudioContext = class extends OriginalContext {
        constructor(options?: AudioContextOptions) {
          super({
            ...options,
            sinkId: { type: "none" },
          } as AudioContextOptions);
        }
      };
      navigator.mediaDevices.getUserMedia = async () => {
        const context = new AudioContext({ sampleRate: 48000 });
        const destination = context.createMediaStreamDestination();
        const buffer = context.createBuffer(1, 48000 * 8, 48000);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < 48000 * 4; i++)
          samples[i] = [48, 52, 55, 60, 64].reduce(
            (sum, note) =>
              sum +
              0.08 *
                Math.sin(
                  (2 * Math.PI * 440 * 2 ** ((note - 69) / 12) * i) / 48000,
                ),
            0,
          );
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(destination);
        source.start();
        await context.resume();
        events.push({ type: "synthetic-stream-ready" });
        streams.push(destination.stream);
        return destination.stream;
      };
    }
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", (event) => {
          if (events.length < 40) events.push(event.data);
        });
      }
    };
  }, process.env.CADENCE_NATIVE_MIC === "1");
  await page.goto("http://localhost:3100");
  await page.getByRole("heading", { name: "C", exact: true }).waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= window.innerHeight,
    ),
    true,
    "practice fits the phone viewport",
  );
  await page.getByRole("button", { name: "Open settings" }).click();
  await page.getByRole("combobox", { name: "Handedness" }).selectOption("left");
  await page.waitForFunction(() =>
    document
      .querySelector(".diagram")
      ?.getAttribute("aria-label")
      ?.includes("left-handed"),
  );
  await page
    .getByRole("button", { name: "Check microphone", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Stop sound check", exact: true })
    .waitFor();
  await page
    .getByRole("combobox", { name: "Chord matching", exact: true })
    .selectOption("precise");
  await page
    .getByRole("button", { name: "Check microphone", exact: true })
    .waitFor({ timeout: 3000 });
  if (process.env.CADENCE_NATIVE_MIC !== "1")
    assert.equal(
      await page.evaluate(() =>
        (
          window as unknown as { cadenceTestStreams: MediaStream[] }
        ).cadenceTestStreams.every((stream) =>
          stream.getTracks().every((track) => track.readyState === "ended"),
        ),
      ),
      true,
      "changing setup releases the previous microphone",
    );
  await page
    .getByRole("combobox", { name: "Chord matching", exact: true })
    .selectOption("balanced");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Next chord", exact: true }).click();
  await page.getByRole("heading", { name: "G", exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Previous chord", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Unmute microphone", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "G", exact: true })
    .waitFor({ timeout: 15000 });
  await page.mouse.move(10, 10);
  await page
    .getByRole("button", { name: "Mute microphone", exact: true })
    .click();
  assert.equal(
    await page.getByRole("heading", { name: "G", exact: true }).count(),
    1,
    "real worker/WASM capture advances C to G",
  );
  await page.getByRole("button", { name: "Next chord", exact: true }).click();
  await page.getByRole("button", { name: "Next chord", exact: true }).click();
  assert.equal(
    await page.getByRole("button", { name: "Next chord", exact: true }).count(),
    0,
  );
  assert.equal(
    await page
      .locator(".chord-timeline")
      .getByText("C", { exact: true })
      .count(),
    0,
  );
  await page.getByRole("button", { name: "Open music library" }).click();
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page.getByLabel("Song title", { exact: true }).fill("Browser exercise");
  await page.getByLabel("Chord chart", { exact: true }).fill("Em Am C G");
  await page.getByRole("button", { name: "Review chart" }).click();
  await page.getByRole("button", { name: "Save music" }).click();
  await page.getByRole("heading", { name: "Em", exact: true }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "Em", exact: true }).waitFor();
  await page.getByRole("button", { name: "Open music library" }).click();
  assert.equal(
    await page
      .getByRole("button", { name: /Browser exercise Your music/ })
      .count(),
    1,
    "saved song survives reload",
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Open settings" }).click();
  await page.getByRole("combobox", { name: "Appearance" }).selectOption("dark");
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "dark",
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.mouse.move(10, 10);
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector(".toolbar") as Element)
        .opacity === "0",
  );
  assert.equal(
    await page.locator(".diagram").isVisible(),
    true,
    "fretboard stays visible while idle",
  );
  assert.ok(
    await page
      .locator(".chord-timeline")
      .evaluate((element) => Number(getComputedStyle(element).opacity) >= 0.7),
    "timeline dims without disappearing",
  );
  await page.mouse.move(30, 30);
  await page.getByRole("button", { name: "Open settings" }).click();
  await page
    .getByRole("combobox", { name: "Handedness" })
    .selectOption("right");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  assert.deepEqual(errors, [], logs);
  await page.screenshot({ path: join(directory, "phone.png") });
} catch (error) {
  console.error(await page?.locator("body").innerText());
  console.error(await page?.getByLabel("Practice controls").innerHTML());
  console.error(
    await page?.evaluate(
      () =>
        (window as unknown as { cadenceTestEvents: unknown[] })
          .cadenceTestEvents,
    ),
  );
  console.error(logs);
  throw error;
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  await rm(directory, { recursive: true, force: true });
}
