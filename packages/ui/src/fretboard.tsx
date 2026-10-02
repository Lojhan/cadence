import { Fragment } from "react";
import { cn } from "./lib/cn.ts";

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
  compact = false,
}: {
  shape: DiagramShape;
  symbol: string;
  hand: "left" | "right";
  numbers: boolean;
  compact?: boolean;
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
      className={cn(
        "diagram w-[clamp(200px,27vw,340px)] max-h-[60dvh] shrink overflow-visible max-[600px]:h-[clamp(150px,34dvh,290px)] max-[600px]:max-w-[calc(100vw-110px)] max-[600px]:w-auto [.large-diagram_&]:w-[clamp(220px,31vw,380px)] max-[600px]:[.large-diagram_&]:h-[clamp(170px,38dvh,320px)] max-[600px]:[.large-diagram_&]:max-w-[calc(100vw-90px)] max-[600px]:[.large-diagram_&]:w-auto short-landscape:h-[min(190px,48dvh)] short-landscape:w-auto [&_text]:font-[Arial,sans-serif]",
        compact &&
          "!h-[180px] !w-[150px] !max-h-none !max-w-full max-[600px]:!h-[145px] max-[600px]:!w-[121px]",
      )}
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
