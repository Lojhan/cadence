import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import wavefile from "wavefile";

const { WaveFile } = wavefile;

import {
  engineVersion,
  initSync,
  RecognitionEngine,
} from "../packages/audio-engine/src/index.ts";

const profiles = ["gentle", "balanced", "precise"] as const;
export type EvaluationProfile = (typeof profiles)[number];
interface EvaluationCase {
  id: string;
  file: string;
  targetMask: number;
  expectedMatch: boolean;
  startSeconds: number;
  durationSeconds: number;
  split: string;
  chord: string;
  targetChord?: string;
}
let wasm: ReturnType<typeof initSync> | undefined;

/** Decode PCM with the same signed scaling and mono averaging as the Rust CLI. */
export function readWave(path: string) {
  const wave = new WaveFile(readFileSync(path));
  const format = wave.fmt as { numChannels: number; sampleRate: number };
  const channels = format.numChannels;
  if (!Number.isInteger(channels) || channels < 1 || channels > 8)
    throw new Error("Unsupported channel count");
  if (!["8", "16", "24", "32", "32f"].includes(wave.bitDepth))
    throw new Error("Evaluation requires PCM8/16/24/32 or float32 WAV");
  const interleaved = wave.getSamples(true, Float64Array);
  if (interleaved.length % channels !== 0)
    throw new Error("Incomplete audio frame");
  const samples = new Float32Array(interleaved.length / channels);
  const scale = wave.bitDepth === "32f" ? 1 : 2 ** (Number(wave.bitDepth) - 1);
  const bias = wave.bitDepth === "8" ? 128 : 0;
  for (let frame = 0; frame < samples.length; frame++) {
    let total = 0;
    for (let channel = 0; channel < channels; channel++) {
      const value = interleaved[frame * channels + channel];
      if (value === undefined || !Number.isFinite(value))
        throw new Error("Invalid audio sample");
      // fround preserves the native decoder's f32 arithmetic, including downmix.
      total = Math.fround(total + Math.fround((value - bias) / scale));
    }
    samples[frame] = Math.fround(total / channels);
  }
  return { sampleRate: format.sampleRate, samples };
}
function percentile95(values: number[]) {
  if (!values.length) return null;
  values.sort((a, b) => a - b);
  return values[Math.ceil(values.length * 0.95) - 1] ?? null;
}
export function evaluateWasm(
  manifestFile: string,
  profile: EvaluationProfile = "balanced",
) {
  const profileIndex = profiles.indexOf(profile);
  if (profileIndex < 0) throw new Error("Unknown recognition profile");
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8")) as {
    cases: EvaluationCase[];
  };
  if (!Array.isArray(manifest.cases))
    throw new Error("Manifest must contain cases");
  wasm ??= initSync({
    module: readFileSync(
      new URL(
        "../packages/audio-engine/generated/cadence_wasm_bg.wasm",
        import.meta.url,
      ),
    ),
  });
  const { memory } = wasm;
  let previous = "";
  let audio = { sampleRate: 0, samples: new Float32Array() };
  const blockTimes: number[] = [];
  const cases = manifest.cases.map((entry) => {
    if (
      typeof entry.file !== "string" ||
      typeof entry.expectedMatch !== "boolean" ||
      !Number.isInteger(entry.targetMask) ||
      entry.targetMask < 0 ||
      entry.targetMask > 0xfff ||
      !Number.isFinite(entry.startSeconds) ||
      entry.startSeconds < 0 ||
      !Number.isFinite(entry.durationSeconds) ||
      entry.durationSeconds <= 0
    )
      throw new Error("Invalid evaluation case");
    if (entry.file !== previous) {
      audio = readWave(resolve(dirname(manifestFile), entry.file));
      previous = entry.file;
    }
    const start = Math.round(entry.startSeconds * audio.sampleRate);
    const end = Math.round(
      (entry.startSeconds + entry.durationSeconds) * audio.sampleRate,
    );
    if (start >= end || end > audio.samples.length)
      throw new Error(`${entry.id}: interval outside audio`);
    const engine = new RecognitionEngine(audio.sampleRate, profileIndex);
    let latencyMs: number | null = null;
    try {
      engine.arm(entry.targetMask);
      for (let offset = start; offset < end; offset += 2048) {
        const count = Math.min(2048, end - offset);
        new Float32Array(memory.buffer, engine.input_pointer(), count).set(
          audio.samples.subarray(offset, offset + count),
        );
        const before = performance.now();
        const matched = engine.process(count);
        blockTimes.push(performance.now() - before);
        if (matched) {
          latencyMs = ((offset - start + count) / audio.sampleRate) * 1000;
          break;
        }
      }
    } finally {
      engine.free();
    }
    return {
      id: entry.id,
      split: entry.split,
      chord: entry.chord,
      targetMask: entry.targetMask,
      targetChord: entry.targetChord ?? null,
      expectedMatch: entry.expectedMatch,
      matched: latencyMs !== null,
      latencyMs,
      sampleRate: audio.sampleRate,
    };
  });
  const summary = {
    truePositive: 0,
    falseNegative: 0,
    falsePositive: 0,
    trueNegative: 0,
    p95MatchMs: null as number | null,
  };
  const latencies: number[] = [];
  for (const row of cases) {
    if (row.expectedMatch) {
      if (row.matched) {
        summary.truePositive++;
        if (row.latencyMs !== null) latencies.push(row.latencyMs);
      } else summary.falseNegative++;
    } else if (row.matched) summary.falsePositive++;
    else summary.trueNegative++;
  }
  summary.p95MatchMs = percentile95(latencies);
  return {
    engineVersion,
    runtime: "wasm",
    profile,
    summary,
    processing: {
      frames: blockTimes.length,
      p95BlockMs: percentile95(blockTimes),
      environment: "Node offline; not browser/device latency",
    },
    cases,
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const manifest = process.argv[2];
  if (!manifest || process.argv.length > 4)
    throw new Error(
      "Usage: evaluate-wasm.ts MANIFEST.json [gentle|balanced|precise]",
    );
  console.log(
    JSON.stringify(
      evaluateWasm(
        manifest,
        (process.argv[3] ?? "balanced") as EvaluationProfile,
      ),
      null,
      2,
    ),
  );
}
