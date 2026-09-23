import { strict as assert } from "poku";
import { tunerAudioConstraints } from "../../packages/audio-browser/src/tuner.ts";

assert.deepEqual(tunerAudioConstraints(""), {
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  },
  video: false,
});
assert.deepEqual(tunerAudioConstraints("usb-microphone"), {
  audio: {
    deviceId: { exact: "usb-microphone" },
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  },
  video: false,
});
