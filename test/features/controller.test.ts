import { strict as assert } from "poku";
import type { AudioEvent } from "../../packages/audio-browser/src/protocol.ts";
import { PracticeController } from "../../packages/features/src/controller.ts";

let audioEvent: (event: AudioEvent) => void = () => {};
let resolveOpen: () => void = () => {};
let unmutes = 0;
let opens = 0;
const controller = new PracticeController(
  {
    id: "song",
    revision: 1,
    title: "Test",
    chords: ["C", "G"],
    catalog: false,
    attribution: "",
  },
  true,
  () => {},
  (emit) => {
    audioEvent = emit;
    return {
      open: () =>
        new Promise<void>((resolve) => {
          opens++;
          resolveOpen = resolve;
        }),
      unmute: async () => {
        unmutes++;
      },
      arm: () => {},
      mute: () => {},
      dispose: () => {},
      devices: async () => [],
    };
  },
);
const pending = controller.toggle("", "balanced");
controller.pause();
resolveOpen();
await pending;
assert.equal(
  unmutes,
  0,
  "opening settings during permission cannot later unmute",
);
const next = controller.toggle("", "balanced");
await next;
assert.equal(unmutes, 1);
const state = controller.getSnapshot().session;
audioEvent({
  type: "matched",
  sessionId: state.sessionId,
  epoch: state.epoch,
  sequence: 1,
});
assert.equal(
  controller.getSnapshot().session.status,
  "listening",
  "unacknowledged match is ignored",
);
audioEvent({ type: "armed", sessionId: state.sessionId, epoch: state.epoch });
audioEvent({
  type: "matched",
  sessionId: state.sessionId,
  epoch: state.epoch,
  sequence: 2,
});
assert.equal(controller.getSnapshot().session.status, "transitioning");
controller.finish(state.epoch);
assert.equal(controller.getSnapshot().session.index, 1);
audioEvent({ type: "error", message: "Microphone disconnected" });
assert.equal(controller.getSnapshot().session.status, "paused");
const retry = controller.toggle("", "balanced");
assert.equal(
  opens,
  2,
  "retry after disconnect opens a fresh microphone stream",
);
resolveOpen();
await retry;
assert.equal(unmutes, 2, "retry unmutes the replacement stream");
assert.equal(controller.getSnapshot().error, "");
controller.dispose();
