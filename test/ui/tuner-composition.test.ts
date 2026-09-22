import { strict as assert } from "poku";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TunerExperience } from "../../packages/ui/src/index.tsx";

const strings = ["E2", "A2", "D3", "G3", "B3", "E4"].map(
  (note, stringIndex) => ({
    stringNumber: 6 - stringIndex,
    stringIndex,
    note,
    noteName: note[0] ?? "E",
    pitchClass: 0,
    octave: Number(note[1]),
    targetHz: [82.41, 110, 146.83, 196, 246.94, 329.63][stringIndex] ?? 82.41,
    gauge:
      [".046", ".036", ".026", ".017", ".013", ".010"][stringIndex] ?? ".010",
    isWound: stringIndex < 3,
  }),
);
const presets = [
  { id: "standard", name: "Standard", shortDescription: "", strings },
];
const base = {
  presets,
  value: "standard",
  onPresetChange: () => {},
  strings,
  selectedStringIndex: 2,
  onSelectString: () => {},
  mode: "strings" as const,
  onModeChange: () => {},
  detectedHz: null,
  cents: null,
  direction: "idle" as const,
  emergencyBreakRisk: false,
  listening: true,
  busy: false,
  onToggleListening: () => {},
  onBack: () => {},
  onPlayReference: () => {},
  theme: "dark" as const,
  onToggleTheme: () => {},
};

const stringsMarkup = renderToStaticMarkup(
  createElement(TunerExperience, base),
);
assert.ok(stringsMarkup.includes('aria-label="String by string tuner"'));
assert.equal(
  (stringsMarkup.match(/class="tuner-string-cell/g) ?? []).length,
  6,
);
assert.equal(
  (stringsMarkup.match(/class="tuner-preset-trigger/g) ?? []).length,
  1,
);
assert.ok(stringsMarkup.includes('aria-pressed="true"'));
assert.ok(stringsMarkup.includes('aria-label="Play reference pitch D3"'));
assert.ok((stringsMarkup.match(/data-slot="icon-button"/g) ?? []).length >= 3);

const chromaticMarkup = renderToStaticMarkup(
  createElement(TunerExperience, {
    ...base,
    mode: "chromatic",
    detectedNote: "A4",
    chromaticCents: -22,
  }),
);
assert.ok(chromaticMarkup.includes('aria-label="Chromatic tuner"'));
assert.ok(chromaticMarkup.includes('data-gauge-angle="-11"'));
assert.equal(
  (chromaticMarkup.match(/class="tuner-note-rail-item/g) ?? []).length,
  12,
);
