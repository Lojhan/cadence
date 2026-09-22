import { initialize, TunerEngine } from "@cadence/audio-engine";
import { type Frame, FrameGuard } from "./protocol.ts";

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage: (message: unknown) => void;
  close: () => void;
};
let engine: TunerEngine | undefined;
let memory: WebAssembly.Memory;
let channel: MessagePort | undefined;
let generation = 0;
let active = false;
const guard = new FrameGuard();

scope.onmessage = async ({ data }) => {
  try {
    if (data.type === "init") {
      const wasm = await initialize();
      memory = wasm.memory;
      engine = new TunerEngine(data.sampleRate);
      const port: MessagePort = data.port;
      channel = port;
      port.onmessage = ({
        data: frame,
      }: MessageEvent<Frame & { type: string; buffer: ArrayBuffer }>) => {
        if (frame.type === "boundary") {
          if (active && frame.generation === generation)
            guard.arm(generation, 0);
          return;
        }
        if (frame.type !== "pcm") return;
        try {
          const status = guard.accept(frame);
          if (status === "stale" || status === "invalid" || !active || !engine)
            return;
          if (status === "gap") {
            engine.reset();
            scope.postMessage({
              type: "error",
              generation,
              message: "Audio was interrupted. Restart the tuner.",
            });
            return;
          }
          if (frame.buffer.byteLength !== 8192)
            throw new Error("Invalid audio buffer");
          new Float32Array(memory.buffer, engine.input_pointer(), 2048).set(
            new Float32Array(frame.buffer),
          );
          if (engine.process(frame.length)) {
            const frequency = engine.frequency();
            scope.postMessage({
              type: "reading",
              generation,
              frequency: frequency > 0 ? frequency : null,
              confidence: engine.confidence(),
            });
          }
        } catch (error) {
          scope.postMessage({
            type: "error",
            generation,
            message:
              error instanceof Error
                ? error.message
                : "Tuner processing failed",
          });
        } finally {
          channel?.postMessage({ type: "recycle", buffer: frame.buffer }, [
            frame.buffer,
          ]);
        }
      };
      scope.postMessage({ type: "ready" });
    } else if (data.type === "start") {
      generation = data.generation;
      active = true;
      engine?.reset();
      channel?.postMessage({ type: "arm", generation, epoch: 0 });
    } else if (data.type === "stop") {
      generation = data.generation;
      active = false;
      engine?.reset();
      channel?.postMessage({ type: "mute", generation, epoch: -1 });
    } else if (data.type === "dispose") {
      engine?.free();
      channel?.close();
      scope.close();
    }
  } catch (error) {
    scope.postMessage({
      type: "error",
      generation,
      message:
        error instanceof Error ? error.message : "Tuner initialization failed",
    });
  }
};
