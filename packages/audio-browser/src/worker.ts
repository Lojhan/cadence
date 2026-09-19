import { initialize, RecognitionEngine } from "@cadence/audio-engine";
import { type Frame, FrameGuard, type Target } from "./protocol.ts";

// Dedicated worker entry: do not import from the browser main-thread entry.
const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage: (message: unknown) => void;
  close: () => void;
};
let engine: RecognitionEngine | undefined;
let memory: WebAssembly.Memory;
let channel: MessagePort;
let generation = 0;
let target: Target | undefined;
let sequence = 0;
let lastMeterOffset = -Infinity;
let sampleRate = 48000;
const guard = new FrameGuard();
function fail(error: unknown) {
  scope.postMessage({
    type: "error",
    message: error instanceof Error ? error.message : "Audio processing failed",
  });
}
scope.onmessage = async ({ data }) => {
  try {
    if (data.type === "init") {
      if (data.protocol !== 1) throw new Error("Audio protocol mismatch");
      const wasm = await initialize();
      memory = wasm.memory;
      sampleRate = data.sampleRate;
      engine = new RecognitionEngine(sampleRate, data.profile);
      channel = data.port;
      channel.onmessage = ({
        data: frame,
      }: MessageEvent<Frame & { type: string; buffer: ArrayBuffer }>) => {
        try {
          if (frame.type === "boundary") {
            if (
              target &&
              frame.generation === generation &&
              frame.epoch === target.epoch
            ) {
              guard.arm(generation, target.epoch);
              engine?.arm(target.mask);
              lastMeterOffset = -Infinity;
              scope.postMessage({
                type: "armed",
                generation,
                sessionId: target.sessionId,
                epoch: target.epoch,
              });
            }
            return;
          }
          if (frame.type !== "pcm") return;
          try {
            const status = guard.accept(frame);
            if (
              status === "stale" ||
              status === "invalid" ||
              !target ||
              !engine
            )
              return;
            if (status === "gap") {
              engine.reset();
              target = undefined;
              throw new Error(
                "Audio was interrupted. Unmute to resume practice.",
              );
            }
            if (frame.buffer.byteLength !== 8192)
              throw new Error("Invalid audio buffer");
            new Float32Array(memory.buffer, engine.input_pointer(), 2048).set(
              new Float32Array(frame.buffer),
            );
            if (engine.process(frame.length))
              scope.postMessage({
                type: "matched",
                generation,
                sessionId: target.sessionId,
                epoch: target.epoch,
                sequence: ++sequence,
              });
            if (frame.offset - lastMeterOffset >= sampleRate / 20) {
              scope.postMessage({
                type: "metrics",
                generation,
                level: engine.level(),
                progress: engine.progress(),
              });
              lastMeterOffset = frame.offset;
            }
          } finally {
            channel.postMessage({ type: "recycle", buffer: frame.buffer }, [
              frame.buffer,
            ]);
          }
        } catch (error) {
          fail(error);
        }
      };
      scope.postMessage({ type: "ready", protocol: 1 });
    } else if (data.type === "arm") {
      target = data.target;
      generation = data.generation;
      channel.postMessage({ type: "arm", generation, epoch: target?.epoch });
    } else if (data.type === "mute") {
      target = undefined;
      generation = data.generation;
      engine?.reset();
      channel?.postMessage({ type: "mute", generation, epoch: -1 });
    } else if (data.type === "dispose") {
      engine?.free();
      channel?.close();
      scope.close();
    }
  } catch (error) {
    fail(error);
  }
};
