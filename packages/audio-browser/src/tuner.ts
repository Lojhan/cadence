export type TunerAudioEvent =
  | { type: "reading"; frequency: number | null; confidence: number }
  | { type: "error"; message: string };

export function tunerAudioConstraints(
  deviceId: string,
): MediaStreamConstraints {
  return {
    audio: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
    video: false,
  };
}

/** Browser-only capture. Pitch and confidence are produced by the Rust/WASM worker. */
export class TunerMicrophone {
  private stream: MediaStream | undefined;
  private context: AudioContext | undefined;
  private worker: Worker | undefined;
  private capture: AudioWorkletNode | undefined;
  private source: MediaStreamAudioSourceNode | undefined;
  private gain: GainNode | undefined;
  private generation = 0;
  private disposed = false;
  private active = false;
  private cancelInit: (() => void) | undefined;

  constructor(private readonly emit: (event: TunerAudioEvent) => void) {}

  async start(deviceId = "", boostDb = 0) {
    if (!Number.isFinite(boostDb) || boostDb < 0 || boostDb > 30)
      throw new Error("Input boost must be between 0 and 30 dB");
    if (this.disposed) throw new Error("Tuner microphone has been disposed");
    this.stop();
    const generation = this.generation;
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext)
      throw new Error("Microphone access requires HTTPS or localhost.");
    const stream = await navigator.mediaDevices.getUserMedia(
      tunerAudioConstraints(deviceId),
    );
    if (generation !== this.generation || this.disposed) {
      for (const track of stream.getTracks()) track.stop();
      return;
    }
    this.stream = stream;
    try {
      const context = new AudioContext();
      this.context = context;
      context.onstatechange = () => {
        if (
          this.active &&
          this.context === context &&
          context.state !== "running"
        ) {
          this.emit({
            type: "error",
            message: "Audio was interrupted. Restart the tuner.",
          });
        }
      };
      const worker = new Worker(new URL("./tuner-worker.ts", import.meta.url), {
        type: "module",
      });
      this.worker = worker;
      const channel = new MessageChannel();
      const ready = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Tuner engine initialization timed out")),
          15_000,
        );
        this.cancelInit = () => {
          clearTimeout(timeout);
          resolve();
        };
        worker.onerror = () => {
          clearTimeout(timeout);
          reject(new Error("Tuner engine failed to load"));
          this.emit({ type: "error", message: "Tuner engine failed to load" });
        };
        worker.onmessage = ({ data }) => {
          if (generation !== this.generation) return;
          if (data.type === "ready") {
            clearTimeout(timeout);
            resolve();
          } else if (data.type === "error") {
            clearTimeout(timeout);
            reject(new Error(data.message));
            this.emit({ type: "error", message: data.message });
          } else if (
            data.type === "reading" &&
            data.generation === generation
          ) {
            this.emit({
              type: "reading",
              frequency: data.frequency,
              confidence: data.confidence,
            });
          }
        };
      });
      worker.postMessage(
        { type: "init", sampleRate: context.sampleRate, port: channel.port1 },
        [channel.port1],
      );
      await context.audioWorklet.addModule(
        new URL("./capture.js", import.meta.url),
      );
      if (generation !== this.generation || this.disposed) return;
      const capture = new AudioWorkletNode(context, "cadence-capture");
      this.capture = capture;
      capture.onprocessorerror = () =>
        this.emit({
          type: "error",
          message: "Audio capture failed. Restart the tuner.",
        });
      capture.port.postMessage({ port: channel.port2 }, [channel.port2]);
      this.source = context.createMediaStreamSource(stream);
      const gain = context.createGain();
      gain.gain.value = 10 ** (boostDb / 20);
      this.gain = gain;
      this.source.connect(gain);
      gain.connect(capture);
      capture.connect(context.destination);
      await ready;
      this.cancelInit = undefined;
      if (generation !== this.generation || this.disposed) return;
      await context.resume();
      this.active = true;
      worker.postMessage({ type: "start", generation });
      for (const track of stream.getTracks()) {
        track.onended = () =>
          this.emit({
            type: "error",
            message: "Microphone disconnected. Restart the tuner.",
          });
      }
    } catch (error) {
      if (generation === this.generation) this.stop();
      throw error;
    }
  }

  stop() {
    this.generation++;
    this.active = false;
    this.cancelInit?.();
    this.cancelInit = undefined;
    this.worker?.postMessage({ type: "stop", generation: this.generation });
    for (const track of this.stream?.getTracks() ?? []) {
      track.onended = null;
      track.stop();
    }
    this.source?.disconnect();
    this.gain?.disconnect();
    this.capture?.disconnect();
    this.worker?.terminate();
    if (this.context) this.context.onstatechange = null;
    void this.context?.close();
    this.stream = undefined;
    this.source = undefined;
    this.gain = undefined;
    this.capture = undefined;
    this.worker = undefined;
    this.context = undefined;
  }

  dispose() {
    this.disposed = true;
    this.stop();
  }
}
