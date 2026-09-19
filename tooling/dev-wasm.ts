import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { RustDevelopmentLoop, rustFingerprint } from "./wasm-watch.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const posix = process.platform !== "win32";
function command(args: string[]) {
  const child = spawn("pnpm", args, {
    cwd: root,
    stdio: "inherit",
    detached: posix,
  });
  let ended = false;
  const done = new Promise<boolean>((resolve) => {
    child.once("error", (error) => {
      console.error(error.message);
      resolve(false);
    });
    child.once("close", (code) => {
      ended = true;
      resolve(code === 0);
    });
  });
  function signal(value: NodeJS.Signals) {
    if (ended || !child.pid) return;
    try {
      if (posix) process.kill(-child.pid, value);
      else child.kill(value);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
    }
  }
  return {
    done,
    async stop() {
      signal("SIGTERM");
      const timer = setTimeout(() => signal("SIGKILL"), 5_000);
      try {
        await done;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
let build: ReturnType<typeof command> | undefined;
let server: ReturnType<typeof command> | undefined;
let closing = false;
const loop = new RustDevelopmentLoop({
  async stop() {
    const previous = server;
    server = undefined;
    await previous?.stop();
  },
  async build() {
    console.info("Rust changed: building WASM before starting the dev server…");
    const current = command(["build:wasm"]);
    build = current;
    const success = await current.done;
    build = undefined;
    if (!success && !closing)
      console.error(
        "WASM build failed. Fix the Rust sources; watching for changes.",
      );
    return success;
  },
  async start() {
    const current = command([
      "--filter",
      "@cadence/web",
      "dev",
      "--strictPort",
    ]);
    server = current;
    void current.done.then(() => {
      if (server === current && !closing) {
        console.error("Development server exited unexpectedly.");
        process.exitCode = 1;
        void close();
      }
    });
  },
  error(error) {
    console.error(error);
  },
});
let previous = await rustFingerprint(root);
let polling = false;
const timer = setInterval(async () => {
  if (polling || closing) return;
  polling = true;
  try {
    const fingerprint = await rustFingerprint(root);
    if (fingerprint !== previous) {
      previous = fingerprint;
      loop.change();
    }
  } catch (error) {
    console.error("Cannot read Rust sources:", error);
  } finally {
    polling = false;
  }
}, 500);
async function close() {
  if (closing) return;
  closing = true;
  clearInterval(timer);
  const finished = loop.close();
  await build?.stop();
  await finished;
}
process.once("SIGINT", () => void close());
process.once("SIGTERM", () => void close());
loop.change();
