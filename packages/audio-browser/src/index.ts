import type { AudioEvent, Target } from "./protocol.ts";

export type { AudioEvent, Target } from "./protocol.ts";
export type Profile = "gentle" | "balanced" | "precise";
export class Microphone {
  private stream: MediaStream | undefined;
  private context: AudioContext | undefined;
  private worker: Worker | undefined;
  private capture: AudioWorkletNode | undefined;
  private gain: GainNode | undefined;
  private source: MediaStreamAudioSourceNode | undefined;
  private generation = 0;
  private streamGeneration = 0;
  private matchSequence = 0;
  private cancelInit: (() => void) | undefined;
  private disposed = false;
  private listening = false;
  constructor(private readonly emit: (event: AudioEvent) => void) {}
  async devices() {
    return (await navigator.mediaDevices.enumerateDevices()).filter(
      (device) => device.kind === "audioinput",
    );
  }
  async open(deviceId: string, profile: Profile, boostDb = 0) {
    if (!Number.isFinite(boostDb) || boostDb < 0 || boostDb > 30)
      throw new Error("Input boost must be between 0 and 30 dB");
    if (this.disposed) throw new Error("Microphone has been disposed");
    this.release();
    const request = ++this.generation;
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext)
      throw new Error("Microphone access requires HTTPS or localhost.");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
    } catch (error) {
      throw new Error(captureErrorMessage(error), { cause: error });
    }
    if (request !== this.generation || this.disposed) {
      for (const track of stream.getTracks()) track.stop();
      return;
    }
    this.stream = stream;
    for (const track of stream.getTracks()) {
      track.enabled = false;
      track.onended = () => {
        this.mute();
        this.emit({
          type: "error",
          message: "Microphone disconnected. Choose an input and try again.",
        });
      };
    }
    try {
      const context = new AudioContext();
      this.context = context;
      context.onstatechange = () => {
        if (
          this.context !== context ||
          !this.listening ||
          context.state === "running"
        )
          return;
        this.mute();
        this.emit({
          type: "error",
          message: "Audio was interrupted. Unmute to resume practice.",
        });
      };
      const worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
      this.worker = worker;
      const channel = new MessageChannel();
      let failEngine: ((message: string) => void) | undefined;
      const ready = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Audio engine initialization timed out")),
          15000,
        );
        this.cancelInit = () => {
          clearTimeout(timeout);
          resolve();
        };
        failEngine = (message) => {
          if (request !== this.generation || this.disposed) return;
          clearTimeout(timeout);
          reject(new Error(message));
          this.mute();
          this.emit({ type: "error", message });
        };
        worker.onerror = () =>
          failEngine?.("Audio engine failed. Unmute to try again.");
        worker.onmessage = ({ data }) => {
          if (request !== this.generation || this.disposed) return;
          if (data.type === "ready") {
            clearTimeout(timeout);
            resolve();
          } else if (data.type === "error") {
            failEngine?.(data.message);
          } else if (
            this.listening &&
            data.generation === this.streamGeneration
          ) {
            this.emit(
              data.type === "matched"
                ? { ...data, sequence: ++this.matchSequence }
                : data,
            );
          }
        };
      });
      worker.postMessage(
        {
          type: "init",
          protocol: 1,
          sampleRate: context.sampleRate,
          profile: ["gentle", "balanced", "precise"].indexOf(profile),
          port: channel.port1,
        },
        [channel.port1],
      );
      await Promise.all([
        ready,
        (async () => {
          await context.audioWorklet.addModule(
            new URL("./capture.js", import.meta.url),
          );
          if (request !== this.generation || this.disposed) return;
          const capture = new AudioWorkletNode(context, "cadence-capture");
          this.capture = capture;
          capture.onprocessorerror = () =>
            failEngine?.("Audio capture failed. Unmute to try again.");
          capture.port.postMessage({ port: channel.port2 }, [channel.port2]);
          this.source = context.createMediaStreamSource(stream);
          if (boostDb > 0) {
            this.gain = context.createGain();
            this.gain.gain.value = 10 ** (boostDb / 20);
            this.source.connect(this.gain);
            this.gain.connect(capture);
          } else this.source.connect(capture);
          capture.connect(context.destination);
        })(),
      ]);
    } catch (error) {
      if (request === this.generation) this.release();
      throw error;
    }
  }
  async unmute(target: Target) {
    if (!this.worker || !this.context || !this.stream)
      throw new Error("Choose a microphone first.");
    const request = this.generation;
    const streamGeneration = this.streamGeneration;
    await this.context.resume();
    if (
      this.disposed ||
      request !== this.generation ||
      streamGeneration !== this.streamGeneration
    )
      return;
    this.listening = true;
    for (const track of this.stream.getTracks()) track.enabled = true;
    this.arm(target);
  }
  arm(target: Target) {
    if (this.listening)
      this.worker?.postMessage({
        type: "arm",
        generation: this.streamGeneration,
        target,
      });
  }
  mute() {
    this.streamGeneration++;
    this.listening = false;
    for (const track of this.stream?.getTracks() ?? []) track.enabled = false;
    this.worker?.postMessage({
      type: "mute",
      generation: this.streamGeneration,
    });
    this.emit({ type: "muted" });
  }
  private release() {
    this.cancelInit?.();
    this.cancelInit = undefined;
    this.streamGeneration++;
    this.listening = false;
    this.generation++;
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
    this.release();
  }
}

function captureErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  switch (name) {
    case "NotAllowedError":
      return "Microphone access was blocked. Allow microphone access in your browser or system settings, then try again.";
    case "NotFoundError":
      return "No microphone was found. Connect a microphone and try again.";
    case "OverconstrainedError":
      return "The selected microphone is unavailable. Choose another input or System default.";
    case "NotReadableError":
      return "The microphone could not be opened. Check that it is connected and available, then try again.";
    case "AbortError":
      return "Microphone access was interrupted. Try again.";
    default:
      return "Microphone access failed. Check your input and browser permissions, then try again.";
  }
}
