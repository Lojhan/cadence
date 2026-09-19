export interface Session {
  songId: string;
  revision: number;
  chords: readonly string[];
  sessionId: string;
  index: number;
  epoch: number;
  status: "paused" | "listening" | "transitioning" | "completed";
  armed: boolean;
  lastSequence: number;
  loop: boolean;
}
export type Event =
  | { type: "start" | "pause" | "restart" }
  | { type: "loop"; enabled: boolean }
  | { type: "navigate"; index: number }
  | { type: "armed" | "transition-ended"; epoch: number }
  | { type: "matched"; sessionId: string; epoch: number; sequence: number };
export type Effect =
  | { type: "arm"; epoch: number; chord: string }
  | { type: "mute" | "reset" | "persist" | "success" };
export interface Result {
  state: Session;
  effects: Effect[];
}
export function createSession(
  songId: string,
  revision: number,
  chords: readonly string[],
  sessionId: string,
): Session {
  if (!chords.length) throw new Error("Cannot practice an empty chart");
  return {
    songId,
    revision,
    chords: [...chords],
    sessionId,
    index: 0,
    epoch: 0,
    status: "paused",
    armed: false,
    lastSequence: 0,
    loop: true,
  };
}
function arm(state: Session): Effect[] {
  const chord = state.chords[state.index];
  return state.status === "listening" && chord
    ? [{ type: "arm", epoch: state.epoch, chord }]
    : [];
}
export function transition(state: Session, event: Event): Result {
  const unchanged = { state, effects: [] };
  switch (event.type) {
    case "loop":
      return { state: { ...state, loop: event.enabled }, effects: [] };
    case "pause":
      return {
        state: {
          ...state,
          status: "paused",
          armed: false,
          epoch: state.epoch + 1,
        },
        effects: [{ type: "mute" }, { type: "reset" }],
      };
    case "start": {
      if (state.status === "listening" || state.status === "transitioning")
        return unchanged;
      const next: Session = {
        ...state,
        index: state.status === "completed" ? 0 : state.index,
        status: "listening",
        armed: false,
        epoch: state.epoch + 1,
      };
      return { state: next, effects: arm(next) };
    }
    case "restart":
      return {
        state: {
          ...state,
          index: 0,
          status: "paused",
          armed: false,
          epoch: state.epoch + 1,
        },
        effects: [{ type: "mute" }, { type: "reset" }, { type: "persist" }],
      };
    case "navigate": {
      if (
        !Number.isInteger(event.index) ||
        event.index < 0 ||
        event.index >= state.chords.length
      )
        return unchanged;
      const next: Session = {
        ...state,
        index: event.index,
        armed: false,
        epoch: state.epoch + 1,
        status:
          state.status === "completed"
            ? "paused"
            : state.status === "transitioning"
              ? "listening"
              : state.status,
      };
      return {
        state: next,
        effects: [{ type: "reset" }, ...arm(next), { type: "persist" }],
      };
    }
    case "armed":
      return event.epoch === state.epoch && state.status === "listening"
        ? { state: { ...state, armed: true }, effects: [] }
        : unchanged;
    case "matched": {
      if (
        state.status !== "listening" ||
        !state.armed ||
        event.sessionId !== state.sessionId ||
        event.epoch !== state.epoch ||
        !Number.isSafeInteger(event.sequence) ||
        event.sequence <= state.lastSequence
      )
        return unchanged;
      return {
        state: {
          ...state,
          status: "transitioning",
          armed: false,
          lastSequence: event.sequence,
        },
        effects: [{ type: "success" }],
      };
    }
    case "transition-ended": {
      if (state.status !== "transitioning" || event.epoch !== state.epoch)
        return unchanged;
      const atEnd = state.index === state.chords.length - 1;
      const next: Session = {
        ...state,
        index: atEnd ? (state.loop ? 0 : state.index) : state.index + 1,
        status: atEnd && !state.loop ? "completed" : "listening",
        epoch: state.epoch + 1,
        armed: false,
      };
      return {
        state: next,
        effects: [
          ...arm(next),
          ...(next.status === "completed" ? [{ type: "mute" } as const] : []),
          { type: "persist" },
        ],
      };
    }
  }
}
export function timeline(
  state: Session,
): { index: number; chord: string; current: boolean }[] {
  return state.chords
    .slice(Math.max(0, state.index - 2), state.index + 3)
    .map((chord, i) => {
      const index = Math.max(0, state.index - 2) + i;
      return { index, chord, current: index === state.index };
    });
}
