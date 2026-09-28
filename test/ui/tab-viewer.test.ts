import { strict as assert } from "poku";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getTuningPreset, parseTab } from "../../packages/music/src/index.ts";
import { TabViewer } from "../../packages/ui/src/tab-viewer.tsx";

const tab = parseTab("e|0-|\nB|0-|\nG|0-|\nD|0-|\nA|0-|\nE|0-|", "open_d");
const labels = Array.from(getTuningPreset(tab.tuning).strings)
  .reverse()
  .map((string) => string.noteName);
const markup = renderToStaticMarkup(
  createElement(TabViewer, {
    tab,
    index: 0,
    strings: labels,
    anchorRevision: 0,
  }),
);
assert.ok(markup.includes(">F#<"), "Open D tab shows its F# string");
assert.equal(
  (markup.match(/>D</g) ?? []).length,
  3,
  "Open D tab labels all three D strings",
);

const arranged = parseTab(`{chords: Cmaj7 - Dm -}
{rhythm: D8 U8 D4 P4}
e|--0---0---1---1--|
B|--0---0---3---3--|
G|--0---0---2---2--|
D|--2---2---0---0--|
A|--3---3----------|
E|-----------------|`);
const arrangementMarkup = renderToStaticMarkup(
  createElement(TabViewer, {
    tab: arranged,
    index: 0,
    strings: labels,
    anchorRevision: 0,
  }),
);
assert.equal((arrangementMarkup.match(/>Cmaj7</g) ?? []).length, 1);
assert.equal((arrangementMarkup.match(/>Dm</g) ?? []).length, 1);
assert.ok(arrangementMarkup.includes("Downstroke, eighth note"));
assert.ok(arrangementMarkup.includes("Upstroke, eighth note"));
assert.ok(arrangementMarkup.includes("Pluck, quarter note"));
