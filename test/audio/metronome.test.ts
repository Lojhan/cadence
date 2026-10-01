import { strict as assert } from "poku";
import { Metronome } from "../../packages/audio-browser/src/metronome.ts";

const ticks: Array<{ time: number; frequency: number; level: number }> = [];
const contexts: Array<{
  currentTime: number;
  state: string;
  closed: boolean;
  onstatechange: (() => void) | null;
}> = [];
let timer: (() => void) | undefined;
let stopped = 0;
const makeContext = () => {
  const context = {
    currentTime: 0,
    state: "running",
    closed: false,
    destination: {},
    onstatechange: null as (() => void) | null,
    resume: async () => {},
    close: async () => {
      context.closed = true;
    },
    createOscillator: () => {
      const oscillator = {
        frequency: { value: 0 },
        connect: () => {},
        disconnect: () => {},
        start: (time: number) =>
          ticks.push({
            time,
            frequency: oscillator.frequency.value,
            level: gain.gain.value,
          }),
        stop: () => {
          stopped++;
        },
        onended: null,
      };
      return oscillator;
    },
    createGain: () => gain,
  };
  const gain = {
    gain: {
      value: 0,
      setValueAtTime(value: number) {
        this.value = value;
      },
      exponentialRampToValueAtTime() {},
    },
    connect: () => {},
    disconnect: () => {},
  };
  contexts.push(context);
  return context;
};
const metronome = new Metronome(
  makeContext as never,
  ((callback: () => void) => {
    timer = callback;
    return 1;
  }) as never,
  (() => {
    timer = undefined;
  }) as never,
);
await assert.rejects(() => metronome.start(39, 4));
await assert.rejects(() => metronome.start(120, 9));
assert.equal(contexts.length, 0, "invalid settings never open audio");
await metronome.start(120, 4);
assert.equal(ticks.length, 1);
assert.equal(ticks[0]?.frequency, 2100, "the first beat is accented");
for (const now of [0.45, 0.95, 1.45, 1.95]) {
  if (!contexts[0]) throw new Error("Metronome context missing");
  contexts[0].currentTime = now;
  timer?.();
}
assert.deepEqual(
  ticks.map((tick) => tick.time),
  [0.04, 0.54, 1.04, 1.54, 2.04],
);
assert.equal(ticks[1]?.frequency, 1600);
assert.equal(ticks[4]?.frequency, 2100, "accent repeats on measure one");
metronome.stop();
assert.equal(contexts[0]?.closed, true);
assert.equal(timer, undefined);
assert.ok(stopped >= 5, "stopping cancels queued clicks");
await metronome.start(60, 3);
assert.equal(ticks.at(-1)?.frequency, 2100, "restart begins on beat one");
if (!contexts[1]) throw new Error("Restarted context missing");
contexts[1].state = "suspended";
contexts[1].onstatechange?.();
assert.equal(contexts[1]?.closed, true, "interrupted audio stops playback");

let acknowledgeResume: (() => void) | undefined;
const delayedContext = () => {
  const context = makeContext();
  context.state = "suspended";
  context.resume = () =>
    new Promise<void>((resolve) => {
      acknowledgeResume = () => {
        context.state = "running";
        resolve();
      };
    });
  return context;
};
const audible = new Metronome(
  delayedContext as never,
  ((callback: () => void) => {
    timer = callback;
    return 1;
  }) as never,
  (() => {
    timer = undefined;
  }) as never,
);
const beforeStart = ticks.length;
const pendingStart = audible.start(120, 4, true, 70);
assert.equal(
  ticks.length,
  beforeStart + 1,
  "first beat is scheduled without waiting for resume acknowledgement",
);
assert.equal(ticks.at(-1)?.level, 0.35, "default accent is clearly audible");
acknowledgeResume?.();
await pendingStart;
audible.setVolume(20);
const context = contexts.at(-1);
if (!context) throw new Error("Delayed context missing");
context.currentTime = 0.45;
timer?.();
assert.ok(
  Math.abs((ticks.at(-1)?.level ?? 0) - 0.07) < 1e-8,
  "volume adjusts future beats",
);
audible.setVolume(100);
context.currentTime = 0.95;
timer?.();
assert.equal(ticks.at(-1)?.level, 0.35, "loudest beat retains headroom");
await assert.rejects(() => audible.start(100, 4, true, 101));
audible.stop();

const neverResuming = () => {
  const context = makeContext();
  context.state = "suspended";
  context.resume = () => new Promise<void>(() => {});
  return context;
};
const stalled = new Metronome(
  neverResuming as never,
  (() => 1) as never,
  (() => {}) as never,
  () => {},
  10,
);
await assert.rejects(() => stalled.start(100, 4), /Audio output did not start/);
assert.equal(contexts.at(-1)?.closed, true, "a stalled start releases audio");
const canceled = new Metronome(
  neverResuming as never,
  (() => 1) as never,
  (() => {}) as never,
);
const pendingCancel = canceled.start(100, 4);
canceled.stop();
await pendingCancel;
assert.equal(canceled.running, false, "cancel cannot autoplay later");
