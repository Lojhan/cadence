import { ChevronDown, ChevronUp, Mic, MicOff } from "lucide-react";
import {
  createContext,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useState,
} from "react";
import { cn } from "./lib/cn.ts";
import { Popover } from "./overlays.tsx";
import { IconButton, type IconButtonProps } from "./primitives.tsx";

export function ControlDock({
  label,
  active = false,
  className,
  children,
}: {
  label: string;
  active?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <nav
      className={cn(
        "transport idle-ui absolute bottom-[calc(22px+env(safe-area-inset-bottom))] left-1/2 z-2 flex w-[min(281px,calc(100vw-32px))] -translate-x-1/2 items-center gap-2 rounded-full border border-border/55 bg-[var(--dock)] p-2.5 transition-[opacity,visibility] duration-650 max-[600px]:bottom-[calc(14px+env(safe-area-inset-bottom))] max-[600px]:w-[min(249px,calc(100vw-32px))] max-[600px]:gap-1 max-[600px]:p-2 short-landscape:bottom-[calc(8px+env(safe-area-inset-bottom))] short-landscape:w-[min(273px,calc(100vw-32px))] short-landscape:p-1.5 [.is-idle_&]:pointer-events-none [.is-idle_&]:invisible [.is-idle_&]:opacity-0",
        active && "listening",
        className,
      )}
      aria-label={label}
    >
      {children}
    </nav>
  );
}

export function DockGroup({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("dock-group", className)} {...props}>
      {children}
    </div>
  );
}

export function DockButton({ className, ...props }: IconButtonProps) {
  return (
    <IconButton
      className={cn(
        "dock-button size-14 max-[600px]:size-[50px] short-landscape:h-11 [&_svg]:size-[21px] [&_svg]:stroke-[1.7]",
        className,
      )}
      {...props}
    />
  );
}

export function DockDivider() {
  return (
    <span
      className="dock-divider mx-[3px] h-[30px] w-px bg-border"
      aria-hidden="true"
    />
  );
}

export function DockSwitch({
  label,
  active = false,
  className,
  children,
}: {
  label: string;
  active?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <fieldset
      className={cn(
        "dock-switch m-0 flex min-w-0 flex-none items-center overflow-hidden rounded-full border-0 bg-[var(--muted-bg)] p-0 text-[var(--muted-ink)]",
        active && "listening bg-foreground text-background",
        className,
      )}
      aria-label={label}
    >
      {children}
    </fieldset>
  );
}

export function DockSwitchAction({ className, ...props }: IconButtonProps) {
  return (
    <DockButton
      className={cn(
        "dock-switch-action inline-flex flex-row items-center justify-center text-inherit",
        className,
      )}
      {...props}
    />
  );
}

export function DockSwitchMenu({
  className,
  ...props
}: Parameters<typeof DockButtonMenu>[0]) {
  return (
    <DockButtonMenu
      className={cn("dock-switch-menu text-inherit", className)}
      {...props}
    />
  );
}

export function MicrophoneDockControls({
  listening,
  busy = false,
  onToggle,
  optionsOpen,
  onOptionsOpenChange,
  children,
}: {
  listening: boolean;
  busy?: boolean;
  onToggle: () => void;
  optionsOpen?: boolean;
  onOptionsOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = optionsOpen ?? internalOpen;
  return (
    <DockSwitch label="Microphone" active={listening} className="mic-group">
      <DockSwitchAction
        label={listening ? "Mute microphone" : "Unmute microphone"}
        className="mic !w-[52px] justify-end gap-2 rounded-none"
        aria-pressed={listening}
        disabled={busy}
        onClick={onToggle}
      >
        <span
          className="signal flex h-[18px] items-center gap-0.5"
          aria-hidden="true"
        >
          <i className="h-[calc(3px+var(--signal,0)*8px)] w-0.5 rounded bg-current transition-[height] duration-75" />
          <i className="h-[calc(3px+var(--signal,0)*12px)] w-0.5 rounded bg-current transition-[height] duration-75" />
          <i className="h-[calc(3px+var(--signal,0)*10px)] w-0.5 rounded bg-current transition-[height] duration-75" />
        </span>
        {listening ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
      </DockSwitchAction>
      <DockSwitchMenu
        label="Microphone options"
        icon={
          open ? (
            <ChevronDown aria-hidden="true" />
          ) : (
            <ChevronUp aria-hidden="true" />
          )
        }
        open={open}
        onOpenChange={onOptionsOpenChange ?? setInternalOpen}
        className="mic-options-toggle !w-11 rounded-none [&_svg]:size-4"
      >
        {children}
      </DockSwitchMenu>
    </DockSwitch>
  );
}

const MenuContext = createContext<(() => void) | null>(null);

export function DockButtonMenu({
  label,
  icon,
  children,
  className,
  open,
  onOpenChange,
  align = "center",
}: {
  label: string;
  icon: ReactNode;
  children?: ReactNode;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "center" | "end";
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const shown = open ?? internalOpen;
  const change = onOpenChange ?? setInternalOpen;
  return (
    <Popover
      open={shown}
      onOpenChange={change}
      align={align}
      trigger={
        <DockButton label={label} aria-expanded={shown} className={className}>
          {icon}
        </DockButton>
      }
    >
      <MenuContext.Provider value={() => change(false)}>
        <fieldset
          className="dock-menu m-0 grid min-w-[190px] gap-[3px] border-0 p-0"
          aria-label={label}
        >
          {children}
        </fieldset>
      </MenuContext.Provider>
    </Popover>
  );
}

export function DockMenuItem({
  selected = false,
  onSelect,
  children,
}: {
  selected?: boolean;
  onSelect: () => void;
  children?: ReactNode;
}) {
  const close = useContext(MenuContext);
  return (
    <button
      type="button"
      className="dock-menu-item flex min-h-11 w-full items-center justify-between rounded-[10px] border-0 bg-transparent px-3 py-2.5 text-left text-inherit hover:bg-[var(--muted-bg)] aria-[current=true]:bg-[var(--muted-bg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      aria-current={selected ? "true" : undefined}
      onClick={() => {
        onSelect();
        close?.();
      }}
    >
      {children}
    </button>
  );
}
