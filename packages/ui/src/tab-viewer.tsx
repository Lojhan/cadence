import type { TabDocument, TabEvent } from "@cadence/contracts";
import { useEffect, useRef } from "react";

const strokeMarks = { down: "↓", up: "↑", pluck: "P" } as const;
const strokeNames = {
  down: "Downstroke",
  up: "Upstroke",
  pluck: "Pluck",
} as const;
const noteValues = {
  1: ["1", "whole note"],
  2: ["½", "half note"],
  4: ["¼", "quarter note"],
  8: ["⅛", "eighth note"],
  16: ["¹⁄₁₆", "sixteenth note"],
} as const;

function rhythmLabel(rhythm: NonNullable<TabEvent["rhythm"]>): string {
  return `${strokeNames[rhythm.stroke]}${rhythm.value ? `, ${noteValues[rhythm.value][1]}` : ""}`;
}

export function TabViewer({
  tab,
  index,
  strings,
  anchorRevision,
}: {
  tab: TabDocument;
  index: number;
  strings: readonly string[];
  anchorRevision: number;
}) {
  const viewport = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = viewport.current;
    const active = element?.querySelector<HTMLElement>(
      `[data-tab-event="${index}"]`,
    );
    if (!element || !active) return;
    const distance =
      active.getBoundingClientRect().left -
      element.getBoundingClientRect().left;
    element.scrollTo({
      left:
        element.scrollLeft +
        distance -
        Math.max(0, (element.clientWidth - active.clientWidth) / 2),
      behavior: anchorRevision === 0 ? "instant" : "smooth",
    });
  }, [anchorRevision, tab]);

  const events = tab.events;
  const showChords = tab.events.some((event) => event.chord);
  const showRhythm = tab.events.some((event) => event.rhythm);

  return (
    <section
      className="relative mx-auto h-full w-full max-w-6xl overflow-hidden"
      aria-label="Guitar tablature"
    >
      <div
        data-tab-labels=""
        className="pointer-events-none absolute top-1/2 left-0 z-20 flex w-12 -translate-y-1/2 flex-col pl-4 font-[Georgia,serif] text-sm font-medium text-muted-foreground max-[600px]:pl-2 max-[600px]:text-xs"
      >
        {showChords ? <div className="h-8 short-landscape:h-6" /> : null}
        {showRhythm ? <div className="h-7 short-landscape:h-5" /> : null}
        {strings.map((string, stringIndex) => (
          <div
            key={stringIndex}
            className="flex h-9 items-center max-[600px]:h-8 short-landscape:h-6"
          >
            {string}
          </div>
        ))}
      </div>
      <div
        ref={viewport}
        data-tab-scroll=""
        className="flex h-full items-center overflow-x-auto overflow-y-hidden"
        style={{
          maskImage: "linear-gradient(to right, transparent 60px, black 100px)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 60px, black 100px)",
        }}
      >
        <div
          data-tab-row={0}
          className="flex w-max min-w-full items-stretch pr-4 pl-20 max-[600px]:pr-2"
        >
          <div
            className="min-w-0 flex-1"
            style={{ minWidth: `${events.length * 72}px` }}
          >
            {showChords ? (
              <div
                className="grid h-8 items-center text-center font-[Georgia,serif] text-lg text-foreground short-landscape:h-6"
                style={{
                  gridTemplateColumns: `repeat(${events.length}, minmax(0, 1fr))`,
                }}
              >
                {events.map((event, eventIndex) => {
                  if (!event.chord) return null;
                  const next = events.findIndex(
                    (candidate, index) => index > eventIndex && candidate.chord,
                  );
                  return (
                    <span
                      key={eventIndex}
                      data-tab-chord=""
                      style={{
                        gridColumn: `${eventIndex + 1} / span ${(next < 0 ? events.length : next) - eventIndex}`,
                      }}
                    >
                      {event.chord}
                    </span>
                  );
                })}
              </div>
            ) : null}
            {showRhythm ? (
              <div
                className="grid h-7 items-center text-center font-sans text-muted-foreground short-landscape:h-5"
                style={{
                  gridTemplateColumns: `repeat(${events.length}, minmax(0, 1fr))`,
                }}
              >
                {events.map((event, eventIndex) => (
                  <span
                    key={eventIndex}
                    className="flex items-center justify-center gap-0.5"
                    title={event.rhythm ? rhythmLabel(event.rhythm) : undefined}
                  >
                    {event.rhythm ? (
                      <>
                        <span className="text-base leading-none">
                          {strokeMarks[event.rhythm.stroke]}
                        </span>
                        {event.rhythm.value ? (
                          <span className="text-[11px] leading-none">
                            {noteValues[event.rhythm.value][0]}
                          </span>
                        ) : null}
                      </>
                    ) : null}
                  </span>
                ))}
              </div>
            ) : null}
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${events.length}, minmax(0, 1fr))`,
              }}
            >
              {events.map((event, eventIndex) => {
                const eventNumber = eventIndex;
                const active = eventNumber === index;
                return (
                  <div
                    key={eventNumber}
                    data-tab-event={eventNumber}
                    aria-current={active ? "step" : undefined}
                    className="min-w-0"
                  >
                    {strings.map((_, stringIndex) => {
                      const note = event.notes.find(
                        (item) => item.string === stringIndex + 1,
                      );
                      return (
                        <div
                          key={stringIndex}
                          className="flex h-9 min-w-0 items-center justify-center max-[600px]:h-8 short-landscape:h-6"
                        >
                          {note ? (
                            <>
                              <span className="h-px min-w-0 flex-1 bg-border" />
                              <span
                                data-tab-fret=""
                                className={`mx-1.5 rounded-md px-1.5 py-0.5 font-sans text-base font-semibold leading-6 tabular-nums max-[600px]:text-sm short-landscape:py-0 short-landscape:text-sm short-landscape:leading-5 ${active ? "bg-primary/15 text-primary" : "text-foreground"}`}
                              >
                                {note.fret}
                              </span>
                              <span className="h-px min-w-0 flex-1 bg-border" />
                            </>
                          ) : (
                            <span className="h-px w-full bg-border" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
