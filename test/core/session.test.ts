import { strict as assert } from "poku";
import {
  createSession,
  timeline,
  transition,
} from "../../packages/core/src/index.ts";

const chart = ["C", "C", "G"];
let state = createSession("song", 1, chart, "test-session");
assert.equal(state.status, "paused");
assert.deepEqual(
  timeline(state).map((x) => x.index),
  [0, 1, 2],
);
state = transition(state, { type: "start" }).state;
const epoch = state.epoch;
assert.equal(state.status, "listening");
assert.equal(
  transition(state, { type: "matched", sessionId: "old", epoch, sequence: 1 })
    .state,
  state,
);
assert.equal(
  transition(state, {
    type: "matched",
    sessionId: "test-session",
    epoch: epoch - 1,
    sequence: 1,
  }).state,
  state,
);
assert.equal(
  transition(state, {
    type: "matched",
    sessionId: "test-session",
    epoch,
    sequence: 1,
  }).state,
  state,
  "must wait for armed acknowledgement",
);
state = transition(state, { type: "armed", epoch }).state;
const match = transition(state, {
  type: "matched",
  sessionId: "test-session",
  epoch,
  sequence: 1,
});
assert.equal(match.state.status, "transitioning");
assert.equal(match.state.index, 0, "do not race the match animation");
assert.equal(match.effects[0]?.type, "success");
state = match.state;
assert.equal(
  transition(state, {
    type: "matched",
    sessionId: "test-session",
    epoch,
    sequence: 1,
  }).state,
  state,
);
state = transition(state, { type: "transition-ended", epoch }).state;
assert.equal(state.index, 1);
assert.ok(state.epoch > epoch, "repeated chord gets a fresh epoch");
state = transition(state, { type: "pause" }).state;
assert.equal(state.status, "paused");
assert.equal(
  transition(state, {
    type: "matched",
    sessionId: "test-session",
    epoch: state.epoch,
    sequence: 2,
  }).state,
  state,
);
state = transition(state, { type: "navigate", index: 2 }).state;
assert.deepEqual(
  timeline(state).map((x) => x.index),
  [0, 1, 2],
  "loop preview must not wrap",
);
assert.equal(transition(state, { type: "navigate", index: 3 }).state, state);
state = transition(state, { type: "start" }).state;
state = transition(state, { type: "armed", epoch: state.epoch }).state;
state = transition(state, {
  type: "matched",
  sessionId: state.sessionId,
  epoch: state.epoch,
  sequence: 2,
}).state;
state = transition(state, {
  type: "transition-ended",
  epoch: state.epoch,
}).state;
assert.equal(state.index, 0, "actual completion loops");
state = transition(state, { type: "loop", enabled: false }).state;
state = transition(state, { type: "navigate", index: 2 }).state;
state = transition(state, { type: "armed", epoch: state.epoch }).state;
state = transition(state, {
  type: "matched",
  sessionId: state.sessionId,
  epoch: state.epoch,
  sequence: 3,
}).state;
state = transition(state, {
  type: "transition-ended",
  epoch: state.epoch,
}).state;
assert.equal(state.status, "completed");
assert.throws(() => createSession("empty", 1, [], "s"), /empty/);
