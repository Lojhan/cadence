import { strict as assert } from "poku";
import { MicrophoneCheckController } from "../../packages/features/src/microphone-check.ts";

let emitted:
  | ((event: { type: "metrics"; level: number; progress: number }) => void)
  | undefined;
let disposed = 0;
const check = new MicrophoneCheckController((emit) => {
  emitted = emit as typeof emitted;
  return {
    open: async () => {},
    unmute: async () => {},
    dispose: () => {
      disposed++;
    },
  };
});
await check.start("", "balanced", 6);
assert.equal(check.getSnapshot().listening, true);
emitted?.({ type: "metrics", level: 0.02, progress: 0 });
assert.equal(check.getSnapshot().heardSignal, true);
assert.equal(check.getSnapshot().level, 0.02);
check.stop();
assert.equal(check.getSnapshot().listening, false);
assert.equal(disposed, 1);
