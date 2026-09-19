import { strict as assert } from "poku";
import { ProgressWrites } from "../../packages/features/src/progress-writes.ts";

let fail = true;
const writes: number[] = [];
const queue = new ProgressWrites<{ songId: string; index: number }>(
  async (value) => {
    writes.push(value.index);
    if (fail) throw new Error("Offline");
  },
);
queue.enqueue({ songId: "a", index: 1 });
assert.equal(await queue.settled(), false);
assert.equal(queue.getSnapshot().error, "Offline");
queue.enqueue({ songId: "a", index: 2 });
queue.enqueue({ songId: "a", index: 3 });
assert.deepEqual(
  writes,
  [1],
  "failed saves remain pending without a request storm",
);
fail = false;
assert.equal(await queue.retry(), true);
assert.deepEqual(
  writes,
  [1, 3],
  "retry persists the latest position, not stale intermediate steps",
);
assert.equal(queue.getSnapshot().error, "");

let release: (() => void) | undefined;
const order: string[] = [];
const pending = new ProgressWrites<{ songId: string; index: number }>(
  async (value) => {
    order.push(`${value.songId}:${value.index}`);
    if (order.length === 1)
      await new Promise<void>((resolve) => {
        release = resolve;
      });
  },
);
pending.enqueue({ songId: "a", index: 1 });
pending.enqueue({ songId: "a", index: 2 });
pending.enqueue({ songId: "a", index: 3 });
pending.enqueue({ songId: "b", index: 4 });
release?.();
assert.equal(await pending.settled(), true);
assert.deepEqual(
  order,
  ["a:1", "a:3", "b:4"],
  "writes serialize and retain every song's latest position",
);
