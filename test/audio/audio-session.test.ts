import { strict as assert } from "poku";
import { AudioSessionMode } from "../../packages/audio-browser/src/audio-session.ts";

const session = { type: "auto" };
const mode = new AudioSessionMode(() => session);
const stopOutput = mode.output();
assert.equal(session.type, "playback", "clicks work before microphone access");
const stopCapture = mode.capture();
assert.equal(
  session.type,
  "play-and-record",
  "microphone capture can start while clicks play",
);
stopCapture();
assert.equal(session.type, "playback", "click output recovers after capture");
stopOutput();
assert.equal(session.type, "auto", "the page's previous mode is restored");
stopOutput();
assert.equal(session.type, "auto", "release is idempotent");
