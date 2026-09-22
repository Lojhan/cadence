import { strict as assert } from "poku";
import {
  CadenceError,
  type CadenceGateway,
  type StoredPreferences,
} from "../../packages/contracts/src/index.ts";
import { createTuningPreferenceWriter } from "../../packages/features/src/tuning-preferences.ts";

const initial: StoredPreferences = {
  revision: 1,
  values: {
    hand: "right",
    theme: "system",
    numbers: true,
    profile: "balanced",
    loop: true,
    lastSongId: "catalog:four",
    diagramSize: "standard",
    voicings: {},
    tuning: "standard",
  },
};

let releaseFirst: ((value: StoredPreferences) => void) | undefined;
const writes: StoredPreferences[] = [];
const states: { tuning: string; status: string }[] = [];
const gateway = {
  savePreferences: (input: StoredPreferences) => {
    writes.push(input);
    if (writes.length === 1)
      return new Promise<StoredPreferences>((resolve) => {
        releaseFirst = resolve;
      });
    return Promise.resolve({ ...input, revision: input.revision + 1 });
  },
} as CadenceGateway;
const writer = createTuningPreferenceWriter(gateway, initial, (state) => {
  states.push({ tuning: state.values.tuning, status: state.status });
});
const first = writer.update({ tuning: "drop_d" });
writer.update({ tuning: "dadgad" });
assert.equal(writes.length, 1, "only one revision is in flight");
assert.equal(writes[0]?.revision, 1);
assert.equal(writes[0]?.values.tuning, "drop_d");
const firstWrite = writes[0];
if (!firstWrite) throw new Error("Expected a first preference write");
releaseFirst?.({ ...firstWrite, revision: 2 });
await first;
assert.equal(writes.length, 2);
assert.equal(writes[1]?.revision, 2);
assert.equal(writes[1]?.values.tuning, "dadgad");
assert.deepEqual(states.at(-1), { tuning: "dadgad", status: "saved" });

const current: StoredPreferences = {
  ...initial,
  revision: 7,
  values: { ...initial.values, theme: "dark" },
};
let attempts = 0;
const conflictGateway = {
  savePreferences: async (input: StoredPreferences) => {
    attempts++;
    if (attempts === 1) throw new CadenceError("CONFLICT", "stale");
    return { ...input, revision: input.revision + 1 };
  },
  preferences: async () => current,
} as CadenceGateway;
const conflictStates: { tuning: string; theme: string; status: string }[] = [];
const conflictWriter = createTuningPreferenceWriter(
  conflictGateway,
  initial,
  (state) =>
    conflictStates.push({
      tuning: state.values.tuning,
      theme: state.values.theme,
      status: state.status,
    }),
);
await conflictWriter.update({ tuning: "drop_d" });
assert.equal(attempts, 2);
assert.deepEqual(conflictStates.at(-1), {
  tuning: "drop_d",
  theme: "dark",
  status: "saved",
});

const failedStates: { tuning: string; status: string }[] = [];
const failedGateway = {
  savePreferences: async () => {
    throw new Error("offline");
  },
} as unknown as CadenceGateway;
const failedWriter = createTuningPreferenceWriter(
  failedGateway,
  initial,
  (state) =>
    failedStates.push({ tuning: state.values.tuning, status: state.status }),
);
await failedWriter.update({ tuning: "drop_d" });
assert.deepEqual(failedStates.at(-1), {
  tuning: "standard",
  status: "error",
});
