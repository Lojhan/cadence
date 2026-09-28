import type { TabDocument } from "@cadence/contracts";
import { useEffect, useRef } from "react";

export function TabViewer({ tab, index }: { tab: TabDocument; index: number }) {
  const container = useRef<HTMLDivElement>(null);
  const current = tab.events[index];
  useEffect(() => {
    const viewport = container.current;
    const staff = viewport?.querySelector<HTMLElement>(
      `[data-tab-staff="${current?.staff ?? 0}"]`,
    );
    if (staff && viewport) {
      viewport.scrollTop = staff.offsetTop - viewport.offsetTop - 24;
      const active = staff.querySelector<HTMLElement>("[data-active-tab]");
      if (active)
        viewport.scrollLeft +=
          active.getBoundingClientRect().left -
          viewport.getBoundingClientRect().left -
          viewport.clientWidth / 2;
    }
  }, [current?.staff, current?.column]);
  return (
    <section
      className="mx-auto flex h-full w-full max-w-5xl flex-col rounded-2xl border border-border bg-background/90 p-5 shadow-sm max-[600px]:p-3"
      aria-label="Guitar tablature"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h1 className="font-[Georgia,serif] text-2xl">Tablature</h1>
        <span className="text-sm text-muted-foreground">
          Note {index + 1} of {tab.events.length}
        </span>
      </div>
      <div ref={container} className="min-h-0 flex-1 overflow-auto">
        {tab.staves.map((staff, staffIndex) => (
          <div
            key={staffIndex}
            data-tab-staff={staffIndex}
            className={`mb-6 w-max min-w-full rounded-xl p-3 ${staffIndex === current?.staff ? "bg-primary/10" : ""}`}
          >
            {staff.heading ? (
              <h2 className="mb-2 text-sm font-semibold">{staff.heading}</h2>
            ) : null}
            <pre className="font-mono text-[clamp(13px,1.8vw,18px)] leading-[1.65]">
              {staff.lines.map((line, string) => {
                const activeColumn =
                  staffIndex === current?.staff ? current.column + 2 : -1;
                const suffix = line.slice(activeColumn);
                const width = /^\d+/.exec(suffix)?.[0].length ?? 1;
                return (
                  <div key={string}>
                    {activeColumn < 0 ? line : line.slice(0, activeColumn)}
                    {activeColumn >= 0 ? (
                      <>
                        <span
                          data-active-tab=""
                          className="rounded bg-primary px-px font-bold text-primary-foreground"
                        >
                          {line.slice(activeColumn, activeColumn + width)}
                        </span>
                        {line.slice(activeColumn + width)}
                      </>
                    ) : null}
                  </div>
                );
              })}
            </pre>
          </div>
        ))}
      </div>
    </section>
  );
}
