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
  autoDetectString: true,
  onAutoDetectStringChange: () => {},
  inputDevice: "",
  inputDevices: [{ deviceId: "usb-microphone", label: "USB microphone" }],
  onInputDeviceChange: () => {},
  inputBoost: 6,
  onInputBoostChange: () => {},
};

const stringsMarkup = renderToStaticMarkup(
  createElement(TunerExperience, base),
);
assert.ok(stringsMarkup.includes('aria-label="String by string tuner"'));
assert.equal(
  (stringsMarkup.match(/class="tuner-string-cell/g) ?? []).length,
  6,
);
assert.equal((stringsMarkup.match(/tuner-preset-trigger/g) ?? []).length, 1);
assert.ok(stringsMarkup.includes('aria-label="Tuner controls"'));
assert.ok(stringsMarkup.includes('aria-pressed="true"'));
assert.ok(stringsMarkup.includes('aria-label="Play reference pitch D3"'));
assert.ok((stringsMarkup.match(/data-slot="icon-button"/g) ?? []).length >= 3);
assert.ok(stringsMarkup.includes("Auto-select string"));
assert.ok(stringsMarkup.includes('aria-label="Microphone settings"'));
assert.ok(stringsMarkup.includes("Play the selected string"));
assert.ok(!stringsMarkup.includes("0¢"), "silence has no tuning result");

const flatMarkup = renderToStaticMarkup(
  createElement(TunerExperience, {
    ...base,
    detectedHz: 140,
    cents: -82,
    direction: "up",
  }),
);
assert.ok(flatMarkup.includes("Tighten the string"));
const sharpMarkup = renderToStaticMarkup(
  createElement(TunerExperience, {
    ...base,
    detectedHz: 153,
    cents: 59,
    direction: "down",
  }),
);
assert.ok(sharpMarkup.includes("Loosen the string"));
const tunedMarkup = renderToStaticMarkup(
  createElement(TunerExperience, {
    ...base,
    detectedHz: 146.83,
    cents: 0,
    direction: "in_tune",
  }),
);
assert.ok(tunedMarkup.includes("In tune"));

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
const silentChromatic = renderToStaticMarkup(
  createElement(TunerExperience, { ...base, mode: "chromatic" }),
);
assert.ok(!silentChromatic.includes("A2"));
assert.ok(!silentChromatic.includes("0¢"));
