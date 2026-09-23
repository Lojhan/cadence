import { X } from "lucide-react";
import {
  Dialog as DialogPrimitive,
  Popover as PopoverPrimitive,
} from "radix-ui";
import { type HTMLAttributes, type ReactNode, useRef } from "react";
import { cn } from "./lib/cn.ts";
import { IconButton } from "./primitives.tsx";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}

export function DialogHeader({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <header
      data-slot="dialog-header"
      className={cn(
        "panel-head flex shrink-0 items-center justify-between gap-4 px-7 pt-6 pb-5 max-[480px]:px-5 max-[480px]:pt-5 max-[480px]:pb-4 [&_h2]:font-[Georgia,serif] [&_h2]:text-[25px] [&_h2]:leading-[1.2] max-[480px]:[&_h2]:text-[23px] [&_.icon-button]:border [&_.icon-button]:border-border",
        className,
      )}
      {...props}
    >
      {children}
    </header>
  );
}

export function DialogBody({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        "panel-body min-h-0 overflow-y-auto overscroll-contain px-7 pb-7 [scrollbar-width:thin] max-[480px]:px-5 max-[480px]:pb-6 [&_h2]:mb-5 [&_h2]:font-[Georgia,serif] [&_h2]:text-[30px] [&_h2]:leading-[1.15] [&_h2]:tracking-[-0.7px] max-[480px]:[&_h2]:text-[28px] [&_p]:mb-5 [&_p]:text-sm [&_p]:leading-[1.65] [&_p]:text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function Modal({
  open,
  onOpenChange,
  title,
  children,
  side,
}: DialogProps & { side?: "left" | "right" }) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="modal-overlay fixed inset-0 z-10 bg-[#273e3540] backdrop-blur-[9px]"
          data-slot="dialog-overlay"
        />
        <DialogPrimitive.Content
          data-slot={side ? "sheet" : "dialog"}
          data-side={side}
          className={cn(
            "modal-panel fixed top-1/2 left-1/2 z-11 flex max-h-[calc(100dvh-48px)] w-[min(600px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] border border-border bg-[var(--white)] text-foreground shadow-[0_24px_90px_#0002] max-[480px]:max-h-[calc(100dvh-32px)] max-[480px]:w-[calc(100vw-24px)] max-[480px]:rounded-3xl",
            side &&
              "cadence-sheet !top-0 !right-0 !bottom-0 !left-auto !h-dvh !max-h-dvh !w-[min(460px,100vw)] !translate-0 !rounded-[24px_0_0_24px] data-[side=left]:!right-auto data-[side=left]:!left-0 data-[side=left]:!rounded-[0_24px_24px_0]",
          )}
          aria-describedby={undefined}
          onOpenAutoFocus={() => {
            opener.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
          }}
          onCloseAutoFocus={(event) => {
            if (opener.current?.isConnected) {
              event.preventDefault();
              opener.current.focus({ preventScroll: true });
            }
          }}
        >
          <DialogHeader>
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <IconButton label="Close">
                <X aria-hidden="true" />
              </IconButton>
            </DialogPrimitive.Close>
          </DialogHeader>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Dialog(props: DialogProps) {
  return <Modal {...props} />;
}

export function Sheet(props: DialogProps & { side?: "left" | "right" }) {
  return <Modal {...props} side={props.side ?? "right"} />;
}

export interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
}

export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  align = "center",
  side = "top",
}: PopoverProps) {
  return (
    <PopoverPrimitive.Root
      {...(open === undefined ? {} : { open })}
      {...(onOpenChange ? { onOpenChange } : {})}
    >
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          data-slot="popover"
          className="cadence-popover z-12 max-h-[min(50dvh,420px)] w-[min(340px,calc(100vw-32px))] overflow-auto rounded-[20px] border border-border bg-[var(--white)] p-5 text-foreground shadow-[0_18px_45px_#0002] [&_.cadence-select-control]:w-full [&_label]:mb-3 [&_label]:block [&_label]:text-[13px]"
          align={align}
          side={side}
          sideOffset={10}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
