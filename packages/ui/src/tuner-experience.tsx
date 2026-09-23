import { Check, Moon, Sliders, Sun, Volume2, X } from "lucide-react";
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ControlDock,
  DockButtonMenu,
  DockDivider,
  DockMenuItem,
  MicrophoneDockControls,
} from "./control-dock.tsx";
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
  autoDetectString?: boolean;
  onAutoDetectStringChange?: (enabled: boolean) => void;
  inputDevice?: string;
  inputDevices?: readonly { deviceId: string; label: string }[];
  onInputDeviceChange?: (deviceId: string) => void;
  inputBoost?: number;
  onInputBoostChange?: (boostDb: number) => void;
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
  const selected = presets.find((preset) => preset.id === value);
  return (
    <DockButtonMenu
      label={`Tuning presets${selected ? `, ${selected.name} selected` : ""}`}
      className="tuner-preset-trigger"
      icon={
        <>
          <Sliders aria-hidden="true" />
          <span className="tuner-preset-name">
            {selected?.name ?? "Tuning"}
          </span>
        </>
      }
    >
      <div className="tuner-preset-menu">
        {presets.map((preset) => (
          <DockMenuItem
            key={preset.id}
            selected={preset.id === value}
            onSelect={() => onChange(preset.id)}
          >
            <span>{preset.name}</span>
            {preset.id === value && <Check aria-hidden="true" />}
          </DockMenuItem>
        ))}
      </div>
    </DockButtonMenu>
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
}: {
  strings: readonly TunerStringInfo[];
  selectedStringIndex: number;
  onSelectString: (index: number) => void;
  pluck?: number;
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
  cents === null ? 0 : Math.max(-40, Math.min(40, cents * 0.8));

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
      Math.min(y - 54, (size.width / 2 - 20) / Math.sin((44 * Math.PI) / 180)),
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
        {[-42, -30, -18, -6, 6, 18, 30, 42].map((tick) => {
          const start = geometry.point(tick, geometry.radius - 7);
          const end = geometry.point(
            tick,
            geometry.radius + (Math.abs(tick) === 42 ? 17 : 12),
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
        {([-44, 44] as const).map((tick) => {
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
  const displayNote = props.detectedNote;
  const chromaticCents = props.chromaticCents ?? null;
  const directionText =
    props.detectedHz === null
      ? null
      : props.direction === "up"
        ? "Tighten the string"
        : props.direction === "down"
          ? "Loosen the string"
          : props.direction === "in_tune"
            ? "In tune"
            : null;
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
              {props.onAutoDetectStringChange && (
                <button
                  type="button"
                  className="tuner-auto-button"
                  aria-pressed={!!props.autoDetectString}
                  onClick={() =>
                    props.onAutoDetectStringChange?.(!props.autoDetectString)
                  }
                >
                  Auto-select string {props.autoDetectString ? "on" : "off"}
                </button>
              )}
              <div className="tuner-readout">
                <p
                  className="tuner-cents-live"
                  data-empty={props.cents === null}
                >
                  {props.cents === null
                    ? "\u00a0"
                    : `${props.cents > 0 ? "+" : ""}${Math.round(props.cents)}¢`}
                </p>
                <p
                  className="tuner-direction"
                  data-empty={!directionText}
                  role="status"
                >
                  {directionText || "\u00a0"}
                </p>
              </div>
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
            />
          </section>
        ) : (
          <section
            className="tuner-experience-view tuner-chromatic-view"
            aria-label="Chromatic tuner"
          >
            <div className="tuner-chromatic-heading">
              <div className="tuner-target-note">
                {displayNote ? (
                  <TunerNote note={displayNote} />
                ) : (
                  <span>—</span>
                )}
              </div>
              <p className="tuner-instruction">
                {props.detectedHz
                  ? `${props.detectedHz.toFixed(1)} Hz`
                  : "Play any string"}
              </p>
              <p
                className="tuner-cents-live"
                data-empty={chromaticCents === null}
              >
                {chromaticCents === null
                  ? "\u00a0"
                  : `${chromaticCents > 0 ? "+" : ""}${Math.round(chromaticCents)}¢`}
              </p>
            </div>
            <TunerChromaticGauge
              cents={chromaticCents}
              note={displayNote ?? ""}
            />
          </section>
        )}
      </main>
      <footer className="tuner-experience-toolbar">
        {(props.error ||
          (props.saveStatus &&
            props.saveStatus !== "Saving…" &&
            props.saveStatus !== "Saved")) && (
          <span className="tuner-toolbar-error" role="alert">
            {props.error || props.saveStatus}
          </span>
        )}
        <ControlDock
          label="Tuner controls"
          active={props.listening}
          className="tuner-control-dock"
        >
          <MicrophoneDockControls
            listening={props.listening}
            busy={props.busy}
            onToggle={props.onToggleListening}
          >
            {props.onInputDeviceChange && props.onInputBoostChange && (
              <div className="tuner-input-fields">
                <label>
                  Microphone input
                  <select
                    value={props.inputDevice ?? ""}
                    onChange={(event) =>
                      props.onInputDeviceChange?.(event.target.value)
                    }
                  >
                    <option value="">System default</option>
                    {props.inputDevice &&
                      !props.inputDevices?.some(
                        (device) => device.deviceId === props.inputDevice,
                      ) && (
                        <option value={props.inputDevice} disabled>
                          Saved microphone unavailable
                        </option>
                      )}
                    {props.inputDevices?.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || "Microphone"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Input boost
                  <select
                    value={props.inputBoost ?? 0}
                    onChange={(event) =>
                      props.onInputBoostChange?.(Number(event.target.value))
                    }
                  >
                    {[0, 6, 12, 18, 24, 30].map((value) => (
                      <option key={value} value={value}>
                        {value === 0 ? "Off" : `+${value} dB`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </MicrophoneDockControls>
          <DockDivider />
          <TunerPresetMenu
            presets={props.presets}
            value={props.value}
            onChange={props.onPresetChange}
          />
        </ControlDock>
      </footer>
      {props.emergencyBreakRisk && (
        <div className="tuner-experience-warning" role="alert">
          Pitch is too high. Loosen the selected string.
        </div>
      )}
    </section>
  );
}
