import { browserAudioSession } from "./audio-session.ts";

/** A short look-ahead queue places clicks on the Web Audio clock, not timer ticks. */
export class Metronome {
  private context: AudioContext | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private nextTime = 0;
  private beat = 0;
  private generation = 0;
  private oscillators = new Set<OscillatorNode>();
  private volume = 70;
  private releaseOutput: (() => void) | undefined;
  private cancelPendingStart: (() => void) | undefined;

  constructor(
    private readonly makeContext: () => AudioContext = () => new AudioContext(),
    private readonly every: (
      callback: () => void,
      ms: number,
    ) => ReturnType<typeof setInterval> = (callback, ms) =>
      setInterval(callback, ms),
    private readonly clear: (timer: ReturnType<typeof setInterval>) => void = (
      timer,
    ) => clearInterval(timer),
    private readonly onStop: () => void = () => {},
    private readonly startupTimeoutMs = 4000,
  ) {}

  get running() {
    return !!this.context;
  }

  setVolume(volume: number) {
    if (!Number.isInteger(volume) || volume < 10 || volume > 100)
      throw new Error("Volume must be between 10% and 100%.");
    this.volume = volume;
  }

  async start(bpm: number, beats: number, accent = true, volume = 70) {
    if (!Number.isInteger(bpm) || bpm < 40 || bpm > 240)
      throw new Error("Tempo must be between 40 and 240 BPM.");
    if (!Number.isInteger(beats) || beats < 1 || beats > 8)
      throw new Error("Choose between 1 and 8 beats per measure.");
    this.setVolume(volume);
    this.stop();
    const generation = this.generation;
    const releaseOutput = browserAudioSession.output();
    let context: AudioContext;
    try {
      context = this.makeContext();
    } catch (error) {
      releaseOutput();
      throw error;
    }
    this.releaseOutput = releaseOutput;
    this.context = context;
    try {
      this.nextTime = context.currentTime + 0.04;
      this.beat = 0;
      // Queue the first sound in the tap itself. Safari can delay a suspended
      // context's resume acknowledgement until an output source exists.
      this.click(context, this.nextTime, accent);
      this.nextTime += 60 / bpm;
      this.beat = 1 % beats;
      const schedule = () => {
        if (this.context !== context || context.state !== "running") return;
        const duration = 60 / bpm;
        // A throttled timer must not produce a burst of missed clicks.
        if (this.nextTime < context.currentTime) {
          const missed = Math.ceil(
            (context.currentTime - this.nextTime) / duration,
          );
          this.nextTime += missed * duration;
          this.beat = (this.beat + missed) % beats;
        }
        while (this.nextTime < context.currentTime + 0.12) {
          this.click(context, this.nextTime, accent && this.beat === 0);
          this.nextTime += duration;
          this.beat = (this.beat + 1) % beats;
        }
      };
      this.timer = this.every(schedule, 25);
      if (context.state !== "running") await this.resume(context);
      if (generation !== this.generation) return;
      if (context.state !== "running")
        throw new Error("Audio output is unavailable.");
      context.onstatechange = () => {
        if (context.state !== "running") this.stop();
      };
      schedule();
    } catch (error) {
      if (this.context === context) this.stop();
      throw error;
    }
  }

  private async resume(context: AudioContext) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancel = () => {};
    const canceled = new Promise<void>((resolve) => {
      cancel = resolve;
    });
    this.cancelPendingStart = cancel;
    const deadline = new Promise<void>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error("Audio output did not start. Try again.")),
        this.startupTimeoutMs,
      );
    });
    try {
      await Promise.race([context.resume(), canceled, deadline]);
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
      if (this.cancelPendingStart === cancel)
        this.cancelPendingStart = undefined;
    }
  }

  private click(context: AudioContext, time: number, accented: boolean) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    // Brief high-frequency clicks are less likely to resemble guitar notes.
    oscillator.frequency.value = accented ? 2100 : 1600;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(
      (accented ? 0.5 : 0.35) * (this.volume / 100),
      time,
    );
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      this.oscillators.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
    this.oscillators.add(oscillator);
    oscillator.start(time);
    oscillator.stop(time + 0.025);
  }

  stop() {
    this.generation++;
    this.cancelPendingStart?.();
    this.cancelPendingStart = undefined;
    if (this.timer !== undefined) this.clear(this.timer);
    this.timer = undefined;
    for (const oscillator of this.oscillators) {
      try {
        oscillator.stop();
      } catch {}
      oscillator.disconnect();
    }
    this.oscillators.clear();
    const context = this.context;
    this.context = undefined;
    this.releaseOutput?.();
    this.releaseOutput = undefined;
    if (context) {
      context.onstatechange = null;
      void context.close();
      this.onStop();
    }
  }
}
