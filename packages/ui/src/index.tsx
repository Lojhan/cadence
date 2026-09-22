import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  Music2,
  Sliders,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  type ButtonHTMLAttributes,
  Fragment,
  type ReactNode,
  type SelectHTMLAttributes,
  useRef,
} from "react";
export function IconButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`icon-button ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
export function Button({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`pill ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Select({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <span className="select-control">
      <select aria-label={label} {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" />
    </span>
  );
}
export function Dialog({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="modal-overlay" />
        <DialogPrimitive.Content
          className="modal-panel"
          aria-describedby={undefined}
          onOpenAutoFocus={() => {
            opener.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
          }}
          onCloseAutoFocus={(event) => {
            // Openers live in the app toolbar rather than a Radix Trigger.
            if (opener.current?.isConnected) {
              event.preventDefault();
              opener.current.focus({ preventScroll: true });
            }
          }}
        >
          <header className="panel-head">
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <IconButton label="Close">
                <X />
              </IconButton>
            </DialogPrimitive.Close>
          </header>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
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
  tuningMismatch?: boolean;
  tuningTitle?: string;
}) {
  return (
    <nav
      className={`transport idle-ui ${listening ? "listening" : ""}`}
      aria-label="Practice controls"
    >
      <div className="mic-group">
        <IconButton
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
        </IconButton>
        <IconButton
          label="Microphone options"
          aria-expanded={devicesOpen}
          className="mic-options-toggle"
          onClick={onDevices}
        >
          {devicesOpen ? <ChevronDown /> : <ChevronUp />}
        </IconButton>
      </div>
      <span className="dock-divider" />
      <IconButton label="Open music library" onClick={onLibrary}>
        <Music2 />
      </IconButton>
      {onTuner ? (
        <IconButton
          label={tuningTitle}
          title={tuningTitle}
          className={`tuner-btn ${tuningMismatch ? "tuner-warning" : ""}`}
          onClick={onTuner}
        >
          <Sliders />
        </IconButton>
      ) : null}
    </nav>
  );
}

export { DirectionalGroup } from "./motion.tsx";

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

export function TuningSelect({
  presets,
  value,
  onChange,
  disabled,
}: {
  presets: readonly TunerPresetInfo[];
  value: string;
  onChange: (presetId: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      label="Tuning preset"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="tuning-select"
    >
      {presets.map((preset) => (
        <option key={preset.id} value={preset.id}>
          {preset.name} ({preset.strings.map((s) => s.noteName).join(" ")})
        </option>
      ))}
    </Select>
  );
}

export function TunerGauge({
  string,
  detectedHz,
  cents,
  direction,
  emergencyBreakRisk,
  onPlayReference,
  playingReference,
}: {
  string: TunerStringInfo;
  detectedHz: number | null;
  cents: number | null;
  direction: "up" | "down" | "in_tune" | "idle";
  emergencyBreakRisk: boolean;
  onPlayReference?: () => void;
  playingReference?: boolean;
}) {
  const clampedCents = cents !== null ? Math.max(-50, Math.min(50, cents)) : 0;
  const needlePercent = ((clampedCents + 50) / 100) * 100;

  return (
    <div className="tuner-gauge-card">
      {emergencyBreakRisk && (
        <div className="tuner-emergency-alert" role="alert">
          <AlertTriangle aria-hidden="true" />
          <span>
            <strong>⚠️ Pitch is too high!</strong> Loosen string immediately to
            prevent snapping.
          </span>
        </div>
      )}

      <div className="tuner-gauge-header">
        <div className="tuner-string-meta">
          <span className="tuner-string-number">
            String {string.stringNumber}
          </span>
          <span className="tuner-string-gauge">
            Gauge {string.gauge} {string.isWound ? "(wound)" : "(plain)"}
          </span>
        </div>

        {onPlayReference && (
          <Button
            className="tuner-reference-btn"
            onClick={onPlayReference}
            title={`Play reference pitch ${string.note}`}
            aria-label={`Play reference pitch ${string.note}`}
          >
            {playingReference ? <VolumeX /> : <Volume2 />}
            <span>Reference {string.note}</span>
          </Button>
        )}
      </div>

      <div className="tuner-note-display">
        <div className="tuner-note-primary">
          <span className="tuner-note-letter">{string.noteName}</span>
          <span className="tuner-note-octave">{string.octave}</span>
        </div>
        <div className="tuner-freq-targets">
          <span className="tuner-target-hz">
            Target: {string.targetHz.toFixed(2)} Hz
          </span>
          <span className="tuner-detected-hz">
            Detected:{" "}
            {detectedHz !== null && detectedHz > 0
              ? `${detectedHz.toFixed(1)} Hz`
              : "—"}
          </span>
        </div>
      </div>

      <div className="tuner-meter-container">
        <div className="tuner-meter-labels">
          <span>-50¢</span>
          <span>-25¢</span>
          <span className="tuner-meter-center">0¢</span>
          <span>+25¢</span>
          <span>+50¢</span>
        </div>
        <div className="tuner-meter-track">
          <div className="tuner-meter-sweetspot" />
          <div className="tuner-meter-centerline" />
          {cents !== null && (
            <div
              className={`tuner-meter-needle ${direction === "in_tune" ? "in-tune" : ""}`}
              style={{ left: `${needlePercent}%` }}
            />
          )}
        </div>
        <div className="tuner-cents-text">
          {cents !== null
            ? `${cents > 0 ? "+" : ""}${Math.round(cents)} cents`
            : "Play string"}
        </div>
      </div>

      <div className="tuner-direction-badge-wrap">
        {direction === "in_tune" ? (
          <div className="tuner-badge in-tune">
            <Check />
            <span>In Tune</span>
          </div>
        ) : direction === "up" ? (
          <div className="tuner-badge tune-up">
            <span>▲ Tune Up</span>
          </div>
        ) : direction === "down" ? (
          <div className="tuner-badge tune-down">
            <span>▼ Tune Down</span>
          </div>
        ) : (
          <div className="tuner-badge idle">
            <span>
              Pluck string {string.stringNumber} ({string.note})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function TunerFretboard({
  strings,
  selectedStringIndex,
  onSelectString,
  hand = "right",
}: {
  strings: readonly TunerStringInfo[];
  selectedStringIndex: number;
  onSelectString: (index: number) => void;
  hand?: "left" | "right";
}) {
  const displayedStrings =
    hand === "left" ? [...strings].reverse() : [...strings];

  return (
    <section className="tuner-fretboard-wrap" aria-label="Guitar strings">
      <div className="tuner-headstock-nut" />
      <div className="tuner-strings-list">
        {displayedStrings.map((s) => {
          const isSelected = s.stringIndex === selectedStringIndex;
          const thickness = Math.max(
            1.5,
            Math.min(5, (s.stringNumber / 6) * 4.5),
          );
          return (
            <button
              key={s.stringIndex}
              type="button"
              aria-pressed={isSelected}
              className={`tuner-string-row ${isSelected ? "selected" : ""}`}
              onClick={() => onSelectString(s.stringIndex)}
            >
              <div className="tuner-string-indicator">
                <span className="tuner-string-note">{s.note}</span>
                <span className="tuner-string-num">
                  String {s.stringNumber}
                </span>
              </div>
              <div className="tuner-string-wire-track">
                <div
                  className={`tuner-string-wire ${s.isWound ? "wound" : "plain"} ${isSelected ? "vibrating" : ""}`}
                  style={{ height: `${thickness}px` }}
                />
              </div>
              <div className="tuner-string-hz">{s.targetHz.toFixed(1)} Hz</div>
            </button>
          );
        })}
      </div>
    </section>
  );
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
