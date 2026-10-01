/** A short look-ahead queue places clicks on the Web Audio clock, not timer ticks. */
export class Metronome {
  private context: AudioContext | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private nextTime = 0;
  private beat = 0;
  private generation = 0;
  private oscillators = new Set<OscillatorNode>();

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
  ) {}

  get running() {
    return !!this.context;
  }

  async start(bpm: number, beats: number, accent = true) {
    if (!Number.isInteger(bpm) || bpm < 40 || bpm > 240)
      throw new Error("Tempo must be between 40 and 240 BPM.");
    if (!Number.isInteger(beats) || beats < 1 || beats > 8)
      throw new Error("Choose between 1 and 8 beats per measure.");
    this.stop();
    const generation = this.generation;
    const context = this.makeContext();
    this.context = context;
    try {
      await context.resume();
      if (generation !== this.generation) return;
      if (context.state !== "running")
        throw new Error("Audio output is unavailable.");
      context.onstatechange = () => {
        if (context.state !== "running") this.stop();
      };
      this.nextTime = context.currentTime + 0.04;
      this.beat = 0;
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
      schedule();
      this.timer = this.every(schedule, 25);
    } catch (error) {
      if (this.context === context) this.stop();
      throw error;
    }
  }

  private click(context: AudioContext, time: number, accented: boolean) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    // Brief, quiet high-frequency clicks are less likely to resemble guitar notes.
    oscillator.frequency.value = accented ? 2100 : 1600;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(accented ? 0.12 : 0.075, time);
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
    if (context) {
      context.onstatechange = null;
      void context.close();
      this.onStop();
    }
  }
}
