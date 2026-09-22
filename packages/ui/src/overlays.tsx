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
      className={cn("panel-head", className)}
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
      className={cn("panel-body", className)}
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
          className="modal-overlay"
          data-slot="dialog-overlay"
        />
        <DialogPrimitive.Content
          data-slot={side ? "sheet" : "dialog"}
          data-side={side}
          className={cn("modal-panel", side && "cadence-sheet")}
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
          className="cadence-popover"
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
