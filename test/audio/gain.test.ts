import { strict as assert } from "poku";
import { Microphone } from "../../packages/audio-browser/src/index.ts";

const connections: unknown[] = [];
let disconnected = false;
let permissionRequests = 0;
const gain = {
  gain: { value: 1 },
  connect(target: unknown) {
    connections.push(target);
  },
  disconnect() {
    disconnected = true;
  },
};
const source = {
  connect(target: unknown) {
    connections.push(target);
  },
  disconnect() {},
};
const destination = {};
class Context {
  sampleRate = 48000;
  state = "running";
  destination = destination;
  audioWorklet = { async addModule() {} };
  createGain() {
    return gain;
  }
  createMediaStreamSource() {
    return source;
  }
  async close() {}
}
class Worker {
  onmessage?: (event: { data: { type: string } }) => void;
  postMessage(message: { type: string }) {
    if (message.type === "init")
      queueMicrotask(() => this.onmessage?.({ data: { type: "ready" } }));
  }
  terminate() {}
}
let capture: Capture | undefined;
class Capture {
  constructor() {
    capture = this;
  }
  port = { postMessage() {} };
  connect(target: unknown) {
    connections.push(target);
  }
  disconnect() {}
}
for (const [name, value] of Object.entries({
  window: { isSecureContext: true },
  navigator: {
    mediaDevices: {
      async getUserMedia() {
        permissionRequests++;
        return { getTracks: () => [{ enabled: false, stop() {} }] };
      },
    },
  },
  AudioContext: Context,
  Worker,
  AudioWorkletNode: Capture,
  MessageChannel: class {
    port1 = {};
    port2 = {};
  },
}))
  Object.defineProperty(globalThis, name, { configurable: true, value });

const input = new Microphone(() => {});
await input.open("", "balanced", 24);
assert.ok(
  Math.abs(gain.gain.value - 10 ** (24 / 20)) < 1e-10,
  "requested input boost reaches the audio graph",
);
assert.deepEqual(
  connections,
  [gain, capture, destination],
  "boost precedes capture; no source monitoring path is added",
);
input.dispose();
assert.ok(disconnected, "boost is disconnected on disposal");
for (const invalid of [-1, 31, Number.NaN, Number.POSITIVE_INFINITY]) {
  const microphone = new Microphone(() => {});
  await assert.rejects(
    () => microphone.open("", "balanced", invalid),
    /boost/i,
  );
  microphone.dispose();
}
assert.equal(
  permissionRequests,
  1,
  "invalid boost never requests microphone access",
);
