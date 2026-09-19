import { strict as assert } from "poku";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChordTimeline, Fretboard } from "../../packages/ui/src/index.tsx";

const shape = {
  frets: [1, 3, 3, 2, 1, 1],
  fingers: [1, 3, 4, 2, 1, 1],
  baseFret: 1,
  barre: { fret: 1, from: 0, to: 5 },
};
const right = renderToStaticMarkup(
  createElement(Fretboard, {
    shape,
    symbol: "F",
    hand: "right",
    numbers: true,
  }),
);
const left = renderToStaticMarkup(
  createElement(Fretboard, { shape, symbol: "F", hand: "left", numbers: true }),
);
assert.equal(
  (right.match(/data-finger="1"/g) ?? []).length,
  1,
  "barre has one finger marker",
);
assert.ok(right.includes('cx="40"'));
assert.ok(left.includes('cx="240"'));
assert.ok(left.includes("left-handed"));
assert.ok(
  right.includes("<title>F guitar fingering</title>"),
  "SVG title hydrates as a single text node",
);
const timeline = renderToStaticMarkup(
  createElement(ChordTimeline, { chords: ["C", "G", "Am", "F"], index: 3 }),
);
assert.equal(timeline.includes(">C<"), false, "end timeline never wraps");
assert.ok(timeline.includes('aria-current="step"'));
