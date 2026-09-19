import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

/** Content-based polling also handles editor atomic saves and new Rust modules. */
export async function rustFingerprint(root: string): Promise<string> {
  const files = ["Cargo.toml", "Cargo.lock", "rust-toolchain.toml"];
  async function collect(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await collect(path);
      else if (entry.isFile() && /(?:\.rs|\.toml)$/.test(entry.name))
        files.push(relative(root, path));
    }
  }
  await collect(join(root, "crates"));
  const hash = createHash("sha256");
  for (const file of files.sort()) {
    hash.update(file).update("\0");
    try {
      hash.update(await readFile(join(root, file)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      hash.update("missing");
    }
    hash.update("\0");
  }
  return hash.digest("hex");
}

/** Only one build runs; never expose a build invalidated by edits or shutdown. */
export class RustDevelopmentLoop {
  private dirty = false;
  private closed = false;
  private running: Promise<void> | undefined;
  constructor(
    private readonly actions: {
      stop(): Promise<void>;
      build(): Promise<boolean>;
      start(): Promise<void>;
      error?(error: unknown): void;
    },
  ) {}

  change() {
    if (this.closed) return;
    this.dirty = true;
    if (!this.running) {
      this.running = this.run().finally(() => {
        this.running = undefined;
        if (this.dirty && !this.closed) this.change();
      });
    }
  }

  private async run() {
    while (this.dirty && !this.closed) {
      this.dirty = false;
      try {
        await this.actions.stop();
        if (this.closed) break;
        const success = await this.actions.build();
        if (success && !this.dirty && !this.closed) await this.actions.start();
      } catch (error) {
        this.actions.error?.(error);
      }
    }
  }

  async close() {
    this.closed = true;
    await this.running;
    await this.actions.stop();
  }
}
