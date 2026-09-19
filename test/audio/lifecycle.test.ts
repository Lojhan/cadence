import { strict as assert } from "poku";
import { Microphone } from "../../packages/audio-browser/src/index.ts";

let completePermission: (stream: MediaStream) => void = () => {};
let stopped = 0;
const stream = {
  getTracks: () => [{ stop: () => stopped++ }],
} as unknown as MediaStream;
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { isSecureContext: true },
});
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    mediaDevices: {
      getUserMedia: () =>
        new Promise<MediaStream>((resolve) => {
          completePermission = resolve;
        }),
    },
  },
});
const microphone = new Microphone(() => {});
const pending = microphone.open("", "balanced");
microphone.dispose();
completePermission(stream);
await pending;
assert.equal(
  stopped,
  1,
  "permission resolving after disposal stops the granted track",
);
await assert.rejects(() =>
  microphone.unmute({ sessionId: "s", epoch: 1, mask: 145 }),
);

for (const [name, message] of [
  [
    "NotAllowedError",
    "Microphone access was blocked. Allow microphone access in your browser or system settings, then try again.",
  ],
  [
    "NotFoundError",
    "No microphone was found. Connect a microphone and try again.",
  ],
  [
    "OverconstrainedError",
    "The selected microphone is unavailable. Choose another input or System default.",
  ],
  [
    "NotReadableError",
    "The microphone could not be opened. Check that it is connected and available, then try again.",
  ],
  ["AbortError", "Microphone access was interrupted. Try again."],
]) {
  navigator.mediaDevices.getUserMedia = async () => {
    throw new DOMException("Browser-specific diagnostic", name);
  };
  const input = new Microphone(() => {});
  await assert.rejects(() => input.open("saved-input", "balanced"), {
    message,
  });
  input.dispose();
}
