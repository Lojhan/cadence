import { readFileSync } from "node:fs";
import vm from "node:vm";
import { strict as assert } from "poku";

let Capture:
  | (new () => {
      port: { onmessage: (event: unknown) => void };
      process: (inputs: Float32Array[][]) => boolean;
      pool: Float32Array[];
    })
  | undefined;
class Processor {
  port = { onmessage: (_event: unknown) => {} };
}
vm.runInNewContext(
  readFileSync("packages/audio-browser/src/capture.js", "utf8"),
  {
    AudioWorkletProcessor: Processor,
    Float32Array,
    registerProcessor: (_name: string, processor: typeof Capture) => {
      Capture = processor;
    },
  },
);
if (!Capture) throw new Error("Worklet did not register");
const capture = new Capture();
const messages: { type: string; buffer: ArrayBuffer; offset: number }[] = [];
const channel = {
  onmessage: (_event: unknown) => {},
  postMessage: (message: (typeof messages)[number]) => {
    messages.push(message);
  },
};
capture.port.onmessage({ data: { port: channel } });
const input = [
  new Float32Array(256).fill(0.25),
  new Float32Array(256).fill(0.75),
];
capture.process([input]);
assert.equal(messages.length, 0, "capture starts muted");
channel.onmessage({ data: { type: "arm", generation: 1, epoch: 1 } });
for (let i = 0; i < 8 * 8 + 8; i++) capture.process([input]);
assert.equal(
  messages.filter((m) => m.type === "pcm").length,
  8,
  "queue remains bounded when worker stalls",
);
const first = messages.find((m) => m.type === "pcm");
if (!first) throw new Error("No captured PCM");
assert.equal(
  new Float32Array(first.buffer)[0],
  0.5,
  "channels downmix to mono",
);
channel.onmessage({ data: { type: "recycle", buffer: first.buffer } });
for (let i = 0; i < 8; i++) capture.process([input]);
assert.equal(
  messages.at(-1)?.offset,
  18432,
  "dropped samples remain visible as an offset gap",
);
channel.onmessage({ data: { type: "mute", generation: 2, epoch: 2 } });
const count = messages.length;
for (let i = 0; i < 8; i++) capture.process([input]);
assert.equal(messages.length, count, "mute stops PCM immediately");
