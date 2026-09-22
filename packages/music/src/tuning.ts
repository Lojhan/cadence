import type { Voicing } from "./index.js";

export interface TuningString {
  stringNumber: number; // 1 to 6 (1 = high E, 6 = low E)
  stringIndex: number; // 0 to 5 (0 = string 6 / low E, 5 = string 1 / high E)
  note: string; // e.g. "E2", "A2", "D3", "G3", "B3", "E4"
  noteName: string; // e.g. "E", "A", "D", "G", "B"
  pitchClass: number; // 0..11
  octave: number;
  targetHz: number;
  gauge: string;
  isWound: boolean;
}

export interface TuningPreset {
  id: string;
  name: string;
  shortDescription: string;
  strings: readonly [
    TuningString,
    TuningString,
    TuningString,
    TuningString,
    TuningString,
    TuningString,
  ];
  openPitchClasses: readonly [number, number, number, number, number, number];
}

const STANDARD_OPEN_PITCH_CLASSES = [4, 9, 2, 7, 11, 4] as const;

type Six<T> = readonly [T, T, T, T, T, T];

// One source for a note's spelling, pitch class, octave, and rounded reference Hz.
const NOTE_DATA = {
  E2: [4, 2, 82.41],
  A2: [9, 2, 110],
  D3: [2, 3, 146.83],
  G3: [7, 3, 196],
  B3: [11, 3, 246.94],
  E4: [4, 4, 329.63],
  D2: [2, 2, 73.42],
  Eb2: [3, 2, 77.78],
  Ab2: [8, 2, 103.83],
  Db3: [1, 3, 138.59],
  Gb3: [6, 3, 185],
  Bb3: [10, 3, 233.08],
  Eb4: [3, 4, 311.13],
  G2: [7, 2, 98],
  C3: [0, 3, 130.81],
  F3: [5, 3, 174.61],
  A3: [9, 3, 220],
  D4: [2, 4, 293.66],
  C2: [0, 2, 65.41],
  "F#3": [6, 3, 185],
  B2: [11, 2, 123.47],
  E3: [4, 3, 164.81],
  "G#3": [8, 3, 207.65],
} as const;

type Note = keyof typeof NOTE_DATA;
const STRING_GAUGES = [".046", ".036", ".026", ".017", ".013", ".010"] as const;
const PRESET_DEFINITIONS = [
  {
    id: "standard",
    name: "Standard",
    shortDescription: "E A D G B E — The standard guitar tuning",
    notes: ["E2", "A2", "D3", "G3", "B3", "E4"],
  },
  {
    id: "drop_d",
    name: "Drop D",
    shortDescription: "D A D G B E — Heavy bass and easy power chords",
    notes: ["D2", "A2", "D3", "G3", "B3", "E4"],
  },
  {
    id: "half_step_down",
    name: "Half Step Down (Eb)",
    shortDescription: "Eb Ab Db Gb Bb Eb — Warmer tone, lower string tension",
    notes: ["Eb2", "Ab2", "Db3", "Gb3", "Bb3", "Eb4"],
  },
  {
    id: "full_step_down",
    name: "Full Step Down (D Standard)",
    shortDescription: "D G C F A D — Deep tone, lowered two semitones",
    notes: ["D2", "G2", "C3", "F3", "A3", "D4"],
  },
  {
    id: "drop_c",
    name: "Drop C",
    shortDescription: "C G C F A D — Deep, aggressive drop tuning",
    notes: ["C2", "G2", "C3", "F3", "A3", "D4"],
  },
  {
    id: "dadgad",
    name: "DADGAD",
    shortDescription: "D A D G A D — Celtic, ambient modal tuning",
    notes: ["D2", "A2", "D3", "G3", "A3", "D4"],
  },
  {
    id: "open_d",
    name: "Open D",
    shortDescription: "D A D F# A D — Resonant full D major open chord",
    notes: ["D2", "A2", "D3", "F#3", "A3", "D4"],
  },
  {
    id: "open_g",
    name: "Open G",
    shortDescription: "D G D G B D — Rolling Stones blues / rock tuning",
    notes: ["D2", "G2", "D3", "G3", "B3", "D4"],
  },
  {
    id: "open_e",
    name: "Open E",
    shortDescription: "E B E G# B E — Bright, open slide blues tuning",
    notes: ["E2", "B2", "E3", "G#3", "B3", "E4"],
  },
] as const satisfies readonly {
  id: string;
  name: string;
  shortDescription: string;
  notes: Six<Note>;
}[];

function six<T>(values: T[]): [T, T, T, T, T, T] {
  if (values.length !== 6) throw new Error("A guitar tuning needs six strings");
  return values as [T, T, T, T, T, T];
}

export const TUNING_PRESETS: readonly TuningPreset[] = PRESET_DEFINITIONS.map(
  ({ id, name, shortDescription, notes }) => {
    const strings = six(
      notes.map((note, stringIndex): TuningString => {
        const [pitchClass, octave, targetHz] = NOTE_DATA[note];
        return {
          stringNumber: 6 - stringIndex,
          stringIndex,
          note,
          noteName: note.slice(0, -1),
          pitchClass,
          octave,
          targetHz,
          gauge: STRING_GAUGES[stringIndex] ?? ".010",
          isWound: stringIndex < 3,
        };
      }),
    );
    return {
      id,
      name,
      shortDescription,
      openPitchClasses: six(strings.map((string) => string.pitchClass)),
      strings,
    };
  },
);

const PRESETS_BY_ID = new Map<string, TuningPreset>(
  TUNING_PRESETS.map((p) => [p.id, p]),
);

export function getTuningPreset(id: string): TuningPreset {
  const normalized = normalizeTuningId(id);
  const fallback = TUNING_PRESETS[0];
  if (!fallback) throw new Error("TUNING_PRESETS must not be empty");
  return PRESETS_BY_ID.get(normalized) ?? fallback;
}

export function normalizeTuningId(raw: string): string {
  const clean = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (PRESETS_BY_ID.has(clean)) return clean;
  if (clean === "dropd" || clean === "drop_d") return "drop_d";
  if (
    clean.includes("half") ||
    clean.includes("eb") ||
    clean.includes("e_flat")
  )
    return "half_step_down";
  if (clean.includes("full") || clean.includes("d_standard"))
    return "full_step_down";
  if (clean === "dropc" || clean === "drop_c") return "drop_c";
  if (clean === "dadgad") return "dadgad";
  if (clean === "opend" || clean === "open_d") return "open_d";
  if (clean === "openg" || clean === "open_g") return "open_g";
  if (clean === "opene" || clean === "open_e") return "open_e";
  return "standard";
}

/**
 * Calculates cents deviation between a detected frequency and a target frequency:
 * cents = 1200 * log2(detected / target)
 */
export function centsDifference(detectedHz: number, targetHz: number): number {
  if (detectedHz <= 0 || targetHz <= 0) return 0;
  return 1200 * Math.log2(detectedHz / targetHz);
}

export type TuningDirection = "up" | "down" | "in_tune";

/**
 * Determines whether the user should tune up, tune down, or is in tune.
 */
export function tuningDirection(
  cents: number,
  toleranceCents = 3,
): TuningDirection {
  if (Math.abs(cents) <= toleranceCents) return "in_tune";
  return cents < -toleranceCents ? "up" : "down";
}

/**
 * Emergency Break Risk:
 * When tuning up, excessive tension on high plain strings (strings 4, 5 / B3, E4)
 * or wound strings significantly above target causes strings to snap.
 * Returns true if the detected pitch is dangerously sharp relative to target.
 */
export function isEmergencyBreakRisk(
  cents: number,
  stringIndex: number,
): boolean {
  // High strings (B3 and high E4) snap readily at ~70-80 cents over-pitch (or >1 semitone)
  if (stringIndex >= 4 && cents > 55) return true;
  if (stringIndex === 3 && cents > 65) return true;
  return cents > 85;
}

/**
 * Finds the closest string in the preset to the detected frequency.
 */
export function findClosestString(
  detectedHz: number,
  preset: TuningPreset,
): { stringIndex: number; cents: number } {
  let closestIndex = 0;
  let minAbsCents = Infinity;
  let bestCents = 0;

  for (let i = 0; i < preset.strings.length; i++) {
    const string = preset.strings[i];
    if (!string) continue;
    const cents = centsDifference(detectedHz, string.targetHz);
    const abs = Math.abs(cents);
    if (abs < minAbsCents) {
      minAbsCents = abs;
      closestIndex = i;
      bestCents = cents;
    }
  }

  return { stringIndex: closestIndex, cents: bestCents };
}

/**
 * Dynamically adapts a standard-tuning guitar voicing to an alternate tuning.
 * Calculates fret offsets so that each string sounds the required pitch class.
 */
export function adaptVoicingForTuning(
  voicing: Voicing,
  tuningId: string,
): Voicing {
  const preset = getTuningPreset(tuningId);
  if (preset.id === "standard") return voicing;

  const standardPitches = STANDARD_OPEN_PITCH_CLASSES;
  const targetPitches = preset.openPitchClasses;

  const adaptedFrets: number[] = [];
  const adaptedFingers: number[] = [];

  for (let i = 0; i < 6; i++) {
    const standardFret = voicing.frets[i] ?? -1;
    const standardFinger = voicing.fingers[i] ?? 0;

    if (standardFret < 0) {
      adaptedFrets.push(-1);
      adaptedFingers.push(0);
      continue;
    }

    // Semitone difference between standard open string and target open string
    // E.g. Standard E (4) vs Drop D (2): 4 - 2 = +2.
    // So the fret on string 0 must be standardFret + 2 to produce the same note.
    const stdPitch = standardPitches[i];
    const targetPitch = targetPitches[i];
    if (stdPitch === undefined || targetPitch === undefined) {
      adaptedFrets.push(standardFret);
      adaptedFingers.push(standardFinger);
      continue;
    }

    let shift = stdPitch - targetPitch;
    // Keep shift within [-6, +6] interval
    if (shift > 6) shift -= 12;
    if (shift < -6) shift += 12;

    let newFret = standardFret + shift;
    if (newFret < 0) {
      // If negative, either shift up an octave or mute
      if (newFret + 12 <= 12) {
        newFret += 12;
      } else {
        newFret = -1;
      }
    }

    adaptedFrets.push(newFret);
    adaptedFingers.push(newFret === 0 ? 0 : standardFinger || 1);
  }

  const positiveFrets = adaptedFrets.filter((f) => f > 0);
  const baseFret = positiveFrets.length > 0 ? Math.min(...positiveFrets) : 1;

  return {
    id: `${voicing.id}:${preset.id}`,
    frets: adaptedFrets,
    fingers: adaptedFingers,
    baseFret: Math.max(1, baseFret),
  };
}
