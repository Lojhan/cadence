export type Frame = {
  generation: number;
  epoch: number;
  sequence: number;
  offset: number;
  length: number;
};
export class FrameGuard {
  private generation = -1;
  private epoch = -1;
  private sequence = -1;
  private offset = 0;
  arm(generation: number, epoch: number) {
    this.generation = generation;
    this.epoch = epoch;
    this.sequence = -1;
    this.offset = 0;
  }
  accept(frame: Frame): "ok" | "stale" | "gap" | "invalid" {
    if (
      ![
        frame.generation,
        frame.epoch,
        frame.sequence,
        frame.offset,
        frame.length,
      ].every(Number.isSafeInteger) ||
      frame.length < 1 ||
      frame.length > 2048 ||
      frame.sequence < 0 ||
      frame.offset < 0
    )
      return "invalid";
    if (
      frame.generation !== this.generation ||
      frame.epoch !== this.epoch ||
      frame.sequence <= this.sequence
    )
      return "stale";
    const gap =
      this.sequence !== -1 &&
      (frame.sequence !== this.sequence + 1 || frame.offset !== this.offset);
    this.sequence = frame.sequence;
    this.offset = frame.offset + frame.length;
    return gap ? "gap" : "ok";
  }
}
export type Target = { sessionId: string; epoch: number; mask: number };
export type AudioEvent =
  | { type: "armed"; sessionId: string; epoch: number }
  | { type: "matched"; sessionId: string; epoch: number; sequence: number }
  | { type: "metrics"; level: number; progress: number }
  | { type: "muted" }
  | { type: "error"; message: string };
