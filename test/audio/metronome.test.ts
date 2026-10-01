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
