import { strict as assert } from "poku";
import {
  CadenceError,
  type CadenceGateway,
  type StoredPreferences,
} from "../../packages/contracts/src/index.ts";
import { createPreferenceWriter } from "../../packages/features/src/preference-writes.ts";

const initial: StoredPreferences = {
  revision: 1,
  values: {
    hand: "right",
    theme: "light",
    numbers: true,
    profile: "balanced",
    loop: true,
    lastSongId: "catalog:four",
    diagramSize: "standard",
    voicings: {},
    tuning: "standard",
  },
};

let finishFirst: ((saved: StoredPreferences) => void) | undefined;
const sent: StoredPreferences[] = [];
const states: ReturnType<
  ReturnType<typeof createPreferenceWriter>["getState"]
>[] = [];
const gateway = {
  savePreferences: async (input: StoredPreferences) => {
    sent.push(input);
    if (sent.length === 1)
      return new Promise<StoredPreferences>((resolve) => {
        finishFirst = resolve;
      });
    return { ...input, revision: input.revision + 1 };
  },
  preferences: async () => initial,
} as CadenceGateway;
const writer = createPreferenceWriter(gateway, initial, (state) => {
  states.push(state);
});
const first = writer.update({ theme: "dark" });
void writer.update({ hand: "left" });
assert.equal(sent.length, 1);
assert.deepEqual(sent[0]?.values, { ...initial.values, theme: "dark" });
assert.deepEqual(writer.getState().values, {
  ...initial.values,
  theme: "dark",
  hand: "left",
});
const firstSent = sent[0];
if (!firstSent) throw new Error("Expected the first preference write");
finishFirst?.({ ...firstSent, revision: 2 });
assert.equal(await first, true);
assert.equal(sent.length, 2, "A second write uses the confirmed revision");
assert.equal(sent[1]?.revision, 2);
assert.equal(sent[1]?.values.hand, "left");
assert.equal(writer.getState().status, "saved");
assert.equal(states.at(-1)?.dirty, false);

let voicingWrites = 0;
const voicingWriter = createPreferenceWriter(
  {
    savePreferences: async (input: StoredPreferences) => {
      voicingWrites++;
      return {
        revision: input.revision + 1,
        values: JSON.parse(JSON.stringify(input.values)),
      };
    },
    preferences: async () => initial,
  } as CadenceGateway,
  initial,
  () => {},
);
assert.equal(await voicingWriter.update({ voicings: { C: "open" } }), true);
assert.equal(voicingWrites, 1, "A JSON response confirms the voicing map");
assert.equal(voicingWriter.getState().dirty, false);

let shouldFail = true;
const retrySent: StoredPreferences[] = [];
const retryWriter = createPreferenceWriter(
  {
    savePreferences: async (input: StoredPreferences) => {
      retrySent.push(input);
      if (shouldFail) throw new TypeError("Failed to fetch");
      return { ...input, revision: 2 };
    },
    preferences: async () => initial,
  } as CadenceGateway,
  initial,
  () => {},
);
assert.equal(await retryWriter.update({ theme: "dark" }), false);
assert.equal(retryWriter.getState().status, "error");
assert.equal(retryWriter.getState().values.theme, "dark");
assert.equal(retryWriter.getState().dirty, true);
shouldFail = false;
assert.equal(await retryWriter.retry(), true);
assert.equal(retrySent.length, 2);
assert.equal(retryWriter.getState().status, "saved");

const remote = {
  ...initial,
  revision: 3,
  values: { ...initial.values, theme: "dark" as const },
};
const conflictWriter = createPreferenceWriter(
  {
    savePreferences: async () => {
      throw new CadenceError("CONFLICT", "stale");
    },
    preferences: async () => remote,
  } as unknown as CadenceGateway,
  initial,
  () => {},
);
assert.equal(await conflictWriter.update({ hand: "left" }), false);
assert.equal(conflictWriter.getState().status, "error");
assert.equal(conflictWriter.getState().values.hand, "left");
assert.equal(await conflictWriter.discard(), true);
assert.deepEqual(conflictWriter.getState().values, remote.values);
assert.equal(conflictWriter.getState().dirty, false);
