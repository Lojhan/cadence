import { strict as assert } from "poku";
import {
  type AudioEvent,
  Microphone,
} from "../../packages/audio-browser/src/index.ts";

const events: AudioEvent[] = [];
const track = { enabled: false, onended: null, stop() {} };
let context: FakeContext | undefined;
let worker: FakeWorker | undefined;
let capture: FakeCapture | undefined;
class FakeContext {
  state = "suspended";
  sampleRate = 48000;
  destination = {};
  onstatechange: (() => void) | null = null;
  audioWorklet = { async addModule() {} };
  constructor() {
    context = this;
  }
  createMediaStreamSource() {
    return { connect() {}, disconnect() {} };
  }
  async resume() {
    this.change("running");
  }
  async close() {
    this.change("closed");
  }
  change(state: string) {
    this.state = state;
    this.onstatechange?.();
  }
}
class FakeWorker {
  onerror: (() => void) | undefined;
  onmessage: ((event: { data: unknown }) => void) | undefined;
  messages: { type: string; generation?: number }[] = [];
  constructor() {
    worker = this;
  }
  postMessage(message: { type: string; generation?: number }) {
    this.messages.push(message);
    if (message.type === "init")
      queueMicrotask(() => this.onmessage?.({ data: { type: "ready" } }));
  }
  terminate() {}
}
class FakeCapture {
  onprocessorerror: (() => void) | undefined;
  constructor() {
    capture = this;
  }
  port = { postMessage() {} };
  connect() {}
  disconnect() {}
}
for (const [name, value] of Object.entries({
  window: { isSecureContext: true },
  navigator: {
    mediaDevices: {
      async getUserMedia() {
        return { getTracks: () => [track] };
      },
    },
  },
  AudioContext: FakeContext,
  Worker: FakeWorker,
  AudioWorkletNode: FakeCapture,
  MessageChannel: class {
    port1 = {};
    port2 = {};
  },
}))
  Object.defineProperty(globalThis, name, { configurable: true, value });

for (const interruption of ["suspended", "interrupted", "closed"]) {
  const input = new Microphone((event) => events.push(event));
  await input.open("", "balanced");
  if (!context || !worker) throw new Error("Audio fixture did not initialize");
  const activeContext = context;
  const activeWorker = worker;
  assert.equal(
    events.filter((event) => event.type === "error").length,
    0,
    "initial suspended context is not a capture failure",
  );
  await input.unmute({ sessionId: "s", epoch: 1, mask: 145 });
  assert.equal(track.enabled, true);
  const generation = activeWorker.messages.at(-1)?.generation;
  activeContext.change(interruption);
  assert.equal(
    track.enabled,
    false,
    `${interruption} immediately disables capture`,
  );
  assert.equal(
    events.at(-1)?.type,
    "error",
    "interruption informs the controller so it pauses practice",
  );
  const before = events.length;
  activeWorker.onmessage?.({
    data: { type: "matched", generation, epoch: 1, sessionId: "s" },
  });
  assert.equal(
    events.length,
    before,
    "queued pre-interruption matches cannot advance practice",
  );
  activeContext.change("running");
  assert.equal(track.enabled, false, "browser recovery never silently unmutes");
  if (interruption !== "closed") {
    await input.unmute({ sessionId: "s", epoch: 2, mask: 145 });
    assert.equal(
      track.enabled,
      true,
      "explicit unmute can recover a resumed context",
    );
  }
  const beforeDispose = events.length;
  input.dispose();
  assert.equal(
    events.length,
    beforeDispose,
    "intentional disposal does not report a new interruption",
  );
  events.length = 0;
}

for (const failure of ["worker", "processor"]) {
  const input = new Microphone((event) => events.push(event));
  await input.open("", "balanced");
  if (!worker || !capture) throw new Error("Audio fixture did not initialize");
  const failedWorker = worker;
  const failedCapture = capture;
  const crash = () =>
    failure === "worker"
      ? failedWorker.onerror?.()
      : failedCapture.onprocessorerror?.();
  await input.unmute({ sessionId: "s", epoch: 1, mask: 145 });
  crash();
  assert.equal(track.enabled, false, `${failure} crash disables capture`);
  assert.equal(
    events.at(-1)?.type,
    "error",
    `${failure} crash reports a recoverable error after initialization`,
  );
  await input.open("", "balanced");
  await input.unmute({ sessionId: "s", epoch: 2, mask: 145 });
  const before = events.length;
  crash();
  assert.equal(
    events.length,
    before,
    `late ${failure} errors from a replaced engine are ignored`,
  );
  assert.equal(
    track.enabled,
    true,
    `late ${failure} errors cannot mute the replacement`,
  );
  input.dispose();
  events.length = 0;
}
