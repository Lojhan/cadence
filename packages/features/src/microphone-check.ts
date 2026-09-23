import {
  type AudioEvent,
  Microphone,
  type Profile,
} from "@cadence/audio-browser";
import { useEffect, useState, useSyncExternalStore } from "react";

interface CheckAudio {
  open(device: string, profile: Profile, boostDb: number): Promise<void>;
  unmute(target: {
    sessionId: string;
    epoch: number;
    mask: number;
  }): Promise<void>;
  dispose(): void;
}

type Snapshot = {
  listening: boolean;
  busy: boolean;
  error: string;
  level: number;
  heardSignal: boolean;
};

export class MicrophoneCheckController {
  private snapshot: Snapshot = {
    listening: false,
    busy: false,
    error: "",
    level: 0,
    heardSignal: false,
  };
  private listeners = new Set<() => void>();
  private microphone: CheckAudio | null = null;
  private generation = 0;
  constructor(
    private readonly makeAudio: (
      emit: (event: AudioEvent) => void,
    ) => CheckAudio = (emit) => new Microphone(emit),
  ) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private set(patch: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }
  stop = () => {
    this.generation++;
    this.microphone?.dispose();
    this.microphone = null;
    this.set({ listening: false, busy: false, level: 0 });
  };
  start = async (
    device: string,
    profile: Profile,
    boostDb: number,
    onOpen?: () => void,
  ) => {
    this.stop();
    const generation = this.generation;
    this.set({ busy: true, error: "", heardSignal: false });
    const input = this.makeAudio((event) => {
      if (generation !== this.generation || this.microphone !== input) return;
      if (event.type === "metrics") {
        this.set({
          level: event.level,
          heardSignal: this.snapshot.heardSignal || event.level >= 0.008,
        });
      } else if (event.type === "error") {
        this.stop();
        this.set({ error: event.message, heardSignal: false });
      }
    });
    this.microphone = input;
    try {
      await input.open(device, profile, boostDb);
      if (generation !== this.generation) return;
      onOpen?.();
      await input.unmute({ sessionId: "sound-check", epoch: 1, mask: 145 });
      if (generation === this.generation) this.set({ listening: true });
    } catch (error) {
      if (generation === this.generation) {
        this.stop();
        this.set({
          error:
            error instanceof Error ? error.message : "Microphone unavailable",
        });
      }
    } finally {
      if (generation === this.generation) this.set({ busy: false });
    }
  };
  dispose() {
    this.stop();
    this.listeners.clear();
  }
}

export function useMicrophoneCheck() {
  const [controller] = useState(() => new MicrophoneCheckController());
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useEffect(() => () => controller.dispose(), [controller]);
  return { ...state, start: controller.start, stop: controller.stop };
}
