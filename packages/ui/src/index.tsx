import { AlertTriangle, Music2, Sliders, X } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import {
  ControlDock,
  DockButton,
  DockDivider,
  MicrophoneDockControls,
} from "./control-dock.tsx";
import { Button, IconButton } from "./primitives.tsx";

export {
  ControlDock,
  DockButton,
  DockButtonMenu,
  DockDivider,
  DockGroup,
  DockMenuItem,
  DockSwitch,
  DockSwitchAction,
  DockSwitchMenu,
  MicrophoneDockControls,
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
export { themeClassName } from "./theme.ts";
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
      className="diagram w-[clamp(200px,27vw,340px)] max-h-[60dvh] shrink overflow-visible max-[600px]:h-[clamp(150px,34dvh,290px)] max-[600px]:max-w-[calc(100vw-110px)] max-[600px]:w-auto [.large-diagram_&]:w-[clamp(220px,31vw,380px)] max-[600px]:[.large-diagram_&]:h-[clamp(170px,38dvh,320px)] max-[600px]:[.large-diagram_&]:max-w-[calc(100vw-90px)] max-[600px]:[.large-diagram_&]:w-auto short-landscape:h-[min(190px,48dvh)] short-landscape:w-auto [&_text]:font-[Arial,sans-serif]"
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
          className={
            fret === 0 && shape.baseFret === 1
              ? "nut stroke-foreground stroke-[6px]"
              : "fret stroke-[var(--fret)] stroke-[1.5px]"
          }
        />
      ))}
      {shape.baseFret > 1 ? (
        <text
          x="12"
          y="96"
          className="fret-number fill-muted-foreground text-[13px]"
        >
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
            className="string stroke-[var(--string)]"
            strokeWidth={2.1 - i * 0.22}
          />
          <text
            x={x(i)}
            y="315"
            textAnchor="middle"
            className="string-label fill-muted-foreground text-[13px]"
          >
            {["E", "A", "D", "G", "B", "e"][i]}
          </text>
          {fret < 0 ? (
            <path
              d={`M${x(i) - 5} 30l10 10m0-10l-10 10`}
              className="string-mark fill-none stroke-muted-foreground stroke-[1.5px]"
            />
          ) : fret === 0 ? (
            <circle
              cx={x(i)}
              cy="35"
              r="6"
              className="string-mark fill-none stroke-muted-foreground stroke-[1.5px]"
            />
          ) : null}
        </Fragment>
      ))}
      {barre ? (
        <line
          x1={x(barre.from)}
          x2={x(barre.to)}
          y1={y(barre.fret)}
          y2={y(barre.fret)}
          className="barre-line stroke-foreground stroke-[8px] [stroke-linecap:round] [.matched_&]:stroke-[var(--success)]"
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
            <circle
              cx={x(i)}
              cy={y(fret)}
              r="16"
              className="finger fill-foreground [.matched_&]:fill-[var(--success)]"
            />
            {numbers ? (
              <text
                x={x(i)}
                y={y(fret) + 5}
                textAnchor="middle"
                className="finger-number fill-[var(--dot-text)] text-sm"
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
    <section
      className="chord-timeline pointer-events-none absolute bottom-[calc(140px+env(safe-area-inset-bottom))] left-1/2 h-[54px] w-[min(430px,calc(100%-40px))] -translate-x-1/2 transition-opacity duration-800 [.is-idle_&]:opacity-70 max-[600px]:bottom-[calc(110px+env(safe-area-inset-bottom))] max-[600px]:h-12 max-[600px]:w-[calc(100%-48px)] short-landscape:bottom-[calc(78px+env(safe-area-inset-bottom))] short-landscape:h-9 short-landscape:w-[330px] [&_ol]:m-0 [&_ol]:grid [&_ol]:h-full [&_ol]:list-none [&_ol]:grid-cols-5 [&_ol]:items-center [&_ol]:p-0"
      aria-label="Chord progression"
    >
      <ol>
        {[-2, -1, 0, 1, 2].map((offset) => {
          const chord = chords[index + offset];
          return (
            <li
              key={offset}
              aria-current={offset === 0 ? "step" : undefined}
              className={`timeline-step relative px-2.5 py-2 text-center font-[Georgia,serif] text-2xl text-muted-foreground max-[600px]:px-2 max-[600px]:text-[21px] short-landscape:px-2 short-landscape:py-1 short-landscape:text-[19px] ${offset === 0 ? "current text-[30px] text-foreground after:absolute after:bottom-0 after:left-[calc(50%-2px)] after:size-1 after:rounded-full after:bg-primary after:content-[''] max-[600px]:text-[27px] short-landscape:text-2xl" : offset < 0 ? "past text-xl max-[600px]:text-lg" : ""} ${chord ? "" : "empty-step invisible"}`}
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
      <MicrophoneDockControls
        listening={listening}
        busy={busy}
        onToggle={onToggle}
        optionsOpen={devicesOpen}
        onOptionsOpenChange={(open) => {
          if (open !== devicesOpen) onDevices();
        }}
      >
        {deviceContent}
      </MicrophoneDockControls>
      <DockDivider />
      <DockButton label="Open music library" onClick={onLibrary}>
        <Music2 />
      </DockButton>
      {onTuner ? (
        <DockButton
          label={tuningTitle}
          title={tuningTitle}
          className={`tuner-btn ${tuningMismatch ? "tuner-warning !border !border-[#fcd34d] !bg-[#fef3c7] !text-[#b45309] hover:!bg-[#fde68a] hover:!text-[#92400e] dark:!border-[#854d0e] dark:!bg-[#422006] dark:!text-[#facc15] dark:hover:!bg-[#713f12] dark:hover:!text-[#fef08a]" : ""}`}
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
    <div
      className="tuning-warning-banner relative z-3 mx-auto mt-[92px] flex w-[calc(100%-48px)] max-w-[800px] items-center justify-between gap-4 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-5 py-3 text-[0.9rem] text-[#92400e] shadow-[0_4px_16px_#0000000f] dark:border-[#634617] dark:bg-[#362916] dark:text-[#fde047] max-[600px]:mx-3 max-[600px]:mt-20 max-[600px]:mb-3 max-[600px]:w-[calc(100%-24px)] max-[600px]:flex-col max-[600px]:items-start max-[600px]:gap-3 max-[600px]:px-4"
      role="alert"
    >
      <div className="tuning-warning-content flex items-center gap-[0.65rem]">
        <AlertTriangle
          className="tuning-warning-icon size-5 shrink-0"
          aria-hidden="true"
        />
        <div className="tuning-warning-text leading-[1.35]">
          <strong>Tuning Mismatch:</strong> This song recommends{" "}
          <span className="tuning-highlight font-bold underline">
            {recommendedTuningName}
          </span>{" "}
          tuning (guitar is set to{" "}
          <span className="tuning-highlight font-bold underline">
            {currentTuningName}
          </span>
          ). Fingerings have been adapted.
        </div>
      </div>
      <div className="tuning-warning-actions flex shrink-0 items-center gap-2 max-[600px]:w-full max-[600px]:justify-between">
        <Button
          className="primary tuning-tune-btn !border-foreground !bg-foreground !px-[0.85rem] !py-[0.35rem] !text-[0.85rem] !text-[var(--white)]"
          onClick={onTuneNow}
        >
          Tune to {recommendedTuningName}
        </Button>
        <IconButton label="Dismiss tuning warning" onClick={onDismiss}>
          <X />
        </IconButton>
      </div>
    </div>
  );
}
