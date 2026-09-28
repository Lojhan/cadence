import {
  CadenceError,
  type TabDocument,
  type TabNote,
} from "@cadence/contracts";
import { getTuningPreset, normalizeTuningId } from "./tuning.js";

const labels = ["e", "B", "G", "D", "A", "E"];
const linePattern = /^([eBGDAE])\|([\d|-]+)$/;
function tabTuning(raw: string): string {
  const tuning = normalizeTuningId(raw);
  if (tuning === "standard" && raw.trim().toLowerCase() !== "standard")
    throw new CadenceError("INVALID_CHART", `Unsupported tab tuning: ${raw}`);
  return tuning;
}

export function isTab(text: string): boolean {
  return text.split(/\r?\n/).some((line) => /^e\|[\d|-]+/.test(line.trim()));
}

export function tabEventLabel(notes: readonly TabNote[]): string {
  return notes.map((note) => `${note.string}:${note.fret}`).join("+");
}

/** Parse aligned, six-string ASCII tablature into player-paced note events. */
export function parseTab(text: string, tuningId = "standard"): TabDocument {
  if (new TextEncoder().encode(text).length > 1_048_576)
    throw new CadenceError("INVALID_CHART", "Tab size limit exceeded");
  const staves: TabDocument["staves"] = [];
  const events: TabDocument["events"] = [];
  let pending: string[] = [];
  let heading = "";
  let tuning = tabTuning(tuningId);
  for (const [lineNumber, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    const tuningMatch = /^\{(?:tuning|tune):?\s*([^}]+)\}$/i.exec(line);
    if (tuningMatch) {
      if (staves.length || pending.length)
        throw new CadenceError(
          "INVALID_CHART",
          "Tab tuning must precede all staves",
        );
      tuning = tabTuning(tuningMatch[1] ?? "standard");
      continue;
    }
    if (/^[eBGDAE]\|/.test(line)) {
      const match = linePattern.exec(line);
      if (!match)
        throw new CadenceError(
          "INVALID_CHART",
          `Unsupported tab notation at line ${lineNumber + 1}`,
        );
      if (match[1] !== labels[pending.length])
        throw new CadenceError(
          "INVALID_CHART",
          "Tab requires six strings in e B G D A E order",
        );
      pending.push(line);
      if (pending.length < 6) continue;
      const bodies = pending.map((item) => item.slice(2));
      const width = bodies[0]?.length ?? 0;
      if (bodies.some((body) => body.length !== width))
        throw new CadenceError("INVALID_CHART", "Tab strings must be aligned");
      for (let column = 0; column < width; column++) {
        if (
          bodies.some(
            (body) => (body[column] === "|") !== (bodies[0]?.[column] === "|"),
          )
        )
          throw new CadenceError(
            "INVALID_CHART",
            "Tab barlines must be aligned",
          );
      }
      const staff = staves.length;
      staves.push({ lines: [...pending], heading });
      const preset = getTuningPreset(tuning);
      const columns = new Map<number, TabNote[]>();
      for (const [stringIndex, body] of bodies.entries()) {
        for (const match of body.matchAll(/\d+/g)) {
          const fret = Number(match[0]);
          const column = match.index;
          if (!Number.isSafeInteger(fret) || fret > 24)
            throw new CadenceError(
              "INVALID_CHART",
              "Tab frets must be between 0 and 24",
            );
          const open = preset.strings[5 - stringIndex];
          if (!open) throw new Error("Invalid guitar tuning");
          const midi = (open.octave + 1) * 12 + open.pitchClass + fret;
          if (midi > 88 || midi < 36)
            throw new CadenceError(
              "INVALID_CHART",
              "Tab note is outside supported guitar range",
            );
          const notes = columns.get(column) ?? [];
          notes.push({ string: stringIndex + 1, fret, midi });
          columns.set(column, notes);
        }
      }
      for (const [column, notes] of [...columns.entries()].sort(
        (a, b) => a[0] - b[0],
      )) {
        events.push({ staff, column, notes });
        if (events.length > 10_000)
          throw new CadenceError("INVALID_CHART", "Tab event limit exceeded");
      }
      pending = [];
      heading = "";
    } else if (line) {
      if (pending.length)
        throw new CadenceError(
          "INVALID_CHART",
          "Tab requires six strings per staff",
        );
      heading = line;
    }
  }
  if (pending.length)
    throw new CadenceError(
      "INVALID_CHART",
      "Tab requires six strings per staff",
    );
  if (!events.length)
    throw new CadenceError("INVALID_CHART", "No tab notes found");
  return { staves, events, tuning };
}
