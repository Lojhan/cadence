/** Serialize revisions and retain the latest unsaved position for each song. */
export class ProgressWrites<T extends { songId: string }> {
  private pending = new Map<string, T>();
  private running: Promise<boolean> | undefined;
  private state = { error: "", saving: false };
  private listeners = new Set<() => void>();
  constructor(private readonly save: (value: T) => Promise<void>) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(error: string, saving: boolean) {
    this.state = { error, saving };
    for (const listener of this.listeners) listener();
  }
  enqueue(value: T) {
    this.pending.set(value.songId, value);
    if (!this.state.error) void this.retry();
  }
  settled() {
    return this.running ?? Promise.resolve(this.pending.size === 0);
  }
  retry = (): Promise<boolean> => {
    if (this.running) return this.running;
    this.publish(this.state.error, true);
    this.running = this.drain().finally(() => {
      this.running = undefined;
    });
    return this.running;
  };
  private async drain() {
    while (this.pending.size) {
      const value = this.pending.values().next().value;
      if (!value) break;
      try {
        await this.save(value);
      } catch (error) {
        this.publish(
          error instanceof Error
            ? error.message
            : "Could not save your position",
          false,
        );
        return false;
      }
      if (this.pending.get(value.songId) === value)
        this.pending.delete(value.songId);
    }
    this.publish("", false);
    return true;
  }
}
