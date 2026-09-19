import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronDown, ChevronUp, Mic, MicOff, Music2, X } from "lucide-react";
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
}: {
  listening: boolean;
  busy: boolean;
  devicesOpen: boolean;
  onToggle: () => void;
  onDevices: () => void;
  onLibrary: () => void;
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
    </nav>
  );
}

export { DirectionalGroup } from "./motion.tsx";
