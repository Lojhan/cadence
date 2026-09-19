import { strict as assert } from "poku";
import { FrameGuard } from "../../packages/audio-browser/src/protocol.ts";

const guard = new FrameGuard();
guard.arm(2, 8);
assert.equal(
  guard.accept({
    generation: 1,
    epoch: 8,
    sequence: 1,
    offset: 0,
    length: 2048,
  }),
  "stale",
);
assert.equal(
  guard.accept({
    generation: 2,
    epoch: 7,
    sequence: 1,
    offset: 0,
    length: 2048,
  }),
  "stale",
);
assert.equal(
  guard.accept({
    generation: 2,
    epoch: 8,
    sequence: 1,
    offset: 0,
    length: 2048,
  }),
  "ok",
);
assert.equal(
  guard.accept({
    generation: 2,
    epoch: 8,
    sequence: 1,
    offset: 0,
    length: 2048,
  }),
  "stale",
);
assert.equal(
  guard.accept({
    generation: 2,
    epoch: 8,
    sequence: 3,
    offset: 4096,
    length: 2048,
  }),
  "gap",
);
assert.equal(
  guard.accept({
    generation: 2,
    epoch: 8,
    sequence: 4,
    offset: 6144,
    length: 2048,
  }),
  "ok",
);
assert.equal(
  guard.accept({
    generation: 2,
    epoch: 8,
    sequence: 5,
    offset: 8192,
    length: 2049,
  }),
  "invalid",
);
guard.arm(3, 9);
assert.equal(
  guard.accept({
    generation: 3,
    epoch: 9,
    sequence: 1,
    offset: 0,
    length: 2048,
  }),
  "ok",
);
