import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  Music2,
  Sliders,
  X,
} from "lucide-react";
import { Fragment, type ReactNode } from "react";
import {
  ControlDock,
  DockButton,
  DockButtonMenu,
  DockDivider,
  DockGroup,
} from "./control-dock.tsx";
import { Button, IconButton } from "./primitives.tsx";

export {
  ControlDock,
  DockButton,
  DockButtonMenu,
  DockDivider,
  DockGroup,
  DockMenuItem,
} from "./control-dock.tsx";
export type {
  FieldProps,
  SegmentedControlProps,
  SegmentOption,
  SelectProps,
  SurfaceProps,
} from "./form-primitives.tsx";
export {
  Field,
  Input,
  SegmentedControl,
  Select,
  Surface,
  Textarea,
} from "./form-primitives.tsx";
export { cn } from "./lib/cn.ts";
export type { DialogProps, PopoverProps } from "./overlays.tsx";
export {
  Dialog,
  DialogBody,
  DialogHeader,
  Popover,
  Sheet,
} from "./overlays.tsx";
export type { ButtonProps, IconButtonProps } from "./primitives.tsx";
export { Button, buttonVariants, IconButton } from "./primitives.tsx";
export type DiagramShape = {
  frets: readonly number[];
  fingers: readonly number[];
  baseFret: number;
  barre?: { fret: number; from: number; to: number };
};
export function Fretboard({
  shape,
  symbol,
  hand,
  numbers,
}: {
  shape: DiagramShape;
  symbol: string;
  hand: "left" | "right";
  numbers: boolean;
}) {
  const x = (i: number) => 40 + (hand === "left" ? 5 - i : i) * 40;
  const y = (fret: number) => 65 + (fret - shape.baseFret + 0.5) * 54;
  const barre = shape.barre;
  const anchor = barre
    ? shape.frets.findIndex(
        (fret, i) => fret === barre.fret && i >= barre.from && i <= barre.to,
      )
    : -1;
  return (
    <svg
      className="diagram"
      viewBox="0 0 280 340"
      role="img"
      aria-label={`${symbol}, ${hand}-handed. Frets from low E: ${shape.frets.map((fret) => (fret < 0 ? "muted" : fret)).join(", ")}${barre ? `. Barre at fret ${barre.fret}` : ""}`}
    >
      <title>{`${symbol} guitar fingering`}</title>
      {[0, 1, 2, 3, 4].map((fret) => (
        <line
          key={fret}
          x1="40"
          x2="240"
          y1={65 + fret * 54}
          y2={65 + fret * 54}
          className={fret === 0 && shape.baseFret === 1 ? "nut" : "fret"}
        />
      ))}
      {shape.baseFret > 1 ? (
        <text x="12" y="96" className="fret-number">
          {shape.baseFret}
        </text>
      ) : null}
      {shape.frets.map((fret, i) => (
        <Fragment key={["E", "A", "D", "G", "B", "e"][i]}>
          <line
            x1={x(i)}
            x2={x(i)}
            y1="65"
            y2="281"
            className="string"
            strokeWidth={2.1 - i * 0.22}
          />
          <text x={x(i)} y="315" textAnchor="middle" className="string-label">
            {["E", "A", "D", "G", "B", "e"][i]}
          </text>
          {fret < 0 ? (
            <path
              d={`M${x(i) - 5} 30l10 10m0-10l-10 10`}
              className="string-mark"
            />
          ) : fret === 0 ? (
            <circle cx={x(i)} cy="35" r="6" className="string-mark" />
          ) : null}
        </Fragment>
      ))}
      {barre ? (
        <line
          x1={x(barre.from)}
          x2={x(barre.to)}
          y1={y(barre.fret)}
          y2={y(barre.fret)}
          className="barre-line"
        />
      ) : null}
      {shape.frets.map((fret, i) =>
        fret > 0 &&
        !(
          barre &&
          fret === barre.fret &&
          i >= barre.from &&
          i <= barre.to &&
          i !== anchor
        ) ? (
          <g
            key={["E", "A", "D", "G", "B", "e"][i]}
            data-finger={shape.fingers[i]}
          >
            <circle cx={x(i)} cy={y(fret)} r="16" className="finger" />
            {numbers ? (
              <text
                x={x(i)}
                y={y(fret) + 5}
                textAnchor="middle"
                className="finger-number"
              >
                {shape.fingers[i]}
              </text>
            ) : null}
          </g>
        ) : null,
      )}
    </svg>
  );
}
export function ChordTimeline({
  chords,
  index,
}: {
  chords: readonly string[];
  index: number;
}) {
  return (
    <section className="chord-timeline" aria-label="Chord progression">
      <ol>
        {[-2, -1, 0, 1, 2].map((offset) => {
          const chord = chords[index + offset];
          return (
            <li
              key={offset}
              aria-current={offset === 0 ? "step" : undefined}
              className={`timeline-step ${offset === 0 ? "current" : offset < 0 ? "past" : ""} ${chord ? "" : "empty-step"}`}
            >
              {chord ?? ""}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
export function PracticeDock({
  listening,
  busy,
  devicesOpen,
  onToggle,
  onDevices,
  onLibrary,
  onTuner,
  deviceContent,
  tuningMismatch = false,
  tuningTitle = "Guitar tuner",
}: {
  listening: boolean;
  busy: boolean;
  devicesOpen: boolean;
  onToggle: () => void;
  onDevices: () => void;
  onLibrary: () => void;
  onTuner?: () => void;
  deviceContent?: ReactNode;
  tuningMismatch?: boolean;
  tuningTitle?: string;
}) {
  return (
    <ControlDock label="Practice controls" active={listening}>
      <DockGroup className="mic-group">
        <DockButton
          label={listening ? "Mute microphone" : "Unmute microphone"}
          className="mic"
          aria-pressed={listening}
          disabled={busy}
          onClick={onToggle}
        >
          <span className="signal" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          {listening ? <Mic /> : <MicOff />}
        </DockButton>
        <DockButtonMenu
          label="Microphone options"
          icon={devicesOpen ? <ChevronDown /> : <ChevronUp />}
          open={devicesOpen}
          onOpenChange={() => onDevices()}
          className="mic-options-toggle"
        >
          {deviceContent}
        </DockButtonMenu>
      </DockGroup>
      <DockDivider />
      <DockButton label="Open music library" onClick={onLibrary}>
        <Music2 />
      </DockButton>
      {onTuner ? (
        <DockButton
          label={tuningTitle}
          title={tuningTitle}
          className={`tuner-btn ${tuningMismatch ? "tuner-warning" : ""}`}
          onClick={onTuner}
        >
          <Sliders />
        </DockButton>
      ) : null}
    </ControlDock>
  );
}

export { DirectionalGroup } from "./motion.tsx";
export {
  TunerChromaticGauge,
  TunerExperience,
  type TunerExperienceProps,
  type TunerMode,
  TunerModeSwitch,
  TunerNote,
  TunerPresetMenu,
  TunerStringBoard,
} from "./tuner-experience.tsx";

export interface TunerStringInfo {
  stringNumber: number; // 1 to 6
  stringIndex: number; // 0 to 5
  note: string; // e.g. "E2"
  noteName: string; // e.g. "E"
  pitchClass: number;
  octave: number;
  targetHz: number;
  gauge: string;
  isWound: boolean;
}

export interface TunerPresetInfo {
  id: string;
  name: string;
  shortDescription: string;
  strings: readonly TunerStringInfo[];
}

export function TuningWarningBanner({
  recommendedTuningName,
  currentTuningName,
  onTuneNow,
  onDismiss,
}: {
  recommendedTuningName: string;
  currentTuningName: string;
  onTuneNow: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="tuning-warning-banner" role="alert">
      <div className="tuning-warning-content">
        <AlertTriangle className="tuning-warning-icon" aria-hidden="true" />
        <div className="tuning-warning-text">
          <strong>Tuning Mismatch:</strong> This song recommends{" "}
          <span className="tuning-highlight">{recommendedTuningName}</span>{" "}
          tuning (guitar is set to{" "}
          <span className="tuning-highlight">{currentTuningName}</span>).
          Fingerings have been adapted.
        </div>
      </div>
      <div className="tuning-warning-actions">
        <Button className="primary tuning-tune-btn" onClick={onTuneNow}>
          Tune to {recommendedTuningName}
        </Button>
        <IconButton label="Dismiss tuning warning" onClick={onDismiss}>
          <X />
        </IconButton>
      </div>
    </div>
  );
}
