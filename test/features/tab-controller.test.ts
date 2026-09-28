import { strict as assert } from "poku";
import type {
  AudioEvent,
  Target,
} from "../../packages/audio-browser/src/protocol.ts";
import { PracticeController } from "../../packages/features/src/controller.ts";
import { parseTab, tabEventLabel } from "../../packages/music/src/index.ts";

const tab = parseTab(
  `e|--3---2--|\nB|--0---3--|\nG|--0---2--|\nD|--0---0--|\nA|--2------|\nE|--3------|`,
);
const targets: Target[] = [];
let emitAudio: ((event: AudioEvent) => void) | undefined;
const controller = new PracticeController(
  {
    id: "knocking-exercise",
    revision: 1,
    title: "Knockin' accompaniment exercise",
    chords: tab.events.map((event) => tabEventLabel(event.notes)),
    tab,
    catalog: false,
    attribution: "Original exercise",
    tuning: "standard",
  },
  false,
  () => {},
  (emit) => {
    emitAudio = emit;
    return {
      open: async () => {},
      unmute: async (target) => {
        targets.push(target);
      },
      arm: (target) => targets.push(target),
      mute: () => {},
      dispose: () => {},
      devices: async () => [],
    };
  },
);
await controller.toggle("", "balanced");
assert.equal(controller.getSnapshot().anchorRevision, 0);
assert.deepEqual(targets.at(-1)?.notes, [67, 59, 55, 50, 47, 43]);
controller.navigate(1);
assert.equal(controller.getSnapshot().anchorRevision, 0);
assert.deepEqual(targets.at(-1)?.notes, [66, 62, 57, 50]);
controller.navigate(0);
const { session } = controller.getSnapshot();
emitAudio?.({
  type: "armed",
  sessionId: session.sessionId,
  epoch: session.epoch,
});
emitAudio?.({
  type: "matched",
  sessionId: session.sessionId,
  epoch: session.epoch,
  sequence: 1,
});
controller.finish(session.epoch);
assert.equal(controller.getSnapshot().anchorRevision, 1);
controller.dispose();
