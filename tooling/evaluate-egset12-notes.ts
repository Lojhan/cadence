import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  initSync,
  RecognitionEngine,
} from "../packages/audio-engine/src/index.ts";
import { readWave } from "./evaluate-wasm.ts";

type NoteCase = { file: string; start: number; duration: number; midi: number };
const manifest = JSON.parse(
  readFileSync(
    new URL("../docs/evaluation/egset12-note-cases.json", import.meta.url),
    "utf8",
  ),
) as { files: Record<string, string>; cases: NoteCase[] };
const directory = resolve(process.argv[2] ?? "artifacts/egset12");
const { memory } = initSync({
  module: readFileSync(
    new URL(
      "../packages/audio-engine/generated/cadence_wasm_bg.wasm",
      import.meta.url,
    ),
  ),
});
const audio = new Map<string, ReturnType<typeof readWave>>();
for (const [file, md5] of Object.entries(manifest.files)) {
  const path = resolve(directory, file);
  const bytes = readFileSync(path);
  if (createHash("md5").update(bytes).digest("hex") !== md5)
    throw new Error(
      `${file}: checksum differs from the published EGSet12 record`,
    );
  audio.set(file, readWave(path));
}

function feed(engine: RecognitionEngine, samples: Float32Array, rate: number) {
  let matchedAtMs: number | null = null;
  for (let offset = 0; offset < samples.length; offset += 2048) {
    const count = Math.min(2048, samples.length - offset);
    new Float32Array(memory.buffer, engine.input_pointer(), count).set(
      samples.subarray(offset, offset + count),
    );
    if (engine.process(count) && matchedAtMs === null)
      matchedAtMs = ((offset + count) / rate) * 1000;
  }
  return matchedAtMs;
}

const isolated = manifest.cases.map((entry) => {
  const recording = audio.get(entry.file);
  if (!recording) throw new Error(`${entry.file}: missing verified recording`);
  const start = Math.round(entry.start * recording.sampleRate);
  const end = Math.round((entry.start + entry.duration) * recording.sampleRate);
  if (start >= end || end > recording.samples.length)
    throw new Error("Invalid note interval");
  const samples = recording.samples.subarray(start, end);
  const accepted: { midi: number; atMs: number }[] = [];
  for (let midi = 36; midi <= 88; midi++) {
    const engine = new RecognitionEngine(recording.sampleRate, 1);
    try {
      engine.arm_note(midi);
      const atMs = feed(engine, samples, recording.sampleRate);
      if (atMs !== null) accepted.push({ midi, atMs });
    } finally {
      engine.free();
    }
  }
  return { ...entry, accepted };
});

const rapid = audio.get("02.wav");
if (!rapid) throw new Error("Missing rapid recording");
const rapidCases = manifest.cases.filter((entry) => entry.file === "02.wav");
const sequence = rapidCases.map((entry) => ({
  ...entry,
  matchedAtSeconds: null as number | null,
}));
const engine = new RecognitionEngine(rapid.sampleRate, 1);
let target = 0;
try {
  engine.arm_note(rapidCases[0]?.midi ?? 0);
  const end = Math.round(2.6 * rapid.sampleRate);
  for (let offset = 0; offset < end; offset += 2048) {
    const count = Math.min(2048, end - offset);
    new Float32Array(memory.buffer, engine.input_pointer(), count).set(
      rapid.samples.subarray(offset, offset + count),
    );
    if (engine.process(count) && target < rapidCases.length) {
      const row = sequence[target];
      if (row) row.matchedAtSeconds = (offset + count) / rapid.sampleRate;
      target++;
      if (target < rapidCases.length)
        engine.arm_note(rapidCases[target]?.midi ?? 0);
    }
  }
} finally {
  engine.free();
}

const correct = isolated.filter((row) =>
  row.accepted.some((match) => match.midi === row.midi),
);
const wrong = isolated.flatMap((row) =>
  row.accepted.filter((match) => match.midi !== row.midi),
);
console.log(
  JSON.stringify(
    {
      source: manifest.files,
      runtime: "production WASM, original WAV rate, 2048-sample blocks",
      summary: {
        isolatedCorrect: correct.length,
        isolatedTotal: isolated.length,
        wrongAccepted: wrong.length,
        wrongTargets: isolated.length * 52,
        continuousMatched: sequence.filter(
          (row) => row.matchedAtSeconds !== null,
        ).length,
        continuousBeforeAnnotatedRelease: sequence.filter(
          (row) =>
            row.matchedAtSeconds !== null &&
            row.matchedAtSeconds <= row.start + row.duration,
        ).length,
      },
      isolated,
      sequence,
    },
    null,
    2,
  ),
);
