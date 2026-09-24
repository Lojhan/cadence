import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "./lib/cn.ts";

export function ScrollArea({
  children,
  className,
  viewportClassName,
  scrollKey,
}: {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  scrollKey?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ top: 0, height: 0, overflow: false });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      const trackHeight = Math.max(0, viewport.clientHeight - 16);
      const scrollRange = viewport.scrollHeight - viewport.clientHeight;
      const height = Math.min(
        trackHeight,
        Math.max(
          28,
          (trackHeight * viewport.clientHeight) /
            Math.max(1, viewport.scrollHeight),
        ),
      );
      setThumb({
        top:
          8 +
          (scrollRange > 0
            ? (viewport.scrollTop / scrollRange) * (trackHeight - height)
            : 0),
        height,
        overflow: scrollRange > 1,
      });
    };
    const reveal = () => {
      update();
      setVisible(true);
      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(() => setVisible(false), 900);
    };
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    if (viewport.firstElementChild)
      observer.observe(viewport.firstElementChild);
    viewport.addEventListener("scroll", reveal, { passive: true });
    update();
    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", reveal);
      clearTimeout(fadeTimer);
    };
  }, []);

  useEffect(() => {
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
  }, [scrollKey]);

  return (
    <div
      className={cn("relative min-h-0 flex-1", className)}
      data-slot="scroll-area"
    >
      <div
        ref={viewportRef}
        className={cn(
          "absolute inset-0 min-h-0 w-full overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          viewportClassName,
        )}
        data-slot="scroll-area-viewport"
      >
        {children}
      </div>
      {thumb.overflow && (
        <div
          aria-hidden="true"
          data-slot="scroll-area-thumb"
          data-visible={visible}
          className="pointer-events-none absolute right-1 z-1 w-1 rounded-full bg-foreground/30 opacity-0 transition-opacity duration-500 data-[visible=true]:opacity-100"
          style={{ top: thumb.top, height: thumb.height }}
        />
      )}
    </div>
  );
}
