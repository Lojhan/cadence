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
      ? (i < rate * 2 ? [48, 52, 55, 60, 64] : [43, 47, 50, 55, 59, 67]).reduce(
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
    const contexts: AudioContext[] = [];
    Object.assign(window, {
      cadenceTestEvents: events,
      cadenceTestStreams: streams,
      cadenceTestContexts: contexts,
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
      navigator.mediaDevices.enumerateDevices = async () => {
        events.push({ type: "enumerate", count: streams.length });
        return streams.length
          ? [
              {
                deviceId: "guitar-input",
                groupId: "test",
                kind: "audioinput",
                label: "Test guitar input",
                toJSON() {
                  return { deviceId: "guitar-input" };
                },
              },
            ]
          : [];
      };
      navigator.mediaDevices.getUserMedia = async () => {
        const context = new AudioContext({ sampleRate: 48000 });
        contexts.push(context);
        const destination = context.createMediaStreamDestination();
        const buffer = context.createBuffer(1, 48000 * 8, 48000);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < 48000 * 4; i++)
          samples[i] = (
            i < 48000 * 2 ? [48, 52, 55, 60, 64] : [43, 47, 50, 55, 59, 67]
          ).reduce(
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
        for (const track of destination.stream.getTracks()) {
          const stop = track.stop.bind(track);
          track.stop = () => {
            if (track.readyState === "ended") return;
            stop();
            source.stop();
            void context.close();
          };
        }
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
          if (event.data.type !== "metrics" || events.length < 20)
            events.push(event.data);
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
  await page
    .getByRole("button", { name: "Unmute microphone", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Your guitar setup", exact: true })
    .waitFor({ timeout: 3000 });
  if (process.env.CADENCE_NATIVE_MIC !== "1")
    assert.equal(
      await page.evaluate(
        () =>
          (window as unknown as { cadenceTestStreams: MediaStream[] })
            .cadenceTestStreams.length,
      ),
      0,
      "setup opens before requesting microphone permission",
    );
  await page
    .getByRole("combobox", { name: "Playing hand", exact: true })
    .selectOption("left");
  await page
    .getByRole("button", { name: "Check microphone", exact: true })
    .click();
  if (process.env.CADENCE_NATIVE_MIC !== "1") {
    await page
      .getByRole("combobox", { name: "Microphone input", exact: true })
      .selectOption("guitar-input", { timeout: 3000 });
    assert.equal(
      await page
        .getByRole("button", { name: "Finish setup", exact: true })
        .isDisabled(),
      true,
      "a different input needs its own sound check",
    );
    assert.equal(
      await page.evaluate(() =>
        (
          window as unknown as { cadenceTestStreams: MediaStream[] }
        ).cadenceTestStreams.every((stream) =>
          stream.getTracks().every((track) => track.readyState === "ended"),
        ),
      ),
      true,
      "switching input releases the old sound check",
    );
    await page
      .getByRole("button", { name: "Check microphone", exact: true })
      .click();
  }
  await page.getByRole("button", { name: "Finish setup", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
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
      "finishing setup releases capture",
    );
  await page.reload();
  await page.getByRole("heading", { name: "C", exact: true }).waitFor();
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
  await page.waitForFunction(
    () =>
      !document.querySelector<HTMLSelectElement>(
        'select[aria-label="Chord matching"]',
      )?.disabled,
  );
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
  await page
    .getByRole("heading", { name: "Am", exact: true })
    .waitFor({ timeout: 15000 });
  await page.mouse.move(10, 10);
  await page
    .getByRole("button", { name: "Mute microphone", exact: true })
    .click();
  assert.equal(
    await page.getByRole("heading", { name: "Am", exact: true }).count(),
    1,
    "real worker/WASM capture accepts C then G without a silent gap",
  );
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
  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Next chord", exact: true }).click();
  await page
    .getByRole("button", { name: "Retry saving progress" })
    .waitFor({ timeout: 3000 });
  await page.getByRole("button", { name: "Next chord", exact: true }).click();
  await page.getByRole("heading", { name: "C", exact: true }).waitFor();
  await page.getByRole("button", { name: "Open music library" }).click();
  await page
    .getByRole("button", { name: /Browser exercise Your music/ })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("alert")
    .filter({ hasText: "Retry saving your progress before changing songs." })
    .waitFor();
  await page.context().setOffline(false);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Retry saving progress" })
    .click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("button", { name: "Retry saving progress" })
    .waitFor({ state: "hidden" });
  await page.reload();
  await page.getByRole("heading", { name: "C", exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Unmute microphone", exact: true })
      .count(),
    1,
    "retry saves the latest offline position and reload stays paused",
  );
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
    await page?.evaluate(() => ({
      events: (window as unknown as { cadenceTestEvents: unknown[] })
        .cadenceTestEvents,
      contexts: (
        window as unknown as { cadenceTestContexts: AudioContext[] }
      ).cadenceTestContexts.map((context) => ({
        time: context.currentTime,
        state: context.state,
        rate: context.sampleRate,
      })),
    })),
  );
  console.error(logs);
  throw error;
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  await rm(directory, { recursive: true, force: true });
}
