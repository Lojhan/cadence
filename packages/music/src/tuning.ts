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

export const TUNING_PRESETS: readonly TuningPreset[] = [
  {
    id: "standard",
    name: "Standard",
    shortDescription: "E A D G B E — The standard guitar tuning",
    openPitchClasses: [4, 9, 2, 7, 11, 4],
    strings: [
      {
        stringNumber: 6,
        stringIndex: 0,
        note: "E2",
        noteName: "E",
        pitchClass: 4,
        octave: 2,
        targetHz: 82.41,
        gauge: ".046",
        isWound: true,
      },
      {
        stringNumber: 5,
        stringIndex: 1,
        note: "A2",
        noteName: "A",
        pitchClass: 9,
        octave: 2,
        targetHz: 110.0,
        gauge: ".036",
        isWound: true,
      },
      {
        stringNumber: 4,
        stringIndex: 2,
        note: "D3",
        noteName: "D",
        pitchClass: 2,
        octave: 3,
        targetHz: 146.83,
        gauge: ".026",
        isWound: true,
      },
      {
        stringNumber: 3,
        stringIndex: 3,
        note: "G3",
        noteName: "G",
        pitchClass: 7,
        octave: 3,
        targetHz: 196.0,
        gauge: ".017",
        isWound: false,
      },
      {
        stringNumber: 2,
        stringIndex: 4,
        note: "B3",
        noteName: "B",
        pitchClass: 11,
        octave: 3,
        targetHz: 246.94,
        gauge: ".013",
        isWound: false,
      },
      {
        stringNumber: 1,
        stringIndex: 5,
        note: "E4",
        noteName: "E",
        pitchClass: 4,
        octave: 4,
        targetHz: 329.63,
        gauge: ".010",
        isWound: false,
      },
    ],
  },
  {
    id: "drop_d",
    name: "Drop D",
    shortDescription: "D A D G B E — Heavy bass and easy power chords",
    openPitchClasses: [2, 9, 2, 7, 11, 4],
    strings: [
      {
        stringNumber: 6,
        stringIndex: 0,
        note: "D2",
        noteName: "D",
        pitchClass: 2,
        octave: 2,
        targetHz: 73.42,
        gauge: ".046",
        isWound: true,
      },
      {
        stringNumber: 5,
        stringIndex: 1,
        note: "A2",
        noteName: "A",
        pitchClass: 9,
        octave: 2,
        targetHz: 110.0,
        gauge: ".036",
        isWound: true,
      },
      {
        stringNumber: 4,
        stringIndex: 2,
        note: "D3",
        noteName: "D",
        pitchClass: 2,
        octave: 3,
        targetHz: 146.83,
        gauge: ".026",
        isWound: true,
      },
      {
        stringNumber: 3,
        stringIndex: 3,
        note: "G3",
        noteName: "G",
        pitchClass: 7,
        octave: 3,
        targetHz: 196.0,
        gauge: ".017",
        isWound: false,
      },
      {
        stringNumber: 2,
        stringIndex: 4,
        note: "B3",
        noteName: "B",
        pitchClass: 11,
        octave: 3,
        targetHz: 246.94,
        gauge: ".013",
        isWound: false,
      },
      {
        stringNumber: 1,
        stringIndex: 5,
        note: "E4",
        noteName: "E",
        pitchClass: 4,
        octave: 4,
        targetHz: 329.63,
        gauge: ".010",
        isWound: false,
      },
    ],
  },
  {
    id: "half_step_down",
    name: "Half Step Down (Eb)",
    shortDescription: "Eb Ab Db Gb Bb Eb — Warmer tone, lower string tension",
    openPitchClasses: [3, 8, 1, 6, 10, 3],
    strings: [
      {
        stringNumber: 6,
        stringIndex: 0,
        note: "Eb2",
        noteName: "Eb",
        pitchClass: 3,
        octave: 2,
        targetHz: 77.78,
        gauge: ".046",
        isWound: true,
      },
      {
        stringNumber: 5,
        stringIndex: 1,
        note: "Ab2",
        noteName: "Ab",
        pitchClass: 8,
        octave: 2,
        targetHz: 103.83,
        gauge: ".036",
        isWound: true,
      },
      {
        stringNumber: 4,
        stringIndex: 2,
        note: "Db3",
        noteName: "Db",
        pitchClass: 1,
        octave: 3,
        targetHz: 138.59,
        gauge: ".026",
        isWound: true,
      },
      {
        stringNumber: 3,
        stringIndex: 3,
        note: "Gb3",
        noteName: "Gb",
        pitchClass: 6,
        octave: 3,
        targetHz: 185.0,
        gauge: ".017",
        isWound: false,
      },
      {
        stringNumber: 2,
        stringIndex: 4,
        note: "Bb3",
        noteName: "Bb",
        pitchClass: 10,
        octave: 3,
        targetHz: 233.08,
        gauge: ".013",
        isWound: false,
      },
      {
        stringNumber: 1,
        stringIndex: 5,
        note: "Eb4",
        noteName: "Eb",
        pitchClass: 3,
        octave: 4,
        targetHz: 311.13,
        gauge: ".010",
        isWound: false,
      },
    ],
  },
  {
    id: "full_step_down",
    name: "Full Step Down (D Standard)",
    shortDescription: "D G C F A D — Deep tone, lowered two semitones",
    openPitchClasses: [2, 7, 0, 5, 9, 2],
    strings: [
      {
        stringNumber: 6,
        stringIndex: 0,
        note: "D2",
        noteName: "D",
        pitchClass: 2,
        octave: 2,
        targetHz: 73.42,
        gauge: ".046",
        isWound: true,
      },
      {
        stringNumber: 5,
        stringIndex: 1,
        note: "G2",
        noteName: "G",
        pitchClass: 7,
        octave: 2,
        targetHz: 98.0,
        gauge: ".036",
        isWound: true,
      },
      {
        stringNumber: 4,
        stringIndex: 2,
        note: "C3",
        noteName: "C",
        pitchClass: 0,
        octave: 3,
        targetHz: 130.81,
        gauge: ".026",
        isWound: true,
      },
      {
        stringNumber: 3,
        stringIndex: 3,
        note: "F3",
        noteName: "F",
        pitchClass: 5,
        octave: 3,
        targetHz: 174.61,
        gauge: ".017",
        isWound: false,
      },
      {
        stringNumber: 2,
        stringIndex: 4,
        note: "A3",
        noteName: "A",
        pitchClass: 9,
        octave: 3,
        targetHz: 220.0,
        gauge: ".013",
        isWound: false,
      },
      {
        stringNumber: 1,
        stringIndex: 5,
        note: "D4",
        noteName: "D",
        pitchClass: 2,
        octave: 4,
        targetHz: 293.66,
        gauge: ".010",
        isWound: false,
      },
    ],
  },
  {
    id: "drop_c",
    name: "Drop C",
    shortDescription: "C G C F A D — Deep, aggressive drop tuning",
    openPitchClasses: [0, 7, 0, 5, 9, 2],
    strings: [
      {
        stringNumber: 6,
        stringIndex: 0,
        note: "C2",
        noteName: "C",
        pitchClass: 0,
        octave: 2,
        targetHz: 65.41,
        gauge: ".046",
        isWound: true,
      },
      {
        stringNumber: 5,
        stringIndex: 1,
        note: "G2",
        noteName: "G",
        pitchClass: 7,
        octave: 2,
        targetHz: 98.0,
        gauge: ".036",
        isWound: true,
      },
      {
        stringNumber: 4,
        stringIndex: 2,
        note: "C3",
        noteName: "C",
        pitchClass: 0,
        octave: 3,
        targetHz: 130.81,
        gauge: ".026",
        isWound: true,
      },
      {
        stringNumber: 3,
        stringIndex: 3,
        note: "F3",
        noteName: "F",
        pitchClass: 5,
        octave: 3,
        targetHz: 174.61,
        gauge: ".017",
        isWound: false,
      },
      {
        stringNumber: 2,
        stringIndex: 4,
        note: "A3",
        noteName: "A",
        pitchClass: 9,
        octave: 3,
        targetHz: 220.0,
        gauge: ".013",
        isWound: false,
      },
      {
        stringNumber: 1,
        stringIndex: 5,
        note: "D4",
        noteName: "D",
        pitchClass: 2,
        octave: 4,
        targetHz: 293.66,
        gauge: ".010",
        isWound: false,
      },
    ],
  },
  {
    id: "dadgad",
    name: "DADGAD",
    shortDescription: "D A D G A D — Celtic, ambient modal tuning",
    openPitchClasses: [2, 9, 2, 7, 9, 2],
    strings: [
      {
        stringNumber: 6,
        stringIndex: 0,
        note: "D2",
        noteName: "D",
        pitchClass: 2,
        octave: 2,
        targetHz: 73.42,
        gauge: ".046",
        isWound: true,
      },
      {
        stringNumber: 5,
        stringIndex: 1,
        note: "A2",
        noteName: "A",
        pitchClass: 9,
        octave: 2,
        targetHz: 110.0,
        gauge: ".036",
        isWound: true,
      },
      {
        stringNumber: 4,
        stringIndex: 2,
        note: "D3",
        noteName: "D",
        pitchClass: 2,
        octave: 3,
        targetHz: 146.83,
        gauge: ".026",
        isWound: true,
      },
      {
        stringNumber: 3,
        stringIndex: 3,
        note: "G3",
        noteName: "G",
        pitchClass: 7,
        octave: 3,
        targetHz: 196.0,
        gauge: ".017",
        isWound: false,
      },
      {
        stringNumber: 2,
        stringIndex: 4,
        note: "A3",
        noteName: "A",
        pitchClass: 9,
        octave: 3,
        targetHz: 220.0,
        gauge: ".013",
        isWound: false,
      },
      {
        stringNumber: 1,
        stringIndex: 5,
        note: "D4",
        noteName: "D",
        pitchClass: 2,
        octave: 4,
        targetHz: 293.66,
        gauge: ".010",
        isWound: false,
      },
    ],
  },
  {
    id: "open_d",
    name: "Open D",
    shortDescription: "D A D F# A D — Resonant full D major open chord",
    openPitchClasses: [2, 9, 2, 6, 9, 2],
    strings: [
      {
        stringNumber: 6,
        stringIndex: 0,
        note: "D2",
        noteName: "D",
        pitchClass: 2,
        octave: 2,
        targetHz: 73.42,
        gauge: ".046",
        isWound: true,
      },
      {
        stringNumber: 5,
        stringIndex: 1,
        note: "A2",
        noteName: "A",
        pitchClass: 9,
        octave: 2,
        targetHz: 110.0,
        gauge: ".036",
        isWound: true,
      },
      {
        stringNumber: 4,
        stringIndex: 2,
        note: "D3",
        noteName: "D",
        pitchClass: 2,
        octave: 3,
        targetHz: 146.83,
        gauge: ".026",
        isWound: true,
      },
      {
        stringNumber: 3,
        stringIndex: 3,
        note: "F#3",
        noteName: "F#",
        pitchClass: 6,
        octave: 3,
        targetHz: 185.0,
        gauge: ".017",
        isWound: false,
      },
      {
        stringNumber: 2,
        stringIndex: 4,
        note: "A3",
        noteName: "A",
        pitchClass: 9,
        octave: 3,
        targetHz: 220.0,
        gauge: ".013",
        isWound: false,
      },
      {
        stringNumber: 1,
        stringIndex: 5,
        note: "D4",
        noteName: "D",
        pitchClass: 2,
        octave: 4,
        targetHz: 293.66,
        gauge: ".010",
        isWound: false,
      },
    ],
  },
  {
    id: "open_g",
    name: "Open G",
    shortDescription: "D G D G B D — Rolling Stones blues / rock tuning",
    openPitchClasses: [2, 7, 2, 7, 11, 2],
    strings: [
      {
        stringNumber: 6,
        stringIndex: 0,
        note: "D2",
        noteName: "D",
        pitchClass: 2,
        octave: 2,
        targetHz: 73.42,
        gauge: ".046",
        isWound: true,
      },
      {
        stringNumber: 5,
        stringIndex: 1,
        note: "G2",
        noteName: "G",
        pitchClass: 7,
        octave: 2,
        targetHz: 98.0,
        gauge: ".036",
        isWound: true,
      },
      {
        stringNumber: 4,
        stringIndex: 2,
        note: "D3",
        noteName: "D",
        pitchClass: 2,
        octave: 3,
        targetHz: 146.83,
        gauge: ".026",
        isWound: true,
      },
      {
        stringNumber: 3,
        stringIndex: 3,
        note: "G3",
        noteName: "G",
        pitchClass: 7,
        octave: 3,
        targetHz: 196.0,
        gauge: ".017",
        isWound: false,
      },
      {
        stringNumber: 2,
        stringIndex: 4,
        note: "B3",
        noteName: "B",
        pitchClass: 11,
        octave: 3,
        targetHz: 246.94,
        gauge: ".013",
        isWound: false,
      },
      {
        stringNumber: 1,
        stringIndex: 5,
        note: "D4",
        noteName: "D",
        pitchClass: 2,
        octave: 4,
        targetHz: 293.66,
        gauge: ".010",
        isWound: false,
      },
    ],
  },
  {
    id: "open_e",
    name: "Open E",
    shortDescription: "E B E G# B E — Bright, open slide blues tuning",
    openPitchClasses: [4, 11, 4, 8, 11, 4],
    strings: [
      {
        stringNumber: 6,
        stringIndex: 0,
        note: "E2",
        noteName: "E",
        pitchClass: 4,
        octave: 2,
        targetHz: 82.41,
        gauge: ".046",
        isWound: true,
      },
      {
        stringNumber: 5,
        stringIndex: 1,
        note: "B2",
        noteName: "B",
        pitchClass: 11,
        octave: 2,
        targetHz: 123.47,
        gauge: ".036",
        isWound: true,
      },
      {
        stringNumber: 4,
        stringIndex: 2,
        note: "E3",
        noteName: "E",
        pitchClass: 4,
        octave: 3,
        targetHz: 164.81,
        gauge: ".026",
        isWound: true,
      },
      {
        stringNumber: 3,
        stringIndex: 3,
        note: "G#3",
        noteName: "G#",
        pitchClass: 8,
        octave: 3,
        targetHz: 207.65,
        gauge: ".017",
        isWound: false,
      },
      {
        stringNumber: 2,
        stringIndex: 4,
        note: "B3",
        noteName: "B",
        pitchClass: 11,
        octave: 3,
        targetHz: 246.94,
        gauge: ".013",
        isWound: false,
      },
      {
        stringNumber: 1,
        stringIndex: 5,
        note: "E4",
        noteName: "E",
        pitchClass: 4,
        octave: 4,
        targetHz: 329.63,
        gauge: ".010",
        isWound: false,
      },
    ],
  },
];

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
