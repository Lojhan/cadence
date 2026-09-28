import { strict as assert } from "poku";
import type { Target } from "../../packages/audio-browser/src/protocol.ts";
import { PracticeController } from "../../packages/features/src/controller.ts";
import { parseTab, tabEventLabel } from "../../packages/music/src/index.ts";

const tab = parseTab(
  `e|--3---2--|\nB|--0---3--|\nG|--0---2--|\nD|--0---0--|\nA|--2------|\nE|--3------|`,
);
const targets: Target[] = [];
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
  () => ({
    open: async () => {},
    unmute: async (target) => {
      targets.push(target);
    },
    arm: (target) => targets.push(target),
    mute: () => {},
    dispose: () => {},
    devices: async () => [],
  }),
);
await controller.toggle("", "balanced");
assert.deepEqual(targets.at(-1)?.notes, [67, 59, 55, 50, 47, 43]);
controller.navigate(1);
assert.deepEqual(targets.at(-1)?.notes, [66, 62, 57, 50]);
controller.dispose();
