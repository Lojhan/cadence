import {
  type AudioEvent,
  Microphone,
  type Profile,
  type Target,
} from "@cadence/audio-browser";
import type { Song } from "@cadence/contracts";
import {
  createSession,
  type Event,
  type Session,
  transition,
} from "@cadence/core";
import { parseChord } from "@cadence/music";

interface Audio {
  open(device: string, profile: Profile): Promise<void>;
  unmute(target: Target): Promise<void>;
  arm(target: Target): void;
  mute(): void;
  dispose(): void;
  devices(): Promise<MediaDeviceInfo[]>;
}
export class PracticeController {
  private snapshot: { session: Session; busy: boolean; error: string };
  private meter = { level: 0, progress: 0 };
  private meterListeners = new Set<() => void>();
  getMeter = () => this.meter;
  subscribeMeter = (listener: () => void) => {
    this.meterListeners.add(listener);
    return () => {
      this.meterListeners.delete(listener);
    };
  };
  private listeners = new Set<() => void>();
  private audio: Audio | undefined;
  private configuration = "";
  private operation = 0;
  private disposed = false;
  constructor(
    song: Song,
    loop: boolean,
    private readonly persist: (session: Session) => void,
    private readonly makeAudio: (emit: (event: AudioEvent) => void) => Audio = (
      emit,
    ) => new Microphone(emit),
  ) {
    this.snapshot = {
      session: {
        ...createSession(
          song.id,
          song.revision,
          song.chords,
          crypto.randomUUID(),
        ),
        loop,
      },
      busy: false,
      error: "",
    };
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish() {
    for (const listener of this.listeners) listener();
  }
  private target(): Target {
    const s = this.snapshot.session;
    return {
      sessionId: s.sessionId,
      epoch: s.epoch,
      mask: parseChord(s.chords[s.index] ?? "").mask,
    };
  }
  private dispatch(event: Event) {
    const result = transition(this.snapshot.session, event);
    this.snapshot = { ...this.snapshot, session: result.state };
    for (const effect of result.effects) {
      if (effect.type === "arm") this.audio?.arm(this.target());
      if (effect.type === "mute") this.audio?.mute();
      if (effect.type === "persist") this.persist(result.state);
    }
    this.publish();
  }
  private onAudio = (event: AudioEvent) => {
    if (this.disposed) return;
    if (event.type === "metrics") {
      this.meter = { level: event.level, progress: event.progress };
      for (const listener of this.meterListeners) listener();
      return;
    }
    if (
      event.type === "armed" &&
      event.sessionId === this.snapshot.session.sessionId
    )
      this.dispatch(event);
    if (event.type === "matched") this.dispatch(event);
    if (
      event.type === "muted" &&
      ["listening", "transitioning"].includes(this.snapshot.session.status)
    )
      this.pause();
    if (event.type === "error") {
      this.pause();
      this.setError(event.message);
    }
  };
  setError(error: string) {
    this.snapshot = { ...this.snapshot, error };
    this.publish();
  }
  async toggle(device: string, profile: Profile) {
    if (this.snapshot.busy || this.disposed) return;
    if (["listening", "transitioning"].includes(this.snapshot.session.status)) {
      this.pause();
      return;
    }
    const operation = ++this.operation;
    this.snapshot = { ...this.snapshot, busy: true, error: "" };
    this.publish();
    try {
      this.audio ??= this.makeAudio(this.onAudio);
      const configuration = JSON.stringify([device, profile]);
      if (configuration !== this.configuration) {
        await this.audio.open(device, profile);
        this.configuration = configuration;
      }
      if (operation !== this.operation || this.disposed) return;
      this.dispatch({ type: "start" });
      await this.audio.unmute(this.target());
    } catch (error) {
      this.configuration = "";
      this.pause();
      this.setError(
        error instanceof Error ? error.message : "Microphone unavailable",
      );
    } finally {
      this.snapshot = { ...this.snapshot, busy: false };
      this.publish();
    }
  }
  async prepare(device: string, profile: Profile) {
    this.pause();
    this.audio ??= this.makeAudio(this.onAudio);
    this.snapshot = { ...this.snapshot, busy: true };
    this.publish();
    try {
      await this.audio.open(device, profile);
      this.configuration = JSON.stringify([device, profile]);
    } catch (error) {
      this.configuration = "";
      this.setError(
        error instanceof Error ? error.message : "Microphone unavailable",
      );
    } finally {
      this.snapshot = { ...this.snapshot, busy: false };
      this.publish();
    }
  }
  pause() {
    this.operation++;
    this.dispatch({ type: "pause" });
  }
  navigate(index: number) {
    this.dispatch({ type: "navigate", index });
  }
  finish(epoch: number) {
    this.dispatch({ type: "transition-ended", epoch });
  }
  restart() {
    this.operation++;
    this.dispatch({ type: "restart" });
  }
  loop(enabled: boolean) {
    this.dispatch({ type: "loop", enabled });
  }
  replace(song: Song, index = 0) {
    this.pause();
    const session = createSession(
      song.id,
      song.revision,
      song.chords,
      crypto.randomUUID(),
    );
    this.snapshot = {
      ...this.snapshot,
      session: {
        ...session,
        loop: this.snapshot.session.loop,
        index: Math.max(0, Math.min(index, song.chords.length - 1)),
      },
    };
    this.publish();
  }
  async devices() {
    return this.audio
      ? this.audio.devices()
      : navigator.mediaDevices
        ? (await navigator.mediaDevices.enumerateDevices()).filter(
            (device) => device.kind === "audioinput",
          )
        : [];
  }
  activate() {
    this.disposed = false;
  }
  dispose() {
    this.operation++;
    this.disposed = true;
    this.audio?.dispose();
    this.audio = undefined;
    this.configuration = "";
    this.listeners.clear();
    this.meterListeners.clear();
  }
}
