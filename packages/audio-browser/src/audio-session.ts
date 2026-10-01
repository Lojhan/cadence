type BrowserAudioSession = { type: string };

function currentSession(): BrowserAudioSession | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { audioSession?: BrowserAudioSession })
    .audioSession;
}

/** Coordinate Safari's page-wide output mode with microphone capture. */
export class AudioSessionMode {
  private outputCount = 0;
  private captureCount = 0;
  private session: BrowserAudioSession | undefined;
  private originalType: string | undefined;

  constructor(
    private readonly getSession: () =>
      | BrowserAudioSession
      | undefined = currentSession,
  ) {}

  output() {
    return this.acquire("output");
  }

  capture() {
    return this.acquire("capture");
  }

  private acquire(kind: "output" | "capture") {
    if (this.outputCount + this.captureCount === 0) {
      this.session = this.getSession();
      this.originalType = this.session?.type;
    }
    if (kind === "output") this.outputCount++;
    else this.captureCount++;
    this.update();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (kind === "output") this.outputCount--;
      else this.captureCount--;
      this.update();
    };
  }

  private update() {
    const type =
      this.captureCount > 0
        ? "play-and-record"
        : this.outputCount > 0
          ? "playback"
          : this.originalType;
    if (this.session && type && this.session.type !== type) {
      try {
        this.session.type = type;
      } catch {
        // Browsers without a writable Audio Session API keep their defaults.
      }
    }
    if (this.outputCount + this.captureCount === 0) {
      this.session = undefined;
      this.originalType = undefined;
    }
  }
}

export const browserAudioSession = new AudioSessionMode();
