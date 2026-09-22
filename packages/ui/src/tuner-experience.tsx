import {
  Check,
  ChevronDown,
  Mic,
  MicOff,
  Moon,
  Sun,
  Volume2,
  X,
} from "lucide-react";
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SegmentedControl } from "./form-primitives.tsx";
import type { TunerPresetInfo, TunerStringInfo } from "./index.tsx";
import { IconButton } from "./primitives.tsx";

export type TunerMode = "strings" | "chromatic";

export interface TunerExperienceProps {
  presets: readonly TunerPresetInfo[];
  value: string;
  onPresetChange: (presetId: string) => void;
  strings: readonly TunerStringInfo[];
  selectedStringIndex: number;
  onSelectString: (index: number) => void;
  mode: TunerMode;
  onModeChange: (mode: TunerMode) => void;
  detectedHz: number | null;
  detectedNote?: string | null;
  chromaticCents?: number | null;
  cents: number | null;
  direction: "up" | "down" | "in_tune" | "idle";
  emergencyBreakRisk: boolean;
  listening: boolean;
  busy: boolean;
  onToggleListening: () => void;
  onBack: () => void;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
  onPlayReference?: () => void;
  playingReference?: boolean;
  saveStatus?: string;
  error?: string | null;
}

export function TunerModeSwitch({
  mode,
  onChange,
}: {
  mode: TunerMode;
  onChange: (mode: TunerMode) => void;
}) {
  return (
    <SegmentedControl
      className="tuner-mode-switch"
      label="Tuner mode"
      value={mode}
      options={[
        { value: "strings", label: "String by string" },
        { value: "chromatic", label: "Chromatic" },
      ]}
      onChange={(value) => onChange(value as TunerMode)}
    />
  );
}

export function TunerNote({ note }: { note: string }) {
  const match = /^(.+?)(\d+)$/u.exec(note);
  return (
    <span className="tuner-note">
      {match ? (
        <>
          {match[1]}
          <sub>{match[2]}</sub>
        </>
      ) : (
        note
      )}
    </span>
  );
}

export function TunerPresetMenu({
  presets,
  value,
  onChange,
}: {
  presets: readonly TunerPresetInfo[];
  value: string;
  onChange: (presetId: string) => void;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const selected = presets.find((preset) => preset.id === value);
  return (
    <details className="tuner-preset-picker" ref={details}>
      <summary
        className="tuner-preset-trigger"
        aria-label={`Tuning presets${selected ? `, ${selected.name} selected` : ""}`}
      >
        <ChevronDown aria-hidden="true" />
      </summary>
      <fieldset className="tuner-preset-menu">
        <legend className="sr-only">Tuning presets</legend>
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            aria-current={preset.id === value ? "true" : undefined}
            onClick={() => {
              onChange(preset.id);
              if (details.current) details.current.open = false;
            }}
          >
            <span>{preset.name}</span>
            {preset.id === value && <Check aria-hidden="true" />}
          </button>
        ))}
      </fieldset>
    </details>
  );
}

function TunerWire({
  string,
  active,
  pluck,
}: {
  string: TunerStringInfo;
  active: boolean;
  pluck: number;
}) {
  const verticalPath = useRef<SVGPathElement>(null);
  const horizontalPath = useRef<SVGPathElement>(null);
  const gauge = Number.parseFloat(string.gauge.replace(/[^0-9.]/gu, ""));
  const gaugeMils = gauge <= 1 ? gauge * 1000 : gauge;
  const stroke = Math.max(1.2, Math.min(3.5, 1.2 + (gaugeMils - 10) * 0.06));
  useEffect(() => {
    if (
      !active ||
      !pluck ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    let frame = 0;
    const start = performance.now();
    const visualHz = Math.min(
      18,
      Math.max(6.5, 7.5 * Math.sqrt(string.targetHz / 82.4069)),
    );
    const draw = (now: number) => {
      const elapsed = now - start;
      const bend =
        54 *
        Math.exp(-elapsed / 300) *
        Math.cos((2 * Math.PI * visualHz * elapsed) / 1000);
      verticalPath.current?.setAttribute("d", `M50 0 Q${50 + bend} 50 50 100`);
      horizontalPath.current?.setAttribute(
        "d",
        `M0 50 Q50 ${50 + bend} 100 50`,
      );
      if (elapsed < 820) frame = requestAnimationFrame(draw);
      else {
        verticalPath.current?.setAttribute("d", "M50 0 Q50 50 50 100");
        horizontalPath.current?.setAttribute("d", "M0 50 Q50 50 100 50");
      }
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      verticalPath.current?.setAttribute("d", "M50 0 Q50 50 50 100");
      horizontalPath.current?.setAttribute("d", "M0 50 Q50 50 100 50");
    };
  }, [active, pluck, string.targetHz]);
  return (
    <svg
      className="tuner-wire"
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ "--wire-width": `${stroke}px` } as CSSProperties}
    >
      <path
        ref={verticalPath}
        className="tuner-wire-vertical"
        d="M50 0 Q50 50 50 100"
      />
      <path
        ref={horizontalPath}
        className="tuner-wire-horizontal"
        d="M0 50 Q50 50 100 50"
      />
    </svg>
  );
}

export function TunerStringBoard({
  strings,
  selectedStringIndex,
  onSelectString,
  pluck = 0,
  presets,
  value,
  onPresetChange,
}: {
  strings: readonly TunerStringInfo[];
  selectedStringIndex: number;
  onSelectString: (index: number) => void;
  pluck?: number;
  presets: readonly TunerPresetInfo[];
  value: string;
  onPresetChange: (presetId: string) => void;
}) {
  return (
    <div className="tuner-string-board">
      {strings.map((string) => {
        const active = string.stringIndex === selectedStringIndex;
        return (
          <div
            key={string.stringIndex}
            className={`tuner-string-cell${active ? " is-active" : ""}`}
          >
            <TunerWire string={string} active={active} pluck={pluck} />
            <button
              className="tuner-string-note-button"
              type="button"
              aria-label={`Select ${string.note} string`}
              aria-pressed={active}
              onClick={() => onSelectString(string.stringIndex)}
            >
              <TunerNote note={string.note} />
            </button>
          </div>
        );
      })}
      <TunerPresetMenu
        presets={presets}
        value={value}
        onChange={onPresetChange}
      />
    </div>
  );
}

const noteNames = [
  "A",
  "A♯",
  "B",
  "C",
  "C♯",
  "D",
  "D♯",
  "E",
  "F",
  "F♯",
  "G",
  "G♯",
];
const centsToAngle = (cents: number | null) =>
  cents === null ? 0 : Math.max(-28, Math.min(28, cents / 2));

export function TunerChromaticGauge({
  cents,
  note,
}: {
  cents: number | null;
  note: string;
}) {
  const meter = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 500, height: 500 });
  useEffect(() => {
    if (!meter.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
    });
    observer.observe(meter.current);
    return () => observer.disconnect();
  }, []);
  const geometry = useMemo(() => {
    const x = size.width / 2;
    const y = size.height - 88;
    const radius = Math.max(
      48,
      Math.min(y - 54, (size.width / 2 - 27) / Math.sin((32 * Math.PI) / 180)),
    );
    const point = (angle: number, distance: number) => ({
      x: x + Math.sin((angle * Math.PI) / 180) * distance,
      y: y - Math.cos((angle * Math.PI) / 180) * distance,
    });
    return { x, y, radius, point };
  }, [size]);
  const angle = centsToAngle(cents);
  const tip = geometry.point(angle, geometry.radius - 27);
  const currentName = note.replace(/\d+/gu, "").replace("#", "♯");
  return (
    <div className="tuner-chromatic-meter" ref={meter}>
      <svg
        className="tuner-gauge-art"
        aria-hidden="true"
        viewBox={`0 0 ${size.width} ${size.height}`}
        data-gauge-angle={angle}
      >
        {[-30, -20, -10, -3, 3, 10, 20, 30].map((tick) => {
          const start = geometry.point(tick, geometry.radius - 7);
          const end = geometry.point(
            tick,
            geometry.radius + (Math.abs(tick) === 30 ? 17 : 12),
          );
          return (
            <line
              key={tick}
              className="tuner-gauge-tick"
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
            />
          );
        })}
        {([-34, 34] as const).map((tick) => {
          const point = geometry.point(tick, geometry.radius - 1);
          return (
            <text
              key={tick}
              className="tuner-gauge-symbol"
              x={point.x}
              y={point.y}
            >
              {tick < 0 ? "♭" : "♯"}
            </text>
          );
        })}
        <line
          className="tuner-gauge-needle"
          x1={geometry.x}
          y1={geometry.y}
          x2={tip.x}
          y2={tip.y}
        />
        <circle
          className="tuner-gauge-pivot"
          cx={geometry.x}
          cy={geometry.y}
          r="32"
        />
        <circle
          className="tuner-gauge-pivot-center"
          cx={geometry.x}
          cy={geometry.y}
          r="5"
        />
      </svg>
      <div className="tuner-note-rail" aria-hidden="true">
        {noteNames.map((name) => (
          <span
            key={name}
            className={`tuner-note-rail-item${name === currentName ? " is-current" : ""}`}
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TunerExperience(props: TunerExperienceProps) {
  const selected =
    props.strings.find(
      (string) => string.stringIndex === props.selectedStringIndex,
    ) ?? props.strings[0];
  const [pluck, setPluck] = useState(0);
  const previousHz = useRef<number | null>(null);
  useEffect(() => {
    if (
      props.listening &&
      props.detectedHz !== null &&
      previousHz.current === null
    )
      setPluck((value) => value + 1);
    previousHz.current = props.detectedHz;
  }, [props.detectedHz, props.listening]);
  if (!selected) return null;
  const displayNote = props.detectedNote ?? "A2";
  const chromaticCents = props.chromaticCents ?? null;
  return (
    <section
      className="tuner-experience"
      data-mode={props.mode}
      aria-label="Guitar tuner"
    >
      <header className="tuner-experience-topbar">
        <span className="tuner-experience-brand">cadence</span>
        <div className="tuner-experience-top-actions">
          {props.onToggleTheme && (
            <IconButton
              label={`Switch to ${props.theme === "dark" ? "light" : "dark"} theme`}
              className="tuner-icon-button"
              size="lg"
              onClick={props.onToggleTheme}
            >
              {props.theme === "dark" ? (
                <Sun aria-hidden="true" />
              ) : (
                <Moon aria-hidden="true" />
              )}
            </IconButton>
          )}
          <IconButton
            label="Close tuner"
            className="tuner-icon-button"
            size="lg"
            onClick={props.onBack}
          >
            <X aria-hidden="true" />
          </IconButton>
        </div>
      </header>
      <TunerModeSwitch mode={props.mode} onChange={props.onModeChange} />
      <main className="tuner-experience-stage">
        {props.mode === "strings" ? (
          <section
            className="tuner-experience-view tuner-strings-view"
            aria-label="String by string tuner"
          >
            <div className="tuner-experience-intro">
              <div className="tuner-target-note">
                <TunerNote note={selected.note} />
              </div>
              <p className="tuner-instruction">
                {props.detectedHz
                  ? `${props.detectedHz.toFixed(1)} Hz`
                  : "Play the selected string"}
              </p>
              {props.cents !== null && (
                <p className="tuner-cents-live">
                  {props.cents > 0 ? "+" : ""}
                  {Math.round(props.cents)}¢
                </p>
              )}
              {props.onPlayReference && (
                <IconButton
                  className="tuner-reference-button"
                  label={`Play reference pitch ${selected.note}`}
                  aria-pressed={!!props.playingReference}
                  onClick={props.onPlayReference}
                >
                  <Volume2 aria-hidden="true" />
                </IconButton>
              )}
            </div>
            <TunerStringBoard
              strings={props.strings}
              selectedStringIndex={props.selectedStringIndex}
              onSelectString={props.onSelectString}
              pluck={pluck}
              presets={props.presets}
              value={props.value}
              onPresetChange={props.onPresetChange}
            />
          </section>
        ) : (
          <section
            className="tuner-experience-view tuner-chromatic-view"
            aria-label="Chromatic tuner"
          >
            <div className="tuner-chromatic-heading">
              <div className="tuner-target-note">
                <TunerNote note={displayNote} />
              </div>
              <p className="tuner-instruction">
                {props.detectedHz
                  ? `${props.detectedHz.toFixed(1)} Hz`
                  : "Play any string"}
              </p>
              <p className="tuner-cents-live">
                {chromaticCents !== null
                  ? `${chromaticCents > 0 ? "+" : ""}${Math.round(chromaticCents)}¢`
                  : "0¢"}
              </p>
            </div>
            <TunerChromaticGauge cents={chromaticCents} note={displayNote} />
          </section>
        )}
      </main>
      <footer className="tuner-experience-toolbar">
        <button
          type="button"
          className="tuner-mic-button"
          aria-label={props.listening ? "Mute microphone" : "Unmute microphone"}
          aria-pressed={!props.listening}
          disabled={props.busy}
          onClick={props.onToggleListening}
        >
          {props.listening ? (
            <Mic aria-hidden="true" />
          ) : (
            <MicOff aria-hidden="true" />
          )}
        </button>
        <span className="tuner-mic-status" role="status">
          <span className="tuner-status-dot" />
          {props.error ||
            props.saveStatus ||
            (props.listening ? "Listening" : "Microphone off")}
        </span>
      </footer>
      {props.emergencyBreakRisk && (
        <div className="tuner-experience-warning" role="alert">
          Pitch is too high. Loosen the selected string.
        </div>
      )}
    </section>
  );
}
