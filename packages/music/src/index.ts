import { CadenceError, type Song } from "@cadence/contracts";

export interface Voicing {
  id: string;
  frets: readonly number[];
  fingers: readonly number[];
  baseFret: number;
  barre?: { fret: number; from: number; to: number };
}
export interface Chord {
  symbol: string;
  root: number;
  quality: string;
  notes: number[];
  mask: number;
  voicings: Voicing[];
}
const roots: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};
const intervals: Record<string, readonly number[]> = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  add9: [0, 4, 7, 2],
};
const open: Record<string, [number[], number[]]> = {
  C: [
    [-1, 3, 2, 0, 1, 0],
    [0, 3, 2, 0, 1, 0],
  ],
  G: [
    [3, 2, 0, 0, 0, 3],
    [2, 1, 0, 0, 0, 3],
  ],
  Am: [
    [-1, 0, 2, 2, 1, 0],
    [0, 0, 2, 3, 1, 0],
  ],
  D: [
    [-1, -1, 0, 2, 3, 2],
    [0, 0, 0, 1, 3, 2],
  ],
  Dm: [
    [-1, -1, 0, 2, 3, 1],
    [0, 0, 0, 2, 3, 1],
  ],
  E: [
    [0, 2, 2, 1, 0, 0],
    [0, 2, 3, 1, 0, 0],
  ],
  Em: [
    [0, 2, 2, 0, 0, 0],
    [0, 2, 3, 0, 0, 0],
  ],
  A: [
    [-1, 0, 2, 2, 2, 0],
    [0, 0, 1, 2, 3, 0],
  ],
  Cmaj7: [
    [-1, 3, 2, 0, 0, 0],
    [0, 3, 2, 0, 0, 0],
  ],
  Dm7: [
    [-1, -1, 0, 2, 1, 1],
    [0, 0, 0, 2, 1, 1],
  ],
  Dsus2: [
    [-1, -1, 0, 2, 3, 0],
    [0, 0, 0, 1, 3, 0],
  ],
  Dsus4: [
    [-1, -1, 0, 2, 3, 3],
    [0, 0, 0, 1, 3, 4],
  ],
  Asus2: [
    [-1, 0, 2, 2, 0, 0],
    [0, 0, 2, 3, 0, 0],
  ],
  Asus4: [
    [-1, 0, 2, 2, 3, 0],
    [0, 0, 1, 2, 3, 0],
  ],
  Cadd9: [
    [-1, 3, 2, 0, 3, 0],
    [0, 2, 1, 0, 3, 0],
  ],
};

import { curatedSongs } from "./catalog-curated.js";
import {
  adaptVoicingForTuning,
  getTuningPreset,
  normalizeTuningId,
} from "./tuning.js";

export * from "./tuning.js";

const chordPattern = /^([A-G])([#b]?)(maj7|m7|sus2|sus4|add9|m|7)?$/;
export function parseChord(input: string, tuning = "standard"): Chord {
  const symbol = input.trim();
  const match = chordPattern.exec(symbol);
  if (!match)
    throw new CadenceError("UNSUPPORTED_CHORD", `Unsupported chord: ${symbol}`);
  const root =
    ((roots[match[1] ?? ""] ?? 0) +
      (match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0) +
      12) %
    12;
  const quality = match[3] ?? "";
  const notes = (intervals[quality] ?? []).map((n) => (root + n) % 12);
  const standard = open[symbol];
  const voicings: Voicing[] = [];
  if (standard)
    voicings.push({
      id: `${symbol}:open`,
      frets: standard[0],
      fingers: standard[1],
      baseFret: 1,
      ...(symbol === "Dm7" ? { barre: { fret: 1, from: 4, to: 5 } } : {}),
    });
  if (
    quality === "" ||
    quality === "m" ||
    quality === "7" ||
    quality === "m7"
  ) {
    const fret = (root - 4 + 12) % 12;
    const shape =
      quality === "m"
        ? [0, 2, 2, 0, 0, 0]
        : quality === "7"
          ? [0, 2, 0, 1, 0, 0]
          : quality === "m7"
            ? [0, 2, 0, 0, 0, 0]
            : [0, 2, 2, 1, 0, 0];
    const fingers = shape.map((f, i) =>
      f === 0 ? (fret === 0 ? 0 : 1) : i === 1 ? 3 : i === 2 ? 4 : 2,
    );
    voicings.push({
      id: `${symbol}:e-shape`,
      frets: shape.map((f) => f + fret),
      fingers,
      baseFret: Math.max(1, fret),
      ...(fret > 0 ? { barre: { fret, from: 0, to: 5 } } : {}),
    });
  }
  if (quality === "maj7" && !standard) {
    const fret = (root - 9 + 12) % 12;
    voicings.push({
      id: `${symbol}:a-maj7`,
      frets: [-1, fret, fret + 2, fret + 1, fret + 2, fret],
      fingers: [0, fret ? 1 : 0, 3, 2, 4, fret ? 1 : 0],
      baseFret: Math.max(1, fret),
      ...(fret > 0 ? { barre: { fret, from: 1, to: 5 } } : {}),
    });
  }
  if (!voicings.length)
    throw new CadenceError(
      "UNSUPPORTED_CHORD",
      `Unsupported chord fingering: ${symbol}`,
    );

  const normalizedTuning = normalizeTuningId(tuning);
  const finalVoicings =
    normalizedTuning === "standard"
      ? voicings
      : voicings.map((v) => adaptVoicingForTuning(v, normalizedTuning));

  return {
    symbol,
    root,
    quality,
    notes,
    mask: notes.reduce((mask, n) => mask | (1 << n), 0),
    voicings: finalVoicings,
  };
}
export function fingeringPitchClasses(
  voicing: Voicing,
  tuning = "standard",
): Set<number> {
  const preset = getTuningPreset(tuning);
  const openPitches = preset.openPitchClasses;
  return new Set(
    voicing.frets.flatMap((f, i) =>
      f < 0 ? [] : [((openPitches[i] ?? 0) + f) % 12],
    ),
  );
}
export function parseChart(text: string): { chords: string[]; tuning: string } {
  if (new TextEncoder().encode(text).length > 1_048_576)
    throw new CadenceError("INVALID_CHART", "Chart size limit exceeded");
  const chords: string[] = [];
  let detectedTuning = "standard";
  let repeatStart: number | null = null;
  const append = (token: string) => {
    if (token === "|:") {
      if (repeatStart !== null)
        throw new CadenceError(
          "INVALID_CHART",
          "Nested repeats are unsupported",
        );
      repeatStart = chords.length;
      return;
    }
    if (token === ":|") {
      if (repeatStart === null)
        throw new CadenceError("INVALID_CHART", "Repeat has no start");
      const repeated = chords.slice(repeatStart);
      repeatStart = null;
      chords.push(...repeated);
    } else if (token !== "|") chords.push(parseChord(token).symbol);
    if (chords.length > 10_000)
      throw new CadenceError("INVALID_CHART", "Chord event limit exceeded");
  };
  for (const [lineNumber, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("{")) {
      const tuningMatch = /^\{(?:tuning|tune):?\s*([^}]+)\}$/i.exec(line);
      if (tuningMatch) {
        detectedTuning = normalizeTuningId(tuningMatch[1] ?? "");
        continue;
      }
      if (
        /^\{(?:title|t|subtitle|st|comment|c|start_of_chorus|soc|end_of_chorus|eoc)(?::[^}]*)?\}$/.test(
          line,
        )
      )
        continue;
      throw new CadenceError(
        "INVALID_CHART",
        `Unsupported directive at line ${lineNumber + 1}`,
      );
    }
    if (line.includes("[") || line.includes("]")) {
      const stripped = line.replace(/\[([^[\]]+)\]/g, (_, chord: string) => {
        append(chord.trim());
        return "";
      });
      if (/[[\]]/.test(stripped))
        throw new CadenceError(
          "INVALID_CHART",
          `Unclosed or malformed chord at line ${lineNumber + 1}`,
        );
    } else {
      const tokens = line.split(/[\s,]+/).filter(Boolean);

      const notationOnly = tokens.every(
        (t) => chordPattern.test(t) || ["|", "|:", ":|"].includes(t),
      );
      const chordLikeLine = tokens.every(
        (token) =>
          /^[A-Z](?:[#b])?(?:maj7|m7|m|sus2|sus4|add9|dim|aug|[0-9])*$/u.test(
            token,
          ) || ["|", "|:", ":|"].includes(token),
      );
      if (notationOnly || chordLikeLine)
        for (const token of tokens) append(token);
    }
  }
  if (repeatStart !== null)
    throw new CadenceError("INVALID_CHART", "Unclosed repeat");
  if (!chords.length)
    throw new CadenceError("INVALID_CHART", "No chords found");
  return { chords, tuning: detectedTuning };
}
export const defaultSongs: readonly Song[] = [
  {
    id: "catalog:four",
    title: "Four familiar chords",
    chords: ["C", "G", "Am", "F"],
    attribution: "Cadence original exercise · MIT",
    revision: 1,
    catalog: true,
    tuning: "standard",
  },
  {
    id: "catalog:slow",
    title: "Take it slowly",
    chords: ["Em", "Am"],
    attribution: "Cadence original exercise · MIT",
    revision: 1,
    catalog: true,
    tuning: "standard",
  },
  {
    id: "catalog:morning",
    title: "An open morning",
    chords: ["G", "D", "Em", "C"],
    attribution: "Cadence original exercise · MIT",
    revision: 1,
    catalog: true,
    tuning: "standard",
  },
  {
    id: "catalog:minor",
    title: "A softer turn",
    chords: ["Am", "Dm", "E", "Am"],
    attribution: "Cadence original exercise · MIT",
    revision: 1,
    catalog: true,
    tuning: "standard",
  },
  ...curatedSongs,
];
