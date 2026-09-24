import { Check, Moon, Sliders, Sun, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ControlDock,
  DockButtonMenu,
  DockDivider,
  DockMenuItem,
  MicrophoneDockControls,
} from "./control-dock.tsx";
import type { TunerPresetInfo, TunerStringInfo } from "./index.tsx";
import { IconButton } from "./primitives.tsx";
import { Tabs, TabsContent } from "./tabs.tsx";

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

export function TunerNote({ note }: { note: string }) {
  const match = /^(.+?)(\d+)$/u.exec(note);
  return (
    <span className="tuner-note [&_sub]:relative [&_sub]:bottom-[-0.1em] [&_sub]:text-[0.42em] [&_sub]:leading-none [&_sub]:[vertical-align:baseline]">
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
      className="tuner-preset-trigger !inline-flex !w-0 !min-w-0 !flex-[1_1_auto] items-center justify-center gap-1.5 !px-0.5 !text-sm whitespace-nowrap [&_svg]:!size-[18px] [&_svg]:flex-none"
      icon={
        <>
          <Sliders aria-hidden="true" />
          <span className="tuner-preset-name block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
            {selected?.name ?? "Tuning"}
          </span>
        </>
      }
    >
      <div className="tuner-preset-menu max-h-[min(330px,48dvh)] w-[min(250px,calc(100vw-40px))] overflow-auto [&_button_svg]:size-4">
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
      className="tuner-wire h-full min-h-0 w-full flex-1 overflow-visible min-[700px]:h-[52px] min-[700px]:min-w-0 min-[700px]:flex-[1_1_auto] [&_path]:fill-none [&_path]:stroke-[var(--string)] [&_path]:[vector-effect:non-scaling-stroke] [&_path]:[stroke-linecap:round]"
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <path
        ref={verticalPath}
        className="tuner-wire-vertical min-[700px]:hidden"
        strokeWidth={stroke}
        d="M50 0 Q50 50 50 100"
      />
      <path
        ref={horizontalPath}
        className="tuner-wire-horizontal hidden min-[700px]:block"
        strokeWidth={stroke}
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
    <div className="tuner-string-board relative flex min-h-0 w-full flex-1 flex-row items-stretch justify-around px-[22px] pt-[25px] pb-[5px] min-[700px]:flex-col min-[700px]:justify-center min-[700px]:gap-[clamp(5px,1vh,14px)] min-[700px]:p-0 min-[1000px]:gap-[clamp(10px,2vh,20px)] short-phone:pt-3">
      {strings.map((string) => {
        const active = string.stringIndex === selectedStringIndex;
        return (
          <div
            key={string.stringIndex}
            className={`tuner-string-cell relative flex min-w-0 flex-1 flex-col items-center ${active ? "is-active [&_.tuner-wire_path]:stroke-primary [&_.tuner-wire_path]:[filter:drop-shadow(0_0_5px_var(--primary))]" : ""} min-[700px]:min-h-[52px] min-[700px]:w-full min-[700px]:flex-[0_0_auto] min-[700px]:flex-row min-[700px]:gap-4`}
          >
            <TunerWire string={string} active={active} pluck={pluck} />
            <button
              className="tuner-string-note-button flex min-h-12 min-w-12 flex-none items-center justify-center rounded-full border-0 bg-transparent px-[5px] text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground min-[700px]:order-first min-[700px]:min-h-[52px] min-[700px]:w-[52px] min-[700px]:min-w-[52px] min-[700px]:p-0 [&_.tuner-note]:text-lg [&_.tuner-note]:leading-none [&_.tuner-note]:whitespace-nowrap"
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
    <div
      className="tuner-chromatic-meter relative mt-[25px] grid min-h-0 w-[min(100%,500px)] flex-1 place-items-center min-[700px]:m-0 min-[700px]:h-full short-phone:mt-[9px]"
      ref={meter}
    >
      <svg
        className="tuner-gauge-art absolute inset-0 h-full w-full overflow-visible"
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
              className="tuner-gauge-tick stroke-muted-foreground stroke-2 opacity-65 [stroke-linecap:round]"
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
            />
          );
        })}
        {([-42, 42] as const).map((tick) => {
          const end = geometry.point(tick, geometry.radius + 17);
          return (
            <text
              key={tick}
              className="tuner-gauge-symbol fill-muted-foreground font-[Arial,Helvetica,sans-serif] text-lg [text-anchor:middle]"
              x={end.x + (tick < 0 ? -10 : 10)}
              y={end.y + 16}
              dy="0.35em"
            >
              {tick < 0 ? "♭" : "♯"}
            </text>
          );
        })}
        <line
          className="tuner-gauge-needle stroke-primary stroke-[3px] [stroke-linecap:round] [filter:drop-shadow(0_0_7px_var(--primary))] transition-[x2,y2] duration-240 ease-out"
          x1={geometry.x}
          y1={geometry.y}
          x2={tip.x}
          y2={tip.y}
        />
        <circle
          className="tuner-gauge-pivot fill-background stroke-border stroke-2"
          cx={geometry.x}
          cy={geometry.y}
          r="32"
        />
        <circle
          className="tuner-gauge-pivot-center fill-primary"
          cx={geometry.x}
          cy={geometry.y}
          r="5"
        />
      </svg>
      <div
        className="tuner-note-rail absolute inset-x-0 bottom-0 grid grid-cols-12 items-end text-center text-[clamp(11px,2.5vw,15px)] text-muted-foreground min-[700px]:bottom-[3%]"
        aria-hidden="true"
      >
        {noteNames.map((name) => (
          <span
            key={name}
            className={`tuner-note-rail-item relative pb-3 ${name === currentName ? "is-current text-foreground after:absolute after:right-[42%] after:bottom-0 after:left-[42%] after:h-1 after:rounded-t-[3px] after:bg-primary after:content-['']" : ""}`}
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
      className="tuner-experience relative grid h-dvh w-full grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden bg-[radial-gradient(ellipse_at_50%_38%,var(--glow),var(--paper)_70%)] px-[max(24px,env(safe-area-inset-left))] pt-[max(22px,env(safe-area-inset-top))] pb-[max(18px,env(safe-area-inset-bottom))] text-foreground min-[700px]:p-[26px_32px]"
      data-mode={props.mode}
      aria-label="Guitar tuner"
    >
      <header className="tuner-experience-topbar flex min-h-11 items-center justify-between">
        <span className="tuner-experience-brand font-[Georgia,serif] text-[25px] tracking-[-1px]">
          cadence
        </span>
        <div className="tuner-experience-top-actions flex items-center gap-1">
          {props.onToggleTheme && (
            <IconButton
              label={`Switch to ${props.theme === "dark" ? "light" : "dark"} theme`}
              className="tuner-icon-button size-11 rounded-full border-0 bg-transparent hover:bg-accent [&_svg]:size-[21px] [&_svg]:stroke-[1.7]"
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
            className="tuner-icon-button size-11 rounded-full border-0 bg-transparent hover:bg-accent [&_svg]:size-[21px] [&_svg]:stroke-[1.7]"
            size="lg"
            onClick={props.onBack}
          >
            <X aria-hidden="true" />
          </IconButton>
        </div>
      </header>
      <Tabs
        label="Tuner mode"
        value={props.mode}
        options={[
          { value: "strings", label: "String by string" },
          { value: "chromatic", label: "Chromatic" },
        ]}
        onChange={(value) => props.onModeChange(value as TunerMode)}
        className="contents"
        listClassName="tuner-mode-switch mt-4 justify-self-center [&_[data-slot=tabs-trigger]]:min-w-[124px]"
      >
        <TabsContent value={props.mode} asChild>
          <main className="tuner-experience-stage grid min-h-0 w-full place-items-center">
            {props.mode === "strings" ? (
              <section
                className="tuner-experience-view tuner-strings-view flex h-full min-h-0 w-[min(100%,1140px)] flex-col pt-[clamp(16px,3vh,34px)] min-[700px]:items-center min-[700px]:gap-[clamp(16px,2vh,28px)] min-[700px]:px-[max(12px,3vw)] min-[700px]:pt-0 min-[1000px]:flex-row min-[1000px]:gap-[clamp(35px,6vw,100px)] short-phone:pt-[9px]"
                aria-label="String by string tuner"
              >
                <div className="tuner-experience-intro flex-none text-center min-[700px]:w-full min-[1000px]:w-[clamp(230px,25%,360px)] min-[1000px]:text-left">
                  <div className="tuner-target-note mt-[5px] font-[Georgia,serif] text-[76px] leading-[0.95] tracking-[-0.065em] min-[700px]:text-[clamp(76px,10vw,140px)] short-phone:text-[58px]">
                    <TunerNote note={selected.note} />
                  </div>
                  <p className="tuner-instruction mt-[11px] text-[15px] text-muted-foreground">
                    {props.detectedHz
                      ? `${props.detectedHz.toFixed(1)} Hz`
                      : "Play the selected string"}
                  </p>
                  {props.onAutoDetectStringChange && (
                    <button
                      type="button"
                      className="tuner-auto-button mt-[7px] cursor-pointer rounded-full border border-border bg-secondary px-2.5 py-[3px] text-xs text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-pressed:text-primary"
                      aria-pressed={!!props.autoDetectString}
                      onClick={() =>
                        props.onAutoDetectStringChange?.(
                          !props.autoDetectString,
                        )
                      }
                    >
                      Auto-select string {props.autoDetectString ? "on" : "off"}
                    </button>
                  )}
                  <div className="tuner-readout mt-3 grid grid-rows-[19px_21px] gap-1.5 [&_.tuner-cents-live]:m-0 [&_[data-empty=true]]:invisible">
                    <p
                      className="tuner-cents-live mt-3 text-sm font-semibold text-primary tabular-nums data-[empty=true]:invisible"
                      data-empty={props.cents === null}
                    >
                      {props.cents === null
                        ? "\u00a0"
                        : `${props.cents > 0 ? "+" : ""}${Math.round(props.cents)}¢`}
                    </p>
                    <p
                      className="tuner-direction text-[15px] font-bold text-primary data-[empty=true]:invisible"
                      data-empty={!directionText}
                      role="status"
                    >
                      {directionText || "\u00a0"}
                    </p>
                  </div>
                  {props.onPlayReference && (
                    <IconButton
                      className="tuner-reference-button mt-3 inline-grid size-11 place-items-center rounded-full border-0 bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground [&_svg]:size-5"
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
                className="tuner-experience-view tuner-chromatic-view flex h-full min-h-0 w-[min(100%,1140px)] flex-col items-center pt-[clamp(22px,5vh,60px)] min-[700px]:w-[min(100%,980px)] min-[700px]:flex-row min-[700px]:gap-[60px] min-[700px]:p-0 short-phone:pt-2.5"
                aria-label="Chromatic tuner"
              >
                <div className="tuner-chromatic-heading flex-none text-center min-[700px]:w-[30%] min-[700px]:text-left [&_.tuner-target-note]:mt-2.5 [&_.tuner-instruction]:mt-3">
                  <div className="tuner-target-note mt-[5px] font-[Georgia,serif] text-[76px] leading-[0.95] tracking-[-0.065em] min-[700px]:text-[clamp(76px,10vw,140px)] short-phone:text-[58px]">
                    {displayNote ? (
                      <TunerNote note={displayNote} />
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                  <p className="tuner-instruction mt-[11px] text-[15px] text-muted-foreground">
                    {props.detectedHz
                      ? `${props.detectedHz.toFixed(1)} Hz`
                      : "Play any string"}
                  </p>
                  <p
                    className="tuner-cents-live mt-3 text-sm font-semibold text-primary tabular-nums data-[empty=true]:invisible"
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
        </TabsContent>
      </Tabs>
      <footer className="tuner-experience-toolbar relative flex min-h-20 flex-col items-center justify-center">
        {(props.error ||
          (props.saveStatus &&
            props.saveStatus !== "Saving…" &&
            props.saveStatus !== "Saved")) && (
          <span
            className="tuner-toolbar-error absolute bottom-[calc(100%+8px)] left-1/2 z-3 w-max max-w-[min(420px,90vw)] -translate-x-1/2 rounded-[10px] border border-border bg-secondary px-3 py-2 text-center text-[13px] text-foreground"
            role="alert"
          >
            {props.error || props.saveStatus}
          </span>
        )}
        <ControlDock
          label="Tuner controls"
          active={props.listening}
          className="tuner-control-dock !fixed"
        >
          <MicrophoneDockControls
            listening={props.listening}
            busy={props.busy}
            onToggle={props.onToggleListening}
          >
            {props.onInputDeviceChange && props.onInputBoostChange && (
              <div className="tuner-input-fields grid min-w-[220px] gap-2.5 p-[5px] [&_label]:grid [&_label]:gap-1 [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-border [&_select]:bg-secondary [&_select]:p-[7px] [&_select]:text-inherit">
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
        <div
          className="tuner-experience-warning absolute right-5 bottom-24 left-5 mx-auto max-w-[450px] rounded-xl border border-[#c85549] bg-[#402725] px-3.5 py-2.5 text-center text-[13px] text-[#ffd4cc]"
          role="alert"
        >
          Pitch is too high. Loosen the selected string.
        </div>
      )}
    </section>
  );
}
