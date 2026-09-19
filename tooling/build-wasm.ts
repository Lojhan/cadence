import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";

for (const [command, args] of [
  [
    "cargo",
    [
      "build",
      "--locked",
      "--release",
      "--target",
      "wasm32-unknown-unknown",
      "-p",
      "cadence-wasm",
    ],
  ],
  [
    "wasm-bindgen",
    [
      "target/wasm32-unknown-unknown/release/cadence_wasm.wasm",
      "--target",
      "web",
      "--out-dir",
      "packages/audio-engine/generated",
    ],
  ],
] as const) {
  mkdirSync("packages/audio-engine/generated", { recursive: true });
  const result = spawnSync(command, [...args], { stdio: "inherit" });
  if (result.status !== 0)
    throw new Error(
      `${command} failed. Install Rust and wasm-bindgen-cli 0.2.128.`,
      { cause: result.error },
    );
}
